import type { ZephRequestConfig } from "./http";

/**
 * Custom error class for Zeph HTTP client.
 *
 * Thrown for all errors in zeph-http, including network errors, timeouts, HTTP errors, validation errors, and interceptor errors.
 *
 * @template T The type of the response data (if any).
 * @property status HTTP status code, if available.
 * @property data Response data, if available.
 * @property headers Response headers, if available.
 * @property request The request config that caused the error.
 * @property isZephHttpError Always true for this error type.
 * @property cause The original error, if any.
 * @property interceptorType If error was thrown in an interceptor, which type ("request" or "response").
 * @property interceptorIndex Index of the interceptor that threw the error.
 * @property code Error code for programmatic handling (e.g., "EHTTP", "EJSONPARSE").
 *
 * @example
 * try {
 *   await client.request({ path: "/api/data" });
 * } catch (error) {
 *   if (error instanceof ZephHttpError) {
 *     console.error(error.status, error.message, error.code);
 *   }
 * }
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
   * @param message Error message.
   * @param options Additional error details.
   * @param options.status HTTP status code.
   * @param options.data Response data.
   * @param options.headers Response headers.
   * @param options.request The request config.
   * @param options.cause The original error.
   * @param options.interceptorType If error was thrown in an interceptor, which type.
   * @param options.interceptorIndex Index of the interceptor that threw the error.
   * @param options.code Error code for programmatic handling.
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

  /**
   * Serializes the error to a plain object for logging or transport.
   * @returns A JSON-serializable representation of the error.
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      data: this.data,
      headers: this.headers,
      request: this.request,
      cause: this.cause,
      interceptorType: this.interceptorType,
      interceptorIndex: this.interceptorIndex,
      isZephHttpError: this.isZephHttpError,
      stack: this.stack,
    };
  }
}
