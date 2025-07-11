import fetch from "cross-fetch";
import { createInterceptorManager, Interceptors } from "./core/interceptors";

export interface ZephClientConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}
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
}

export function createZephClient(defaultConfig: ZephClientConfig = {}) {
  const interceptors: Interceptors = createInterceptorManager();

  async function request<T = any>(
    config: ZephRequestConfig
  ): Promise<ZephResponse<T>> {
    //! Applying request interceptors
    let finalConfig: NormalizedZephRequestConfig = {
      ...defaultConfig,
      ...config,
      headers: { ...(defaultConfig.headers || {}), ...(config.headers || {}) },
    };
    for (const handler of interceptors.request.handlers) {
      finalConfig = await handler(finalConfig);
    }

    const {
      baseURL = "",
      path,
      method = "GET",
      headers: callHeaders = {},
      params,
      body,
    } = finalConfig;

    //! Building URL
    const root = baseURL.replace(/\/$/, "");
    const suffix = path.startsWith("/") ? path : `/${path}`;
    let url = root + suffix;
    if (params) {
      const query = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString();
      url += (url.includes("?") ? "&" : "?") + query;
    }

    //! Merging headers
    const defaultHeaders = defaultConfig.headers || {};
    const headers = {
      ...defaultHeaders,
      ...callHeaders,
    };

    if (!headers["Content-Type"] && body != null) {
      if (body instanceof FormData) {
      } else if (body instanceof Blob) {
        headers["Content-Type"] = body.type || "application/octet-stream";
      } else if (typeof body === "string") {
        headers["Content-Type"] = "text/plain";
      } else if (typeof body === "object") {
        headers["Content-Type"] = "application/json";
      }
    }

    //! Handling body
    let payload: BodyInit | undefined;
    if (body != null) {
      if (
        typeof body === "object" &&
        !(body instanceof FormData) &&
        !(body instanceof Blob)
      ) {
        payload = JSON.stringify(body);
      } else {
        payload = body;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: payload,
      });

      const data: T = await res.json();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => (resHeaders[k] = v));

      let response: ZephResponse<T> = {
        data,
        status: res.status,
        headers: resHeaders,
      };

      //! Applying response success interceptors
      for (const { onSuccess } of interceptors.response.handlers) {
        response = await onSuccess(response);
      }

      return response;
    } catch (err) {
      //! Applying error interceptors
      for (const { onError } of interceptors.response.handlers) {
        if (onError) await onError(err);
      }
      throw err;
    }
  }

  return {
    request,
    interceptors,
  };
}
