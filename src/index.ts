import * as cheerio from "cheerio";

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
  const $ = cheerio.load(html);

  const title = $("title").text();

  const rootPath = title.split("Index of ")[1] ?? "/";

  let entries: Entry[] = [];

  if (!format) {
    format = inferFormat($);
  }

  if (format === "F0") {
    entries = parseF0($, rootPath);
  }

  if (format === "F1") {
    entries = parseF1($, rootPath);
  }

  if (format === "F2") {
    entries = parseF2($, rootPath);
  }

  return {
    type: "directory",
    path: rootPath,
    children: entries,
  };
}

/**
 * Infers the AutoIndexFormat from a Cheerio API object.
 *
 * This function examines the links on the page to determine the format
 * of an Apache AutoIndex page. It looks for URL parameters that indicate
 * the format (e.g., "F=2" in "?C=N;O=D;F=2").
 *
 * @param {cheerio.CheerioAPI} $ - A Cheerio API object representing the parsed HTML page
 * @returns {AutoIndexFormat} The inferred format as an AutoIndexFormat string (e.g., "F0", "F1", "F2", etc.)
 */
function inferFormat($: cheerio.CheerioAPI): AutoIndexFormat {
  // try get all hrefs from the page
  const hrefs = $("a")
    .toArray()
    .map((element) => $(element).attr("href"))
    .filter((href) => href != null)
    .filter((href) => href.startsWith("?"));

  for (const href of hrefs) {
    // ?C=N;O=D;F=2
    const match = href?.match(/F=(\d)/);
    if (match) {
      return `F${match[1]}` as AutoIndexFormat;
    }
  }

  return "F0";
}

function parseF0($: cheerio.CheerioAPI, rootPath: string): Entry[] {
  const ul = $("ul").first();

  const entries: Entry[] = [];

  const children = ul.children("li").toArray();

  for (const li of children) {
    const a = $(li).children("a");
    const href = a.attr("href") ?? "";
    const name = a.text().trim();

    const isDirectory = href.endsWith("/");

    if (name === "Parent Directory") {
      continue;
    }

    const path = /^https?:\/\//.test(href ?? "")
      ? href!
      : `${rootPath}/${href}`;

    if (isDirectory) {
      entries.push({
        type: "directory",
        name: name.trim().slice(0, -1),
        path,
        lastModified: undefined,
        children: [],
      });
    } else {
      entries.push({
        type: "file",
        name: name.trim(),
        path,
        lastModified: undefined,
      });
    }
  }

  return entries;
}

function parseF1($: cheerio.CheerioAPI, rootPath: string): Entry[] {
  const entries: Entry[] = [];

  // select all rows except the header and parent directory
  $("pre").find("a").each((_, element) => {
    const $element = $(element);
    const href = $element.attr("href");
    const text = $element.text().trim();

    // skip parent directory link
    if (href === "/Public/") return;

    // get the img element that comes before this anchor
    const imgElement = $element.prev("img");
    const imgAlt = imgElement.attr("alt");

    // only process directories and files
    if (imgAlt === "[DIR]" || imgAlt === "[TXT]") {
      // Determine entry type
      const type = imgAlt === "[DIR]" ? "directory" : "file";

      // get the parent <pre> row
      const $row = $element.parent();

      // extract date from text content using regex
      const rowText = $row.text();
      const dateMatch = rowText.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);

      // parse the date if found
      let lastModified;
      if (dateMatch) {
        const dateString = dateMatch[0];
        const date = new Date(`${dateString.replace(" ", "T")}:00Z`);
        if (!Number.isNaN(date.getTime())) {
          lastModified = date.getTime();
        }
      }

      // create path by joining rootPath with href
      const path = /^https?:\/\//.test(href ?? "")
        ? href!
        : `${rootPath}/${href}`;

      if (type === "directory") {
        entries.push({
          type,
          name: text,
          path,
          lastModified,
          children: [],
        });
      } else {
        entries.push({
          type,
          name: text,
          path,
          lastModified,
        });
      }
    }
  });

  return entries;
}

function parseF2($: cheerio.CheerioAPI, rootPath: string): Entry[] {
  const entries: Entry[] = [];

  // select all table rows (skip header rows and divider rows)
  $("table tr").each((_, row) => {
    const $row = $(row);
    const $cells = $row.find("td");

    // skip if no cells, header rows, or divider rows
    if ($cells.length === 0 || $row.find("th").length > 0 || $row.find("hr").length > 0) {
      return;
    }

    // get the first cell with the image
    const $imgCell = $cells.eq(0);
    const $img = $imgCell.find("img");
    const imgAlt = $img.attr("alt");

    // skip if not a directory or file
    if (imgAlt !== "[DIR]" && imgAlt !== "[TXT]") {
      // skip parent directory
      if (imgAlt === "[PARENTDIR]") return;

      // skip rows without recognizable type
      if (!imgAlt || !imgAlt.startsWith("[")) return;
    }

    // get link and name from second cell
    const $linkCell = $cells.eq(1);
    const $link = $linkCell.find("a");
    if (!$link.length) return;

    const href = $link.attr("href");
    const name = $link.text().trim();

    // skip parent directory
    if (name === "Parent Directory") return;

    // get date from the third cell
    const $dateCell = $cells.eq(2);
    const dateText = $dateCell.text().trim();

    // parse the date
    let lastModified;
    if (dateText && dateText !== "&nbsp;") {
      const date = new Date(dateText);
      if (!Number.isNaN(date.getTime())) {
        lastModified = date.getTime();
      }
    }

    // determine type
    const type = imgAlt === "[DIR]" || href?.endsWith("/") ? "directory" : "file";

    // create path by joining rootPath with href
    const path = /^https?:\/\//.test(href ?? "")
      ? href!
      : `${rootPath}/${href}`;

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
  });

  return entries;
}
