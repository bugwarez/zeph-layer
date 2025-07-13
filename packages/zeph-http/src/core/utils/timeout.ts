export function createTimeoutSignal(timeoutMs?: number): {
  signal?: AbortSignal;
  cancel?: () => void;
  timer?: NodeJS.Timeout;
} {
  if (!timeoutMs) return {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
    timer,
  };
}
