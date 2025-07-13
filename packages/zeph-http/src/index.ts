import fetch from "cross-fetch";
import { createInterceptorManager, Interceptors } from "./core/interceptors";
import { ZephClientConfig } from "./core/types/client";
import {
  NormalizedZephRequestConfig,
  ZephRequestConfig,
  ZephResponse,
} from "./core/types/http";
import { combineAbortSignals } from "./core/utils/combineAbortSignals";
import { wrapInterceptorError } from "./core/utils/interceptorError";
import { appendQueryParams, joinUrl } from "./core/utils/url";
import { detectAndSetContentType, mergeHeaders } from "./core/utils/headers";
import { ZephHttpError } from "./core/types/error";
import { ZephRequestConfigSchema } from "./core/schemas/http";
import { formatZodIssues } from "./core/utils/zod";
import {
  guardBodyWithGetHead,
  warnDuplicateHeaders,
} from "./core/utils/guards";
import { createTimeoutSignal } from "./core/utils/timeout";
import { RequestWithCancelHandle } from "./core/types/common";

export function createZephClient(defaultConfig: ZephClientConfig = {}) {
  const interceptors: Interceptors = createInterceptorManager();

  /**
   * Tracks all in-flight AbortControllers for global cancellation.
   */
  const activeControllers = new Set<AbortController>();

  /**
   * Sends an HTTP request using the Zeph client configuration.
   * Handles per-request and global cancellation, timeout, and interceptors.
   * @template T - The expected response data type.
   * @param {ZephRequestConfig} config - The request configuration.
   * @returns {Promise<ZephResponse<T>>} - The response promise.
   */
  async function request<T = any>(
    config: ZephRequestConfig
  ): Promise<ZephResponse<T>> {
    const parseResult = ZephRequestConfigSchema.safeParse(config);
    if (!parseResult.success) {
      const formatted = formatZodIssues(parseResult.error.issues);
      throw new ZephHttpError(formatted, {
        request: config,
        data: parseResult.error.issues, //! raw issues for advanced use
        code: "EVALIDATION",
      });
    }
    //! Applying request interceptors
    let finalConfig: NormalizedZephRequestConfig = {
      ...defaultConfig,
      ...config,
      headers: { ...(defaultConfig.headers || {}), ...(config.headers || {}) },
    };
    for (let i = 0; i < interceptors.request.handlers.length; i++) {
      const handler = interceptors.request.handlers[i];
      try {
        finalConfig = await handler(finalConfig);
      } catch (err) {
        throw wrapInterceptorError(err, "request", i);
      }
    }

    const {
      baseURL = "",
      path,
      method = "GET",
      headers: callHeaders = {},
      params,
      body,
    } = finalConfig;

    //! Misuse guards
    guardBodyWithGetHead(method, body);
    warnDuplicateHeaders(defaultConfig.headers, callHeaders);

    //! Building URL
    let url = joinUrl(baseURL, path);
    url = appendQueryParams(url, params);

    //! Merging headers
    const headers = mergeHeaders(defaultConfig.headers, callHeaders);

    detectAndSetContentType(headers, body);

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

    // --- Cancellation & Timeout Handling ---
    const internalController = new AbortController();
    let timeoutSignal: AbortSignal | undefined = undefined;
    let timeoutCancel: (() => void) | undefined = undefined;
    if (finalConfig.timeoutMs) {
      const timeout = createTimeoutSignal(finalConfig.timeoutMs);
      timeoutSignal = timeout.signal;
      timeoutCancel = timeout.cancel;
    }
    // Combine user signal, timeout signal, and internal controller
    const signal = combineAbortSignals([
      finalConfig.signal,
      timeoutSignal,
      internalController.signal,
    ]);
    // Track this controller for global cancel
    activeControllers.add(internalController);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: payload,
        signal,
      });

      if (timeoutCancel) timeoutCancel();

      let data: T | undefined;
      const resHeaders: Record<string, string> = {};

      try {
        data = await res.json();
      } catch (jsonErr) {
        let rawText: string | undefined;
        try {
          rawText = await res.text();
        } catch {
          rawText = undefined;
        }
        throw new ZephHttpError("Failed to parse JSON response", {
          status: res.status,
          headers: resHeaders,
          request: finalConfig,
          data: rawText,
          cause: jsonErr,
          code: "EJSONPARSE",
        });
      }

      res.headers.forEach((v, k) => (resHeaders[k] = v));

      if (!res.ok) {
        throw new ZephHttpError("HTTP Error", {
          status: res.status,
          data,
          headers: resHeaders,
          request: finalConfig,
          code: "EHTTP",
        });
      }

      let response: ZephResponse<T> = {
        data: data as T,
        status: res.status,
        headers: resHeaders,
      };

      //! Applying response success interceptors
      for (let i = 0; i < interceptors.response.handlers.length; i++) {
        const { onSuccess } = interceptors.response.handlers[i];
        try {
          response = await onSuccess(response);
        } catch (err) {
          throw wrapInterceptorError(err, "response", i);
        }
      }

      return response;
    } catch (err: any) {
      if (timeoutCancel) timeoutCancel();

      if (err?.name === "AbortError") {
        if (
          finalConfig.timeoutMs &&
          signal &&
          signal.aborted &&
          finalConfig.signal &&
          finalConfig.signal.aborted
        ) {
          // Both signals aborted, prefer timeout message
          throw new ZephHttpError(
            `Request timed out after ${finalConfig.timeoutMs} ms`,
            {
              request: finalConfig,
              cause: err,
              code: "ETIMEDOUT",
            }
          );
        } else if (finalConfig.signal && finalConfig.signal.aborted) {
          throw new ZephHttpError("Request was cancelled by the user.", {
            request: finalConfig,
            cause: err,
            code: "ECANCELLED",
          });
        } else if (finalConfig.timeoutMs) {
          throw new ZephHttpError(
            `Request timed out after ${finalConfig.timeoutMs} ms`,
            {
              request: finalConfig,
              cause: err,
              code: "ETIMEDOUT",
            }
          );
        }
      }
      // Apply error interceptors
      for (const { onError } of interceptors.response.handlers) {
        if (onError) await onError(err);
      }
      if (err instanceof ZephHttpError) {
        throw err;
      }
      throw new ZephHttpError("Network or Client Error", {
        cause: err,
        request: finalConfig,
        code: "ENETWORK",
      });
    } finally {
      // Always clean up controller from the set
      activeControllers.delete(internalController);
    }
  }

  /**
   * Ergonomic per-request cancellation: returns a handle with promise, cancel, and signal.
   * @template T - The expected response data type.
   * @param {ZephRequestConfig} config - The request configuration.
   * @returns {RequestWithCancelHandle<T>} - The handle for the request.
   */
  request.withCancel = function withCancel<T = any>(
    config: ZephRequestConfig
  ): RequestWithCancelHandle<T> {
    const controller = new AbortController();
    const mergedConfig = { ...config, signal: controller.signal };
    return {
      promise: request<T>(mergedConfig),
      cancel: () => controller.abort(),
      signal: controller.signal,
    };
  };

  /**
   * Cancels all in-flight requests for this client instance.
   * Aborts all tracked AbortControllers and clears the set.
   */
  function cancelAll(): void {
    for (const controller of activeControllers) {
      controller.abort();
    }
    activeControllers.clear();
  }

  return {
    request,
    interceptors,
    cancelAll,
  };
}

export { ZephHttpError } from "./core/types/error";
