const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await res.json() as { success: boolean; data?: T; error?: { code: string; message: string } };

  if (!json.success) {
    throw new Error(json.error?.message ?? 'API error');
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
};
