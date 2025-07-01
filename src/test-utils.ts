import type { AutoIndexFormat, Entry } from "./index";

export interface GenerateHtmlOptions {
  /**
   * The title of the directory listing
   * @default "Index of /"
   */
  title?: string;

  /**
   * Whether to include a parent directory link
   * @default true
   */
  includeParent?: boolean;

  /**
   * Custom header content to include (like in unicode.org example)
   */
  headerContent?: string;
}

/**
 * Generates HTML content for Apache-style directory index listings.
 *
 * This function creates HTML that mimics Apache's autoindex module output,
 * supporting different format types (F0, F1, F2) that correspond to different
 * Apache autoindex display styles.
 *
 * @param {Entry[]} entries - Array of directory entries to display in the listing
 * @param {AutoIndexFormat} format - The Apache autoindex format type ("F0", "F1", or "F2")
 *   - F0: Simple unordered list format
 *   - F1: Preformatted text with columns and icons
 *   - F2: HTML table format with sortable columns
 * @param {GenerateHtmlOptions} options - Configuration options for the HTML generation
 * @returns {string} Complete HTML document string representing the directory index
 *
 * @example
 * ```typescript
 * import { generateAutoIndexHtml } from "apache-autoindex-parse/test-utils";
 *
 * const entries = [
 *   { type: "directory", name: "docs", path: "docs/", lastModified: Date.now() },
 *   { type: "file", name: "README.md", path: "README.md", lastModified: Date.now() }
 * ];
 *
 * const html = generateAutoIndexHtml(entries, "F1", {
 *   title: "Index of /mydir",
 *   includeParent: true
 * });
 * ```
 */
export function generateAutoIndexHtml(
  entries: Entry[],
  format: AutoIndexFormat,
  options: GenerateHtmlOptions = {},
): string {
  const { title = "Index of /", includeParent = true, headerContent } = options;

  const header = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 3.2 Final//EN">
<html>
 <head>
  <title>${title}</title>
 </head>
 <body>`;

  const footer = `</body></html>`;

  let content = "";

  if (headerContent) {
    content += `<div style="padding: 0.5em">${headerContent}</div>\n<hr/>\n`;
  }

  if (format === "F0") {
    content += generateF0Content(entries, includeParent, title);
  } else if (format === "F1") {
    content += generateF1Content(entries, includeParent, title);
  } else if (format === "F2") {
    content += generateF2Content(entries, includeParent, title);
  }

  return header + content + footer;
}

function generateF0Content(entries: Entry[], includeParent: boolean, title: string): string {
  let content = `<h1>${title}</h1>\n<ul>`;

  if (includeParent) {
    content += `<li><a href="/"> Parent Directory</a></li>\n`;
  }

  for (const entry of entries) {
    const href = entry.path;
    const name = entry.type === "directory" ? `${entry.name}/` : entry.name;
    content += `<li><a href="${href}"> ${name}</a></li>\n`;
  }

  content += "</ul>";
  return content;
}

function generateF1Content(entries: Entry[], includeParent: boolean, title: string): string {
  let content = `<h1>${title}</h1>\n<pre>`;
  content += `<img src="/icons/blank.gif" alt="Icon "> <a href="?C=N;O=D;F=1">Name</a>                    <a href="?C=M;O=A;F=1">Last modified</a>      <a href="?C=S;O=A;F=1">Size</a>  <a href="?C=D;O=A;F=1">Description</a><hr>`;

  if (includeParent) {
    content += `<img src="/icons/back.gif" alt="[PARENTDIR]"> <a href="/">Parent Directory</a>                             -   \n`;
  }

  for (const entry of entries) {
    const isDir = entry.type === "directory";
    const icon = isDir ? `<img src="/icons/folder.gif" alt="[DIR]">` : `<img src="/icons/text.gif" alt="[TXT]">`;
    const name = isDir ? `${entry.name}/` : entry.name;
    const href = entry.path;
    const date = entry.lastModified ? new Date(entry.lastModified).toISOString().slice(0, 16).replace("T", " ") : "";
    const size = isDir ? "-" : "0";

    content += `${icon} <a href="${href}">${name.padEnd(24)}</a> ${date.padEnd(17)} ${size.padStart(4)}   \n`;
  }

  content += "<hr></pre>";
  return content;
}

function generateF2Content(entries: Entry[], includeParent: boolean, title: string): string {
  let content = `<h1>${title}</h1>\n  <table>\n`;
  content += `   <tr><th valign="top">&nbsp;</th><th><a href="?C=N;O=D">Name</a></th><th><a href="?C=M;O=A">Last modified</a></th><th><a href="?C=S;O=A">Size</a></th><th><a href="?C=D;O=A">Description</a></th></tr>\n`;
  content += `   <tr><th colspan="5"><hr></th></tr>\n`;

  if (includeParent) {
    content += `<tr><td valign="top"><img src="/icons/back.gif" alt="[PARENTDIR]"></td><td><a href="/">Parent Directory</a></td><td>&nbsp;</td><td align="right">  - </td><td>&nbsp;</td></tr>\n`;
  }

  for (const entry of entries) {
    const isDir = entry.type === "directory";
    const icon = isDir ? `<img src="/icons/folder.gif" alt="[DIR]">` : `<img src="/icons/text.gif" alt="[TXT]">`;
    const name = isDir ? `${entry.name}/` : entry.name;
    const href = entry.path;
    const date = entry.lastModified ? new Date(entry.lastModified).toISOString().slice(0, 16).replace("T", " ") : "&nbsp;";
    const size = isDir ? "  - " : "  0 ";

    content += `<tr><td valign="top">${icon}</td><td><a href="${href}">${name}</a></td><td align="right">${date}  </td><td align="right">${size}</td><td>&nbsp;</td></tr>\n`;
  }

  content += `   <tr><th colspan="5"><hr></th></tr>\n</table>`;
  return content;
}

/**
 * Creates a sample array of directory entries for testing purposes.
 *
 * This utility function generates a predefined set of entries that includes
 * both directories and files with realistic timestamps. It's useful for
 * testing the Apache autoindex parsing functionality or generating sample
 * HTML outputs.
 *
 * @returns {Entry[]} An array of sample entries containing:
 *   - Two directories: "docs" and "src"
 *   - Two files: "README.md" and "package.json"
 *   Each entry includes appropriate timestamps set to different times in the past
 *
 * @example
 * ```typescript
 * import { createSampleEntries, generateAutoIndexHtml } from "apache-autoindex-parse/test-utils";
 *
 * const entries = createSampleEntries();
 * const html = generateAutoIndexHtml(entries, "F1");
 * console.log(html); // Outputs HTML with sample directory listing
 * ```
 *
 * @example
 * ```typescript
 * // Use for testing parsing functionality
 * import { createSampleEntries } from "apache-autoindex-parse/test-utils";
 *
 * const sampleData = createSampleEntries();
 * // sampleData contains predefined entries for consistent testing
 * ```
 */
export function createSampleEntries(): Entry[] {
  return [
    {
      type: "directory",
      name: "docs",
      path: "docs/",
      lastModified: Date.now() - 86400000, // 1 day ago
    },
    {
      type: "directory",
      name: "src",
      path: "src/",
      lastModified: Date.now() - 3600000, // 1 hour ago
    },
    {
      type: "file",
      name: "README.md",
      path: "README.md",
      lastModified: Date.now() - 1800000, // 30 minutes ago
    },
    {
      type: "file",
      name: "package.json",
      path: "package.json",
      lastModified: Date.now() - 7200000, // 2 hours ago
    },
  ];
}
