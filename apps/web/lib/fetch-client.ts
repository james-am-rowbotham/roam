// Custom fetcher injected into Orval's generated client. Prepends the API base
// URL and applies ISR caching (revalidate hourly) so generated calls made from
// Server Components are cached and trails refresh without a redeploy. Returns
// Orval's `{ data, status }` envelope.
const BASE_URL = process.env.ROAM_API_URL ?? 'http://localhost:3000';

export const fetchClient = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    next: { revalidate: 3600 },
  } as RequestInit);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { data, status: res.status } as T;
};
