import { ZephHttpError } from "../types/error";

/**
 * Throws if a body is provided for GET or HEAD requests.
 * @param method HTTP method
 * @param body Request body
 */
export function guardBodyWithGetHead(method: string, body: unknown): void {
  if (["GET", "HEAD"].includes(method.toUpperCase()) && body != null) {
    throw new ZephHttpError(
      `A body is not allowed for ${method.toUpperCase()} requests. Per HTTP spec, GET/HEAD requests must not have a body.`,
      {}
    );
  }
}

/**
 * Warns if the same header key exists in both default and per-request headers.
 * @param defaultHeaders Default headers from client config
 * @param callHeaders Headers from the request config
 */
export function warnDuplicateHeaders(
  defaultHeaders: Record<string, string> = {},
  callHeaders: Record<string, string> = {}
): void {
  const duplicates = Object.keys(callHeaders).filter((key) =>
    Object.keys(defaultHeaders).includes(key)
  );
  if (duplicates.length > 0) {
    console.warn(
      `Duplicate header(s) detected: ${duplicates.join(
        ", "
      )}. Per-request headers will override default headers.`
    );
  }
}
