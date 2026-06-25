export const ignoredSentryErrors = [
  /^AbortError\b/i,
  "The operation was aborted",
  "The user aborted a request",
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications.",
];

export const deniedSentryUrls = [
  /^chrome:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-extension:\/\//i,
  /^webkit-masked-url:\/\//i,
  /extensions\//i,
];

export function scrubSentryEvent<T extends { request?: { url?: string } }>(
  event: T,
): T {
  if (!event.request?.url) {
    return event;
  }

  try {
    const url = new URL(event.request.url);
    event.request.url = `${url.origin}${url.pathname}`;
  } catch {
    event.request.url = event.request.url.split("?")[0] ?? event.request.url;
  }

  return event;
}
