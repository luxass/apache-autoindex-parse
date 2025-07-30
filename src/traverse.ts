import type { AutoIndexFormat, DirectoryEntry, FileEntry } from "./index";
import { parse } from "./index";
import { addLeadingSlash, trimTrailingSlash } from "./lib";

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

export type TraverseEntry = FileEntry | DirectoryEntry & {
  children: TraverseEntry[];
};

/**
 * Recursively traverses an Apache autoindex directory structure.
 *
 * This function fetches the HTML content from the provided URL, parses it to extract directory entries,
 * and then recursively traverses any subdirectories found.
 *
 * @param {string} rootUrl - The URL of the Apache autoindex directory to traverse
 * @param {TraverseOptions?} options - Optional configuration for the traversal process
 * @returns {Promise<TraverseEntry[]>} A promise that resolves to a RootEntry object representing the directory structure, or null if parsing failed
 *
 * @example
 * ```typescript
 * import { traverse } from 'apache-autoindex-parse/traverse';
 *
 * const directoryStructure = await traverse('https://example.com/files');
 * ```
 */
export async function traverse(rootUrl: string, options?: TraverseOptions): Promise<TraverseEntry[]> {
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

        const childUrl = rootUrl.endsWith("/")
          ? rootUrl + (entry.path.startsWith("/") ? entry.path.slice(1) : entry.path)
          : rootUrl + (entry.path.startsWith("/") ? entry.path : `/${entry.path}`);
        const child = await traverse(childUrl, options);

        entry.name = trimTrailingSlash(entry.name);
        entry.path = addLeadingSlash(entry.path);

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
