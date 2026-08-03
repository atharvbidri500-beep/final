import { setBaseUrl } from "@workspace/api-client-react";

export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function initApiBase(): void {
  setBaseUrl(API_BASE || null);
}
