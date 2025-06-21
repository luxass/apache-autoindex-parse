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

  if (root == null) {
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

  const preElements = html.querySelectorAll("pre");
  if (!preElements) return entries;

  for (const pre of preElements) {
    const preContent = pre.textContent || "";

    // split content by lines to process each entry
    const lines = preContent.split("\n");

    for (const line of lines) {
      // skip header lines, hr tags, and empty lines
      if (line.includes("<hr>") || line.trim() === "") {
        continue;
      }

      // skip lines that are only header links (contain sorting links but no file links)
      if (line.includes("Last modified") && line.includes("?C=") && !line.match(/<a[^>]+href=["'](?!\?)[^"']+["'][^>]*>/)) {
        continue;
      }

      // check if this line contains links (but not sorting links)
      const linkMatches = line.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi);

      for (const linkMatch of linkMatches) {
        const href = linkMatch[1] || "";
        const linkText = (linkMatch[2] || "").trim();

        // skip sorting links (those that start with ?)
        if (href.startsWith("?")) continue;

        // skip parent directory link
        if (linkText === "Parent Directory" || href === "/") continue;

        // determine if this is a directory or file
        // Check for img tag with alt attribute first
        let type: "directory" | "file" = "file";
        const imgMatch = line.match(/<img[^>]+alt=["'](\[[^\]]+\])["'][^>]*>/i);

        if (imgMatch) {
          // has image - use alt attribute to determine type
          const imgAlt = imgMatch[1];
          type = imgAlt === "[DIR]" ? "directory" : "file";
        } else {
          // no image - determine by href ending with /
          type = href.endsWith("/") ? "directory" : "file";
        }

        // extract date from the line content
        const dateMatch = line.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
        let lastModified;
        if (dateMatch && dateMatch[0]) {
          const dateString = dateMatch[0];
          const date = new Date(`${dateString.replace(" ", "T")}:00Z`);
          if (!Number.isNaN(date.getTime())) {
            lastModified = date.getTime();
          }
        }

        // clean up the name - remove trailing / for directories and decode HTML entities
        let name = linkText;
        if (type === "directory" && name.endsWith("/")) {
          name = name.slice(0, -1);
        }

        // handle truncated names (ending with ..>)
        if (name.endsWith("..>")) {
          // try to extract the full name from href
          const decodedHref = decodeURIComponent(href);
          if (decodedHref !== href) {
            // use the decoded href as the name (removing extension or trailing /)
            name = decodedHref.replace(/\/$/, "").split("/").pop() || name;
          }
        }

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
