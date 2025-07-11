import {
  ErrorInterceptor,
  RequestInterceptor,
  ResponseInterceptor,
} from "./types";

export interface Interceptors {
  request: {
    handlers: RequestInterceptor[];
    use: (fn: RequestInterceptor) => void;
  };
  response: {
    handlers: Array<{
      onSuccess: ResponseInterceptor;
      onError?: ErrorInterceptor;
    }>;
    use: (onSuccess: ResponseInterceptor, onError?: ErrorInterceptor) => void;
  };
}

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
