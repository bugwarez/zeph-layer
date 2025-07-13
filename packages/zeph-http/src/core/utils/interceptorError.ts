import { ZephHttpError } from "../types/error";

export function wrapInterceptorError(
  err: unknown,
  interceptorType: "request" | "response",
  index: number
): ZephHttpError {
  console.log("wrapInterceptorError", interceptorType, index, err);
  if (err instanceof ZephHttpError) {
    err.interceptorType = interceptorType;
    err.interceptorIndex = index;
    err.message = `[${interceptorType} interceptor #${index}] ${err.message}`;
    return err;
  }
  const error = new ZephHttpError(
    `[${interceptorType} interceptor #${index}] ${
      err instanceof Error ? err.message : String(err)
    }`,
    {
      cause: err,
    }
  );
  error.interceptorType = interceptorType;
  error.interceptorIndex = index;
  return error;
}
