/**
 * Builders for fetch-`Response`-shaped objects, for use with mocked `apiFetch`.
 * Only the subset of the Response interface the components actually touch
 * (`ok`, `status`, `json`, `text`) is implemented.
 */
export function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

export function textResponse(text: string, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 500);
  return {
    ok,
    status,
    json: async () => { throw new Error('not json'); },
    text: async () => text,
  } as unknown as Response;
}
