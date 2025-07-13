import { ZephClientConfig } from "./client";

export type HTTPMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

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
}

export interface ZephResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface NormalizedZephRequestConfig
  extends Omit<ZephRequestConfig, "headers">,
    Omit<ZephClientConfig, "headers"> {
  headers: Record<string, string>;
  baseURL?: string;
  timeoutMs?: number;
  retry?: number;
  retryDelay?: number | ((attempt: number, error: any) => number);
}
