import { ZephResponse } from "./http";

/**
 * Handle returned by request.withCancel for ergonomic per-request cancellation.
 */
export interface RequestWithCancelHandle<T = any> {
  /** The promise for the HTTP response. */
  promise: Promise<ZephResponse<T>>;
  /** Cancels the request. */
  cancel: () => void;
  /** The AbortSignal used for this request. */
  signal: AbortSignal;
}
