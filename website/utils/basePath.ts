/**
 * Get the basePath from the Next.js configuration
 * This is needed for GitHub Pages deployments where the app is served from a subdirectory
 */
export function getBasePath(): string {
  return process.env.__NEXT_ROUTER_BASEPATH || process.env.BASE_PATH || '';
}

/**
 * Add basePath prefix to a path
 * @param path - The path to prefix (e.g., '/logo.png')
 * @returns The path with basePath prefix (e.g., '/DayFlow/logo.png')
 */
export function withBasePath(path: string): string {
  const basePath = getBasePath();
  // Don't add basePath if it's already there or if path is absolute URL
  if (!path || path.startsWith('http') || path.startsWith(basePath)) {
    return path;
  }
  return `${basePath}${path}`;
}
