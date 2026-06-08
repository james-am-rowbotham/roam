// Custom fetcher injected by Orval — prepends the API base URL.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const fetchClient = async <T>(url: string, options: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${url}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${url}: ${text}`);
  }
  return res.json() as T;
};
