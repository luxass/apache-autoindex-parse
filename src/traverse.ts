import type { AutoIndexFormat, RootEntry } from "./";
import { parse } from "./";

export interface TraverseOptions {
  /**
   * Optional format specification of the auto-index page (will be inferred if not provided)
   * @default undefined
   */
  format?: AutoIndexFormat;

  /**
   * Optional extra headers to include in the request
   * @default {}
   */
  extraHeaders?: Record<string, string>;
}

/**
 * Recursively traverses an Apache autoindex directory structure.
 *
 * This function fetches the HTML content from the provided URL, parses it to extract directory entries,
 * and then recursively traverses any subdirectories found.
 *
 * @param {string} rootUrl - The URL of the Apache autoindex directory to traverse
 * @param {TraverseOptions?} options - Optional configuration for the traversal process
 * @returns {Promise<RootEntry | null>} A promise that resolves to a RootEntry object representing the directory structure, or null if parsing failed
 * @throws Will throw an error if the fetch request fails
 *
 * @example
 * ```typescript
 * const directoryStructure = await traverse('https://example.com/files/');
 * ```
 */
export async function traverse(rootUrl: string, options?: TraverseOptions): Promise<RootEntry | null> {
  const res = await fetch(rootUrl, {
    headers: {
      "User-Agent": "github.com/apache-autoindex-parse",
      ...options?.extraHeaders,
    },
  });

  if (!res.ok) {
    throw new Error(`failed to fetch directory listing from ${rootUrl}`);
  }

  const html = await res.text();

  const root = parse(html, options?.format);

  // for each directory entry, fetch its children
  for (const entry of root?.children ?? []) {
    if (entry.type === "file") {
      continue;
    }

    const childUrl = new URL(entry.path, rootUrl).href;
    const child = await traverse(childUrl, options);

    if (child == null) continue;

    entry.children = child.children;
  }

  return root;
}
