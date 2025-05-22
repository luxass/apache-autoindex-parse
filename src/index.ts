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
  // extract title and root path
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const titleText = titleMatch?.[1] || "";
  const rootPath = titleText.split("Index of ")[1] ?? "/";

  let entries: Entry[] = [];

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
 * @param {string} html - The HTML content to analyze
 * @returns {AutoIndexFormat} The inferred format as an AutoIndexFormat string (e.g., "F0", "F1", "F2", etc.)
 */
function inferFormat(html: string): AutoIndexFormat {
  // find all href attributes in anchor tags using a regex
  const hrefRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;

  // extract all hrefs that start with "?"
  const hrefs = Array.from(html.matchAll(hrefRegex))
    .map((match) => match[1])
    .filter((href): href is string => href !== undefined && href.startsWith("?"));

  // look for format parameter
  for (const href of hrefs) {
    const formatMatch = href.match(/F=(\d)/);
    if (formatMatch && formatMatch[1]) {
      return `F${formatMatch[1]}` as AutoIndexFormat;
    }
  }

  return "F0";
}

function parseF0(html: string): Entry[] {
  const entries: Entry[] = [];

  // find the first ul element and its li children
  const ulMatch = html.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);

  if (!ulMatch || !ulMatch[1]) return entries;

  const ulContent = ulMatch[1];
  const liRegex = /<li[^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>[\s\S]*?<\/li>/gi;

  // use matchAll to get all matches at once
  const matches = Array.from(ulContent.matchAll(liRegex));

  for (const match of matches) {
    const href = match[1] || "";
    const name = (match[2] || "").trim();

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

function parseF1(html: string): Entry[] {
  const entries: Entry[] = [];

  // find all pre elements
  const preRegex = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  const preMatches = Array.from(html.matchAll(preRegex));

  for (const preMatch of preMatches) {
    if (!preMatch[1]) continue;
    const preContent = preMatch[1];

    // find all anchor tags with their preceding img tags
    const entryRegex = /<img[^>]+alt=["'](\[(?:DIR|TXT)\])["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>([\s\S]*?)(?=<img|$)/gi;
    const entryMatches = Array.from(preContent.matchAll(entryRegex));

    for (const entryMatch of entryMatches) {
      const imgAlt = entryMatch[1] || "";
      const href = entryMatch[2] || "";
      const text = (entryMatch[3] || "").trim();
      const rowText = entryMatch[4] || "";

      // skip parent directory link
      if (href === "/Public/") continue;

      // only process directories and files
      if (imgAlt === "[DIR]" || imgAlt === "[TXT]") {
        // determine entry type
        const type = imgAlt === "[DIR]" ? "directory" : "file";

        // extract date from text content using regex
        const dateMatch = rowText.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);

        // parse the date if found
        let lastModified;
        if (dateMatch && dateMatch[0]) {
          const dateString = dateMatch[0];
          const date = new Date(`${dateString.replace(" ", "T")}:00Z`);
          if (!Number.isNaN(date.getTime())) {
            lastModified = date.getTime();
          }
        }

        // use just the href as path
        const path = href;

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
    }
  }

  return entries;
}

function parseF2(html: string): Entry[] {
  const entries: Entry[] = [];

  // find the table and extract rows
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);

  if (!tableMatch || !tableMatch[1]) return entries;

  const tableContent = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  // get all rows at once
  const rowMatches = Array.from(tableContent.matchAll(rowRegex));

  for (const rowMatch of rowMatches) {
    if (!rowMatch[1]) continue;
    const rowContent = rowMatch[1];

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
