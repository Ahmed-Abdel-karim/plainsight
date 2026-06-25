/**
 * The one fetch helper every query descriptor shares: GET a URL, fail loudly on a
 * non-2xx, parse the body as JSON. `signal` is threaded straight through so
 * TanStack Query can abort an in-flight request via `cancelQueries`. Centralising
 * the HTTP/JSON contract here keeps each `queryFn` to just its url + result type.
 */
export async function fetchJson<T>(
  url: string,
  init?: { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
