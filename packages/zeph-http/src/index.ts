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
   * Handles per-request and global cancellation, timeout, interceptors, and retry logic.
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

    // --- Retry Logic ---
    const maxRetries = finalConfig.retry ?? 0;
    const retryDelay = finalConfig.retryDelay;
    let attempt = 0;
    let lastError: any;
    while (attempt <= maxRetries) {
      // --- Per-attempt signal setup ---
      // Always create a new internal controller for tracking per attempt
      const internalController = new AbortController();
      let timeoutSignal: AbortSignal | undefined = undefined;
      let timeoutCancel: (() => void) | undefined = undefined;
      if (finalConfig.timeoutMs) {
        const timeout = createTimeoutSignal(finalConfig.timeoutMs);
        timeoutSignal = timeout.signal;
        timeoutCancel = timeout.cancel;
      }
      // Combine user signal, timeout signal, and internal controller
      const combinedSignal = combineAbortSignals([
        finalConfig.signal,
        timeoutSignal,
        internalController.signal,
      ]);
      // Track this controller for global cancel
      activeControllers.add(internalController);

      // Checking for abort before each attempt
      if (combinedSignal && combinedSignal.aborted) {
        activeControllers.delete(internalController);
        throw new ZephHttpError("Request was cancelled by the user.", {
          request: finalConfig,
          code: "ECANCELLED",
        });
      }
      try {
        const res = await fetch(url, {
          method,
          headers,
          body: payload,
          signal: combinedSignal,
        });

        if (timeoutCancel) timeoutCancel();
        activeControllers.delete(internalController);

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
        activeControllers.delete(internalController);
        if (err?.name === "AbortError") {
          if (finalConfig.timeoutMs && timeoutSignal && timeoutSignal.aborted) {
            err = new ZephHttpError(
              `Request timed out after ${finalConfig.timeoutMs} ms`,
              {
                request: finalConfig,
                cause: err,
                code: "ETIMEDOUT",
              }
            );
          } else if (combinedSignal && combinedSignal.aborted) {
            err = new ZephHttpError("Request was cancelled by the user.", {
              request: finalConfig,
              cause: err,
              code: "ECANCELLED",
            });
          }
        }
        lastError = err;
        if (err?.code === "ECANCELLED") {
          throw err;
        }
        if (
          err instanceof ZephHttpError &&
          err.status &&
          err.status >= 400 &&
          err.status < 500
        ) {
          throw err;
        }
        if (attempt < maxRetries) {
          let delayMs = 0;
          if (typeof retryDelay === "function") {
            delayMs = retryDelay(attempt + 1, err);
          } else if (typeof retryDelay === "number") {
            delayMs = retryDelay;
          } else {
            delayMs = 0;
          }
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
          attempt++;
          continue;
        } else {
          throw err;
        }
      }
    }
    throw lastError;
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
