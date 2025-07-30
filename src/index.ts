import { addLeadingSlash, trimTrailingSlash } from "./lib";

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
}

export type Entry = FileEntry | DirectoryEntry;

export type AutoIndexFormat = "F0" | "F1" | "F2";

/**
 * parses html content of an auto-indexed directory listing into a structured format.
 *
 * @param {string} html - the html content of the auto-indexed directory page to parse
 * @param {AutoIndexFormat?} format - optional format specification of the auto-index page (will be inferred if not provided)
 * @returns {Entry[]} an array of entries representing the parsed directory structure, or empty array if parsing fails
 *
 * @example
 * ```ts
 * const html = await fetch('http://example.com/files/').then(res => res.text());
 * const result = parse(html);
 * console.log(result); // array of file and directory entries
 * ```
 */
export function parse(html: string, format?: AutoIndexFormat): Entry[] {
  let entries: Entry[] = [];
  if (!html) {
    return entries;
  }

  if (!format) {
    format = inferFormat(html);
  }

  if (format === "F0") {
    entries = parseF0(html);
  }

  if (format === "F1") {
    entries = parseF1(html);
  }

  if (format === "F2") {
    entries = parseF2(html);
  }

  return entries;
}

/**
 * infers the autoindexformat from html content.
 *
 * this function examines the links on the page to determine the format
 * of an apache autoindex page. it looks for url parameters that indicate
 * the format (e.g., "f=2" in "?c=n;o=d;f=2").
 *
 * @param {string} html - the html content to analyze
 * @returns {AutoIndexFormat} the inferred format as an autoindexformat string (e.g., "f0", "f1", "f2", etc.)
 */
export function inferFormat(html: string): AutoIndexFormat {
  // look for format parameter in href attributes
  const formatMatch = html.match(/href="[^"]*[?&]F=(\d)[^"]*"/);
  if (formatMatch && formatMatch[1]) {
    return `F${formatMatch[1]}` as AutoIndexFormat;
  }

  // check for structural indicators
  const hasPre = /<pre[^>]*>/.test(html);
  const hasTable = /<table[^>]*>/.test(html);

  if (hasPre) {
    return "F1";
  }

  if (hasTable) {
    return "F2";
  }

  return "F0";
}

function parseF0(html: string): Entry[] {
  const entries: Entry[] = [];

  // match <li><a href="...">...</a></li> patterns
  const linkRegex = /<li[^>]*>\s*<a\s+href="([^"]*)"[^>]*>([^<]+)<\/a>\s*<\/li>/gi;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = linkRegex.exec(html)) !== null) {
    const [, href, name] = match;

    if (!href || !name || name.trim() === "Parent Directory") {
      continue;
    }

    const cleanName = name.trim();
    const isDirectory = href.endsWith("/");

    if (isDirectory) {
      entries.push({
        type: "directory",
        name: trimTrailingSlash(cleanName),
        path: trimTrailingSlash(addLeadingSlash(href)),
        lastModified: undefined,
      });
    } else {
      entries.push({
        type: "file",
        name: trimTrailingSlash(cleanName),
        path: trimTrailingSlash(addLeadingSlash(href)),
        lastModified: undefined,
      });
    }
  }

  return entries;
}

function parseF1(html: string): Entry[] {
  const entries: Entry[] = [];

  // extract content from <pre> tag
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!preMatch || !preMatch[1]) return entries;

  const preContent = preMatch[1];

  // match links with surrounding context for date extraction
  // this regex captures the link and the text around it to extract dates
  const linkRegex = /<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>([^<\n]*)/gi;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = linkRegex.exec(preContent)) !== null) {
    const [, href, name, afterText] = match;

    if (!href || !name || name.trim() === "Parent Directory" || href.startsWith("?")) {
      continue;
    }

    const cleanName = name.trim();
    const isDirectory = href.endsWith("/");

    // extract date from the text after the link
    let lastModified;
    if (afterText) {
      const dateMatch = afterText.match(/(\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2}|\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
      if (dateMatch && dateMatch[0]) {
        const date = new Date(dateMatch[0]);
        if (!Number.isNaN(date.getTime())) {
          lastModified = date.getTime();
        }
      }
    }

    if (isDirectory) {
      entries.push({
        type: "directory",
        name: trimTrailingSlash(cleanName),
        path: trimTrailingSlash(addLeadingSlash(href)),
        lastModified,
      });
    } else {
      entries.push({
        type: "file",
        name: trimTrailingSlash(cleanName),
        path: trimTrailingSlash(addLeadingSlash(href)),
        lastModified,
      });
    }
  }

  return entries;
}

function parseF2(html: string): Entry[] {
  const entries: Entry[] = [];

  // match table rows, excluding header rows and hr rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  // eslint-disable-next-line no-cond-assign
  while ((match = rowRegex.exec(html)) !== null) {
    const rowContent = match[1];

    if (!rowContent) continue;

    // skip rows with th elements or hr elements
    if (/<th[^>]*>/.test(rowContent) || /<hr[^>]*>/.test(rowContent)) {
      continue;
    }

    // extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;

    // eslint-disable-next-line no-cond-assign
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      if (cellMatch[1] !== undefined) {
        cells.push(cellMatch[1]);
      }
    }

    if (cells.length < 3) continue;

    const iconCell = cells[0];
    const linkCell = cells[1];
    const dateCell = cells[2];

    // check for parent directory icon
    if (iconCell && /alt="\[PARENTDIR\]"/.test(iconCell)) {
      continue;
    }

    // extract link information
    if (!linkCell) continue;

    const linkMatch = linkCell.match(/<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/i);
    if (!linkMatch || !linkMatch[1] || !linkMatch[2]) continue;

    const [, href, name] = linkMatch;

    // skip root path links and parent directory
    if (href === "/" || name.trim() === "Parent Directory") {
      continue;
    }

    const cleanName = name.trim();
    if (!cleanName) continue;

    // determine if it's a directory
    const isDirectory = (iconCell && /alt="\[DIR\]"/.test(iconCell)) || href.endsWith("/");

    // parse date
    let lastModified;
    if (dateCell) {
      const dateText = dateCell.replace(/<[^>]*>/g, "").trim();
      if (dateText && dateText !== "\xA0" && dateText !== "&nbsp;") {
        const date = new Date(dateText);
        if (!Number.isNaN(date.getTime())) {
          lastModified = date.getTime();
        }
      }
    }

    if (isDirectory) {
      entries.push({
        type: "directory",
        name: trimTrailingSlash(cleanName),
        path: trimTrailingSlash(addLeadingSlash(href)),
        lastModified,
      });
    } else {
      entries.push({
        type: "file",
        name: trimTrailingSlash(cleanName),
        path: trimTrailingSlash(addLeadingSlash(href)),
        lastModified,
      });
    }
  }

  return entries;
}
