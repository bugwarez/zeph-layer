import fetch from "cross-fetch";
import { createInterceptorManager, Interceptors } from "./core/interceptors";
import { ZephClientConfig } from "./core/types/client";
import {
  NormalizedZephRequestConfig,
  ZephRequestConfig,
  ZephResponse,
  ZephResponseType,
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
import type { ZodSchema } from "zod";

/**
 * Handler called when a request starts.
 * @param config The request configuration for the outgoing request.
 */
export type RequestStartHandler = (config: ZephRequestConfig) => void;

/**
 * Handler called when a request completes successfully.
 * @param response The response object.
 * @param config The request configuration for the completed request.
 */
export type RequestEndHandler = (
  response: ZephResponse<any>,
  config: ZephRequestConfig
) => void;

/**
 * Handler called when a request fails with an error.
 * @param error The error thrown (always ZephHttpError).
 * @param config The request configuration for the failed request.
 */
export type RequestErrorHandler = (
  error: ZephHttpError,
  config: ZephRequestConfig
) => void;

/**
 * Creates a new Zeph HTTP client instance.
 *
 * @param defaultConfig Default configuration for all requests from this client.
 * @returns A client instance with request, interceptors, cancellation, and lifecycle hooks.
 *
 * @example
 * const client = createZephClient({ baseURL: "https://api.example.com" });
 * const res = await client.request({ path: "/todos/1" });
 */
export function createZephClient(defaultConfig: ZephClientConfig = {}) {
  const interceptors: Interceptors = createInterceptorManager();

  // --- Lifecycle event handlers ---
  let onRequestStartHandlers: RequestStartHandler[] = [];
  let onRequestEndHandlers: RequestEndHandler[] = [];
  let onErrorHandlers: RequestErrorHandler[] = [];

  /**
   * Registers a handler to be called when any request starts.
   * @param fn The handler function.
   */
  function onRequestStart(fn: RequestStartHandler) {
    onRequestStartHandlers.push(fn);
  }
  /**
   * Registers a handler to be called when any request completes successfully.
   * @param fn The handler function.
   */
  function onRequestEnd(fn: RequestEndHandler) {
    onRequestEndHandlers.push(fn);
  }
  /**
   * Registers a handler to be called when any request fails with an error.
   * @param fn The handler function.
   */
  function onError(fn: RequestErrorHandler) {
    onErrorHandlers.push(fn);
  }

  /**
   * Tracks all in-flight AbortControllers for global cancellation.
   */
  const activeControllers = new Set<AbortController>();

  /**
   * Sends an HTTP request using the Zeph client configuration.
   * Handles per-request and global cancellation, timeout, interceptors, and retry logic.
   * Supports optional runtime response validation with Zod via responseSchema.
   * @template T - The expected response data type.
   * @param config The request configuration.
   * @returns The response promise.
   *
   * @example
   * import { z } from "zod";
   * const todoSchema = z.object({ id: z.number(), title: z.string() });
   * const res = await client.request({ path: "/todos/1", responseSchema: todoSchema });
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

    for (const handler of onRequestStartHandlers) {
      try {
        handler(config);
      } catch {}
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

        switch (finalConfig.responseType) {
          case "text":
            data = (await res.text()) as T;
            break;
          case "blob":
            data = (await res.blob()) as T;
            break;
          case "arrayBuffer":
            data = (await res.arrayBuffer()) as T;
            break;
          case "json":
          default:
            try {
              data = (await res.json()) as T;
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
            break;
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

        // Optional Zod validation of response
        if (config.responseSchema) {
          const result = (config.responseSchema as ZodSchema<any>).safeParse(
            response.data
          );
          if (!result.success) {
            throw new ZephHttpError("Response validation failed", {
              status: res.status,
              headers: resHeaders,
              request: finalConfig,
              data: result.error.issues,
              code: "EZODRESPONSE",
            });
          }
          // Use parsed data for type safety
          response.data = result.data;
        }

        //! Applying response success interceptors
        for (let i = 0; i < interceptors.response.handlers.length; i++) {
          const { onSuccess } = interceptors.response.handlers[i];
          try {
            response = await onSuccess(response);
          } catch (err) {
            throw wrapInterceptorError(err, "response", i);
          }
        }
        for (const handler of onRequestEndHandlers) {
          try {
            handler(response, finalConfig);
          } catch {}
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
          // Call onError for cancellation errors before throwing
          if (err instanceof ZephHttpError) {
            for (const handler of onErrorHandlers) {
              try {
                handler(err, finalConfig);
              } catch {}
            }
          }
          throw err;
        }
        if (
          err instanceof ZephHttpError &&
          err.status &&
          err.status >= 400 &&
          err.status < 500
        ) {
          // Call onError for 4xx errors before throwing
          for (const handler of onErrorHandlers) {
            try {
              handler(err, finalConfig);
            } catch {}
          }
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
          // Call onError for the final error after all retries
          if (err instanceof ZephHttpError) {
            for (const handler of onErrorHandlers) {
              try {
                handler(err, finalConfig);
              } catch {}
            }
          }
          throw err;
        }
      }
    }
    // Call onError for the last error if not already thrown
    if (lastError instanceof ZephHttpError) {
      for (const handler of onErrorHandlers) {
        try {
          handler(lastError, finalConfig);
        } catch {}
      }
    }
    throw lastError;
  }

  /**
   * Ergonomic per-request cancellation: returns a handle with promise, cancel, and signal.
   * @template T - The expected response data type.
   * @param config The request configuration.
   * @returns The handle for the request (promise, cancel, signal).
   *
   * @example
   * const { promise, cancel } = client.request.withCancel({ path: "/slow" });
   * cancel();
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
   *
   * @example
   * client.cancelAll();
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
    onRequestStart,
    onRequestEnd,
    onError,
  };
}

export { ZephHttpError } from "./core/types/error";
export { ZephResponseType } from "./core/types/http";
