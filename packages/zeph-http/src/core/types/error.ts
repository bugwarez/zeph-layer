import type { ZephRequestConfig } from "./http";

/**
 * Custom error class for Zeph HTTP client.
 *
 * @template T - The type of the response data.
 * @property {number} [status] - HTTP status code, if available.
 * @property {T} [data] - Response data, if available.
 * @property {Record<string, string>} [headers] - Response headers, if available.
 * @property {ZephRequestConfig} [request] - The request config that caused the error.
 * @property {boolean} isZephHttpError - Always true for this error type.
 * @property {unknown} [cause] - The original error, if any.
 */

export class ZephHttpError<T = any> extends Error {
  public status?: number;
  public data?: T;
  public headers?: Record<string, string>;
  public request?: ZephRequestConfig;
  public isZephHttpError: boolean = true;
  public cause?: unknown;
  public interceptorType?: "request" | "response";
  public interceptorIndex?: number;
  public code?: string;

  /**
   * Creates a new ZephHttpError.
   * @param {string} message - Error message.
   * @param {object} [options] - Additional error details.
   * @param {number} [options.status] - HTTP status code.
   * @param {T} [options.data] - Response data.
   * @param {Record<string, string>} [options.headers] - Response headers.
   * @param {ZephRequestConfig} [options.request] - The request config.
   * @param {unknown} [options.cause] - The original error.
   */
  constructor(
    message: string,
    options: {
      status?: number;
      data?: T;
      headers?: Record<string, string>;
      request?: ZephRequestConfig;
      cause?: unknown;
      interceptorType?: "request" | "response";
      interceptorIndex?: number;
      code?: string;
    } = {}
  ) {
    super(message);
    this.name = "ZephHttpError";
    Object.assign(this, options);
    if (options.interceptorType) this.interceptorType = options.interceptorType;
    if (options.interceptorIndex !== undefined)
      this.interceptorIndex = options.interceptorIndex;
    if (options.code) this.code = options.code;
  }
}
