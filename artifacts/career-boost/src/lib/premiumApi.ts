import { getToken } from "./auth";
import { apiUrl } from "./api";

export interface ApiError {
  status: number;
  error: string;
  message?: string;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err: ApiError = { status: res.status, error: data?.error ?? "Request failed", message: data?.message };
    throw err;
  }
  return data as T;
}

export function isUpgradeError(err: unknown): boolean {
  return (err as ApiError)?.status === 402;
}
