import { NormalizedZephRequestConfig } from "../types/http";

/**
 * Function signature for a request interceptor.
 * Allows modifying or replacing the outgoing request config.
 * @param config The normalized request config.
 * @returns The (possibly modified) config or a Promise thereof.
 */
export type RequestInterceptor = (
  config: NormalizedZephRequestConfig
) => NormalizedZephRequestConfig | Promise<NormalizedZephRequestConfig>;

/**
 * Function signature for a response interceptor.
 * Allows transforming or replacing the response data.
 * @template T The type of the response data.
 * @param response The response data.
 * @returns The (possibly modified) response or a Promise thereof.
 */
export type ResponseInterceptor<T = any> = (response: T) => T | Promise<T>;

/**
 * Function signature for an error interceptor.
 * Allows handling or transforming errors from response interceptors.
 * @param error The error thrown.
 * @returns The (possibly modified) error or a Promise thereof.
 */
export type ErrorInterceptor = (error: any) => any;
