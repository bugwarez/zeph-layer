import { NormalizedZephRequestConfig } from "../types/http";

export type RequestInterceptor = (
  config: NormalizedZephRequestConfig
) => NormalizedZephRequestConfig | Promise<NormalizedZephRequestConfig>;
export type ResponseInterceptor<T = any> = (response: T) => T | Promise<T>;
export type ErrorInterceptor = (error: any) => any;
