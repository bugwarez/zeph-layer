import { ZephClientConfig } from "./client";
import type { ZodSchema } from "zod";

/**
 * Supported HTTP methods for Zeph requests.
 */
export type HTTPMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

/**
 * Supported response types for Zeph requests.
 * - "json" (default): Parse response as JSON.
 * - "text": Parse response as plain text.
 * - "blob": Parse response as Blob (browser only).
 * - "arrayBuffer": Parse response as ArrayBuffer (binary data).
 */
export type ZephResponseType = "json" | "text" | "blob" | "arrayBuffer";

/**
 * Configuration for a Zeph HTTP request.
 *
 * @property path The endpoint path (required).
 * @property method HTTP method (default: GET).
 * @property headers Optional headers.
 * @property params Optional query parameters.
 * @property body Optional request body.
 * @property timeoutMs Optional timeout in milliseconds.
 * @property signal Optional AbortSignal for cancellation.
 * @property retry Number of retry attempts for failed requests (default: 0).
 * @property retryDelay Delay between retries (ms) or function for custom logic.
 * @property responseType How to parse the response (default: "json").
 * @property baseURL Optional base URL (overrides client default).
 * @property responseSchema Optional Zod schema to validate the response data at runtime.
 */
export interface ZephRequestConfig {
  path: string;
  method?: HTTPMethod;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  timeoutMs?: number;
  signal?: AbortSignal; //! User-initiated cancellation
  /**
   * Number of retry attempts for failed requests (default: 0)
   */
  retry?: number;
  /**
   * Delay between retries in ms, or a function (attempt, error) => ms
   */
  retryDelay?: number | ((attempt: number, error: any) => number);
  responseType?: ZephResponseType;
  baseURL?: string;
  /**
   * Optional Zod schema to validate the response data at runtime.
   * If provided, the response will be validated and a ZephHttpError will be thrown on validation failure.
   */
  responseSchema?: ZodSchema<any>;
}

/**
 * The HTTP response returned by Zeph.
 * @template T The type of the response data.
 */
export interface ZephResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * Internal: Normalized request config used after merging client and per-request options.
 * Not typically needed by end users.
 */
export interface NormalizedZephRequestConfig
  extends Omit<ZephRequestConfig, "headers">,
    Omit<ZephClientConfig, "headers"> {
  headers: Record<string, string>;
  baseURL?: string;
  timeoutMs?: number;
  retry?: number;
  retryDelay?: number | ((attempt: number, error: any) => number);
  responseType?: ZephResponseType;
}
