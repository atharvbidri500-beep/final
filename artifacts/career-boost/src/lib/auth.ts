import { setAuthTokenGetter } from "@workspace/api-client-react";
import { initApiBase } from "./api";

export const TOKEN_KEY = "careerBoostToken";
export const ADMIN_TOKEN_KEY = "adminBoostAdminToken";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// Initialize the API client auth token getter
export function setupAuth() {
  initApiBase();
  setAuthTokenGetter(() => {
    // If we're on the admin page, use admin token
    if (window.location.pathname.startsWith("/admin")) {
      return getAdminToken();
    }
    return getToken();
  });
}
