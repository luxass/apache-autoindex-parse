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
  }

  if (hasPre) {
    return "F1";
  }

  if (hasTable) {
    return "F2";
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

    if (type === "directory") {
      entries.push({
        type,
        name: name.slice(0, -1),
        path: href,
        lastModified,
        children: [],
      });
    } else {
      entries.push({
        type,
        name,
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

  const rows = table.querySelectorAll("tr");
  if (!rows.length) return entries;

  // We skip the first row since it contains the headers
  // and we assume the first row is always the header row
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (!row) continue;

    // skip row if it contains table headers or horizontal rules
    if (row.querySelector("th") || row.querySelector("hr")) {
      continue;
    }

    // get all cells in the row
    const cells = row.querySelectorAll("td");
    if (cells.length < 3) continue;

    const iconCell = cells[0];
    if (!iconCell) throw new Error("icon cell not found");
    const linkCell = cells[1];
    if (!linkCell) throw new Error("link cell not found");

    const hasIcon = iconCell.querySelector("img") !== null;

    function getIsParentDirectory() {
      if (!hasIcon) return false;
      const img = iconCell?.querySelector("img");
      if (!img) return false;
      const alt = img.getAttribute("alt");
      return alt === "[PARENTDIR]";
    }

    function hasImageAlt(altText: string): boolean {
      if (!hasIcon) return false;
      const img = iconCell?.querySelector("img");
      if (!img) return false;
      const alt = img.getAttribute("alt");
      return alt === altText;
    }

    if (getIsParentDirectory()) continue;

    const link = linkCell.querySelector("a");
    if (!link) continue;

    // The link cell can also contain the root path of / in the href,
    // if that is the case, we skip it
    if (link.getAttribute("href") === "/") continue;

    const href = link.getAttribute("href") || "";
    const name = link.textContent.trim();

    // skip parent directory by name as well
    if (name === "Parent Directory") continue;

    // get date cell (third cell)
    const dateCell = cells[2];
    if (!dateCell) throw new Error("date cell not found");
    const dateText = dateCell.textContent.trim();

    // Parse the date
    let lastModified;
    if (dateText && dateText !== "\xA0") { // \xa0 is &nbsp;
      const date = new Date(dateText);
      if (!Number.isNaN(date.getTime())) {
        lastModified = date.getTime();
      }
    }

    // Determine type
    const isDirectory = hasImageAlt("[DIR]") || href.endsWith("/");
    const type = isDirectory ? "directory" : "file";

    // Create the entry
    if (type === "directory") {
      entries.push({
        type,
        name: name.slice(0, -1),
        path: href,
        lastModified,
        children: [],
      });
    } else {
      entries.push({
        type,
        name,
        path: href,
        lastModified,
      });
    }
  }

  return entries;
}
