import type { AutoIndexFormat, DirectoryEntry, FileEntry } from "./index";
import { parse } from "./index";
import { trimLeadingSlash, trimTrailingSlash } from "./lib";

export interface TraverseOptions {
  /**
   * Optional format specification of the auto-index page (will be inferred if not provided)
   * @default undefined
   */
  format?: AutoIndexFormat;

  /**
   * Optional base path to prepend to all entry paths
   * @default undefined
   */
  basePath?: string;

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

  /**
   * Callback function invoked for each file found during traversal.
   * @param {FileEntry} file The file entry object.
   * @returns {Promise<void> | void} A promise or void that resolves when the callback is complete.
   */
  onFile?: (file: FileEntry) => Promise<void> | void;

  /**
   * Callback function invoked for each directory found during traversal.
   * @param {DirectoryEntryWithChildren} directory The directory entry object.
   * @returns {Promise<void> | void} A promise or void that resolves when the callback is complete.
   */
  onDirectory?: (directory: DirectoryEntryWithChildren) => Promise<void> | void;
}

type DirectoryEntryWithChildren = DirectoryEntry & {
  children: TraverseEntry[];
};

export type TraverseEntry = FileEntry | DirectoryEntryWithChildren;

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
  return traverseInternal(rootUrl, "", options);
}

async function traverseInternal(rootUrl: string, pathPrefix: string, options?: TraverseOptions): Promise<TraverseEntry[]> {
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
        const joined = pathPrefix
          ? `${trimTrailingSlash(pathPrefix)}/${trimLeadingSlash(entry.path)}`
          : trimLeadingSlash(entry.path);

        const normalized = normalizeTraversePath(joined, entry.type === "directory");

        const fullPath = options?.basePath
          ? normalizeWithBasePath(normalized, entry.type === "directory", options.basePath)
          : normalized;

        if (entry.type === "file") {
          const newFileEntry = {
            ...entry,
            path: fullPath,
          };

          await options?.onFile?.(newFileEntry);
          return newFileEntry;
        }

        const childPathSegment = trimLeadingSlash(entry.path);
        const childUrl = rootUrl.endsWith("/")
          ? `${rootUrl}${childPathSegment}`
          : `${rootUrl}/${childPathSegment}`;

        const child = await traverseInternal(childUrl, fullPath, options);

        entry.name = trimTrailingSlash(entry.name);

        const dirEntry = {
          ...entry,
          path: fullPath,
          children: child,
        };

        await options?.onDirectory?.(dirEntry);

        return dirEntry;
      }),
    );

    return entries;
  } catch {
    return [];
  }
}

function ensureTrailingSlash(path: string): string {
  if (path === "/") {
    return path;
  }

  return path.endsWith("/") ? path : `${path}/`;
}

function normalizeTraversePath(path: string, isDirectory: boolean): string {
  const trimmed = trimTrailingSlash(trimLeadingSlash(path));

  if (!isDirectory) {
    return trimmed;
  }

  return ensureTrailingSlash(trimmed);
}

function normalizeWithBasePath(path: string, isDirectory: boolean, basePath: string): string {
  const normalizedBasePath = basePath.startsWith("/") ? basePath : `/${basePath}`;
  const basePathWithoutTrailing = trimTrailingSlash(normalizedBasePath);

  const trimmedPath = trimTrailingSlash(trimLeadingSlash(path));
  const combined = `${basePathWithoutTrailing}/${trimmedPath}`;

  if (!isDirectory) {
    return trimTrailingSlash(combined);
  }

  return ensureTrailingSlash(trimTrailingSlash(combined));
}
