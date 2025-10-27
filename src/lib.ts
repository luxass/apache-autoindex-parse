export function trimTrailingSlash(path: string): string {
  if (path === "/") {
    return path;
  }

  // Remove trailing slash if it exists
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function trimLeadingSlash(path: string): string {
  if (path.startsWith("/")) {
    return path.slice(1);
  }

  return path;
}
