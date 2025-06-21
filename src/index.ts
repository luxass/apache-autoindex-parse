import type { HTMLElement } from "node-html-parser";
import { parse as __parse } from "node-html-parser";

export interface FileEntry {
  type: "file";
  name: string;
  path: string;
  lastModified?: number;
}

export interface DirectoryEntry {
  type: "directory";
  name: string;
  path: string;
  lastModified?: number;
  children: Entry[];
}

export type Entry = FileEntry | DirectoryEntry;

export interface RootEntry {
  type: "directory";
  path: string;
  children: Entry[];
}

export type AutoIndexFormat = "F0" | "F1" | "F2";

/**
 * Parses HTML content of an auto-indexed directory listing into a structured format.
 *
 * @param {string} html - The HTML content of the auto-indexed directory page to parse
 * @param {AutoIndexFormat?} format - Optional format specification of the auto-index page (will be inferred if not provided)
 * @returns {RootEntry | undefined} A RootEntry object representing the parsed directory structure, or null if parsing fails
 *
 * @example
 * ```ts
 * const html = await fetch('http://example.com/files/').then(res => res.text());
 * const root = parse(html);
 * console.log(root.path); // '/files/'
 * console.log(root.children); // Array of file and directory entries
 * ```
 */
export function parse(html: string, format?: AutoIndexFormat): RootEntry | null {
  const root = __parse(html);

  if (!root) {
    return null;
  }

  // extract title and root path
  const titleText = root.querySelector("title")?.text || "";
  const rootPath = titleText.split("Index of ")[1] ?? "/";

  let entries: Entry[] = [];

  if (!format) {
    format = inferFormat(root);
  }

  if (format === "F0") {
    entries = parseF0(root);
  }

  if (format === "F1") {
    entries = parseF1(root);
  }

  if (format === "F2") {
    entries = parseF2(root);
  }

  return {
    type: "directory",
    path: rootPath,
    children: entries,
  };
}

/**
 * Infers the AutoIndexFormat from HTML content.
 *
 * This function examines the links on the page to determine the format
 * of an Apache AutoIndex page. It looks for URL parameters that indicate
 * the format (e.g., "F=2" in "?C=N;O=D;F=2").
 *
 * @param {string | HTMLElement} html - The HTML content to analyze
 * @returns {AutoIndexFormat} The inferred format as an AutoIndexFormat string (e.g., "F0", "F1", "F2", etc.)
 */
export function inferFormat(html: string | HTMLElement): AutoIndexFormat {
  if (typeof html === "string") {
    // If html is a string, parse it to an HTMLElement
    html = __parse(html);
  }

  const hrefs = [];

  const pre = html.querySelector("pre");

  const hasPre = pre !== null;
  const hasTable = html.querySelector("table") !== null;

  // F1 is the only format that uses <pre> tags for wrapping the links
  // which breaks the parsing logic of 'node-html-parser'
  // so we need to handle it separately
  if (pre) {
    // If we have a <pre> tag, we assume it's F1 format
    // but lets check to be sure.

    const preContent = pre.textContent || "";
    const parsedPre = __parse(preContent);
    const links = parsedPre.querySelectorAll("a");

    for (const link of links) {
      const href = link.getAttribute("href");
      if (href && href.startsWith("?")) {
        hrefs.push(href);
      }
    }
  } else {
    const links = html.querySelectorAll("a");
    for (const link of links) {
      const href = link.getAttribute("href");
      if (href && href.startsWith("?")) {
        hrefs.push(href);
      }
    }
  }

  // look for format parameter
  for (const href of hrefs) {
    const formatMatch = href.match(/F=(\d)/);
    if (formatMatch && formatMatch[1]) {
      return `F${formatMatch[1]}` as AutoIndexFormat;
    }

    if (hasPre) {
      return "F1";
    }

    if (hasTable) {
      return "F2";
    }
  }

  return "F0";
}

function parseF0(html: HTMLElement): Entry[] {
  const entries: Entry[] = [];

  const ul = html.querySelector("ul");

  if (!ul) return entries;

  const liElements = ul.querySelectorAll("li");

  for (const li of liElements) {
    const a = li.querySelector("a");
    if (!a) continue;

    const href = a.getAttribute("href") || "";
    const name = a.textContent.trim() || "";

    const isDirectory = href.endsWith("/");

    if (name === "Parent Directory") {
      continue;
    }

    const path = href;

    if (isDirectory) {
      entries.push({
        type: "directory",
        name: name.slice(0, -1),
        path,
        lastModified: undefined,
        children: [],
      });
    } else {
      entries.push({
        type: "file",
        name,
        path,
        lastModified: undefined,
      });
    }
  }

  return entries;
}

function parseF1(html: HTMLElement): Entry[] {
  const entries: Entry[] = [];

  const preElement = html.querySelector("pre");
  if (!preElement) return entries;
  const root = __parse(preElement.textContent);

  // Find all the links in the pre content
  const links = root.querySelectorAll("a");

  for (const link of links) {
    const href = link.getAttribute("href") || "";
    const name = link.textContent.trim();

    // Skip parent directory and sort links
    if (name === "Parent Directory" || href.startsWith("?")) {
      continue;
    }

    // Determine if it's a directory or file
    const isDirectory = href.endsWith("/");
    const type = isDirectory ? "directory" : "file";

    // Get the parent element to extract additional info
    const parentText = link.parentNode?.textContent || "";

    // Extract date and time using regex
    let lastModified;
    const dateMatch = parentText.match(/(\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2}|\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
    if (dateMatch && dateMatch[0]) {
      const dateString = dateMatch[0];
      const date = new Date(dateString);
      if (!Number.isNaN(date.getTime())) {
        lastModified = date.getTime();
      }
    }

    // Clean up directory name if it ends with /
    const cleanName = isDirectory && name.endsWith("/") ? name.slice(0, -1) : name;

    if (type === "directory") {
      entries.push({
        type,
        name: cleanName,
        path: href,
        lastModified,
        children: [],
      });
    } else {
      entries.push({
        type,
        name: cleanName,
        path: href,
        lastModified,
      });
    }
  }

  return entries;
}

function parseF2(html: HTMLElement): Entry[] {
  const entries: Entry[] = [];

  const table = html.querySelector("table");
  if (!table) return entries;

  const rowElements = table.querySelectorAll("tr");

  for (const row of rowElements) {
    const rowContent = row.innerHTML;

    // skip header rows and divider rows
    if (rowContent.includes("<th") || rowContent.includes("<hr")) {
      continue;
    }

    // extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cellMatches = Array.from(rowContent.matchAll(cellRegex));
    const cells = cellMatches.map((match) => match[1] || "");

    if (cells.length < 3) continue;

    // get image alt from first cell
    const imgAltMatch = cells[0]?.match(/<img[^>]+alt=["'](\[[^\]]+\])["'][^>]*>/i);
    if (!imgAltMatch || !imgAltMatch[1]) continue;

    const imgAlt = imgAltMatch[1];

    // skip if not a directory or file
    if (imgAlt !== "[DIR]" && imgAlt !== "[TXT]") {
      // skip parent directory
      if (imgAlt === "[PARENTDIR]") continue;

      // skip rows without recognizable type
      if (!imgAlt.startsWith("[")) continue;
    }

    // get link and name from second cell
    const linkMatch = cells[1]?.match(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/i);
    if (!linkMatch || !linkMatch[1]) continue;

    const href = linkMatch[1] || "";
    const name = (linkMatch[2] || "").trim();

    // skip parent directory
    if (name === "Parent Directory") continue;

    // get date from the third cell
    const dateText = cells[2]?.replace(/<[^>]+>/g, "").trim();

    // parse the date
    let lastModified;
    if (dateText && dateText !== "&nbsp;") {
      const date = new Date(dateText);
      if (!Number.isNaN(date.getTime())) {
        lastModified = date.getTime();
      }
    }

    // determine type
    const type = imgAlt === "[DIR]" || href.endsWith("/") ? "directory" : "file";

    // use just the href as path
    const path = href;

    if (type === "directory") {
      entries.push({
        type,
        name,
        path,
        lastModified,
        children: [],
      });
    } else {
      entries.push({
        type,
        name,
        path,
        lastModified,
      });
    }
  }

  return entries;
}
