// Custom fetcher injected by Orval — prepends the API base URL.
// Returns { data, status, headers } to match Orval's response envelope type.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const fetchClient = async <T>(url: string, options: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${url}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${url}: ${text}`);
  }
  const data = await res.json();
  return { data, status: res.status, headers: res.headers } as T;
};
