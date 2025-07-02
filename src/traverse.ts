import type { AutoIndexFormat, Entry } from "./index";
import { parse } from "./index";

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

  /**
   * Optional signal to abort the fetch request
   * @default undefined
   */
  abortSignal?: AbortSignal;
}

export type EntryWithChildren = Entry & {
  /**
   * Children entries for directories
   */
  children?: EntryWithChildren[];
};

/**
 * Recursively traverses an Apache autoindex directory structure.
 *
 * This function fetches the HTML content from the provided URL, parses it to extract directory entries,
 * and then recursively traverses any subdirectories found.
 *
 * @param {string} rootUrl - The URL of the Apache autoindex directory to traverse
 * @param {TraverseOptions?} options - Optional configuration for the traversal process
 * @returns {Promise<EntryWithChildren[]>} A promise that resolves to a RootEntry object representing the directory structure, or null if parsing failed
 *
 * @example
 * ```typescript
 * const directoryStructure = await traverse('https://example.com/files');
 * ```
 */
export async function traverse(rootUrl: string, options?: TraverseOptions): Promise<EntryWithChildren[]> {
  try {
    const res = await fetch(rootUrl, {
      headers: {
        "User-Agent": "github.com/luxass/apache-autoindex-parse",
        ...options?.extraHeaders,
      },
      signal: options?.abortSignal,
    });

    if (!res.ok) {
      throw new Error(`failed to fetch directory listing from ${rootUrl}: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const rootEntries = parse(html, options?.format);

    if (!rootEntries) return [];

    const entries = await Promise.all(
      rootEntries.map(async (entry) => {
        if (entry.type === "file") {
          return entry;
        }

        const childUrl = new URL(entry.path, rootUrl.endsWith("/") ? rootUrl : `${rootUrl}/`).href;
        const child = await traverse(childUrl, options);

        return {
          ...entry,
          children: child,
        };
      }),
    );

    return entries;
  } catch {
    return [];
  }
}
