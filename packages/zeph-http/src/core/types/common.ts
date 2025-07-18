import { ZephResponse } from "./http";

/**
 * Handle returned by request.withCancel for ergonomic per-request cancellation.
 *
 * @template T The type of the response data.
 * @property promise The promise for the HTTP response.
 * @property cancel Cancels the request.
 * @property signal The AbortSignal used for this request.
 */
export interface RequestWithCancelHandle<T = any> {
  /** The promise for the HTTP response. */
  promise: Promise<ZephResponse<T>>;
  /** Cancels the request. */
  cancel: () => void;
  /** The AbortSignal used for this request. */
  signal: AbortSignal;
}
