export function trimTrailingSlash(path: string): string {
  if (path === "/") {
    return path;
  }

  // Remove trailing slash if it exists
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function addLeadingSlash(path: string): string {
  // Add leading slash if it doesn't exist
  return path.startsWith("/") ? path : `/${path}`;
}
