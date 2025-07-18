import {
  ErrorInterceptor,
  RequestInterceptor,
  ResponseInterceptor,
} from "./types";

/**
 * Collection of request and response interceptors for a Zeph client instance.
 */
export interface Interceptors {
  request: {
    handlers: RequestInterceptor[];
    /**
     * Register a new request interceptor.
     * @param fn The interceptor function.
     */
    use: (fn: RequestInterceptor) => void;
  };
  response: {
    handlers: Array<{
      onSuccess: ResponseInterceptor;
      onError?: ErrorInterceptor;
    }>;
    /**
     * Register a new response interceptor.
     * @param onSuccess The success handler.
     * @param onError Optional error handler.
     */
    use: (onSuccess: ResponseInterceptor, onError?: ErrorInterceptor) => void;
  };
}

/**
 * Creates a new interceptor manager for a Zeph client instance.
 * @returns An Interceptors object for managing request/response hooks.
 */
export function createInterceptorManager(): Interceptors {
  return {
    request: {
      handlers: [],
      use(fn) {
        this.handlers.push(fn);
      },
    },
    response: {
      handlers: [],
      use(onSuccess, onError) {
        this.handlers.push({ onSuccess, onError });
      },
    },
  };
}
