export function combineAbortSignals(
  signals: (AbortSignal | undefined)[]
): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const sig of signals) {
    if (!sig) continue;
    if (sig.aborted) {
      controller.abort();
      break;
    }
    sig.addEventListener("abort", onAbort);
  }
  return controller.signal;
}
