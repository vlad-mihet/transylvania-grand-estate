const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333/api/v1";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export async function fetchApi<T>(
  path: string,
  options?: { revalidate?: number }
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: options?.revalidate ?? 60 },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json: ApiResponse<T> = await res.json();
  return json.data;
}

export async function mutateApi<T>(
  path: string,
  options: { method?: "POST" | "PATCH" | "DELETE"; body?: unknown } = {}
): Promise<T> {
  const { method = "POST", body } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.message || `API error: ${res.status}`);
  }
  const json: ApiResponse<T> = await res.json();
  return json.data;
}
