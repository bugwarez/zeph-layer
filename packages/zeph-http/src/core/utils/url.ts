export function joinUrl(baseURL: string, path: string): string {
  const root = baseURL.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return root + suffix;
}

export function appendQueryParams(
  url: string,
  params?: Record<string, any>
): string {
  if (!params) return url;
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  return url + (url.includes("?") ? "&" : "?") + query;
}
