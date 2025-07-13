export function mergeHeaders(
  defaultHeaders: Record<string, string> = {},
  callHeaders: Record<string, string> = {}
): Record<string, string> {
  return { ...defaultHeaders, ...callHeaders };
}

export function detectAndSetContentType(
  headers: Record<string, string>,
  body: any
): void {
  if (!headers["Content-Type"] && body != null) {
    if (body instanceof FormData) {
      // Let fetch set the correct boundary
    } else if (body instanceof Blob) {
      headers["Content-Type"] = body.type || "application/octet-stream";
    } else if (typeof body === "string") {
      headers["Content-Type"] = "text/plain";
    } else if (typeof body === "object") {
      headers["Content-Type"] = "application/json";
    }
  }
}
