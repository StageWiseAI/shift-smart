import { QueryClient } from "@tanstack/react-query";

// Detect if running deployed (port proxy) or local
const API_BASE = (window as any).__PORT_5000__
  ? (window as any).__PORT_5000__
  : "";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// Global user header injector — set this when user logs in
let _userId: string | null = null;
export function setAuthUserId(id: string | null) { _userId = id; }
export function getAuthUserId() { return _userId; }

export async function apiRequest(
  method: string,
  path: string,
  body?: any,
  extraHeaders?: Record<string, string>
) {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {
    // Don't set Content-Type for FormData — browser sets it with boundary automatically
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(extraHeaders ?? {}),
  };
  if (_userId) headers["x-user-id"] = _userId;

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Default queryFn
queryClient.setDefaultOptions({
  queries: {
    queryFn: async ({ queryKey }) => {
      const [path] = queryKey as string[];
      const url = `${API_BASE}${path}`;
      const headers: Record<string, string> = {};
      if (_userId) headers["x-user-id"] = _userId;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
  },
});

export { API_BASE };
