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
