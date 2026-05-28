import axios from "axios";
import { dispatchToast } from "./toast";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window === "undefined") return Promise.reject(err);

    // Callers can opt out of the global error toast by passing { silentOnError: true }
    if ((err.config as any)?.silentOnError) return Promise.reject(err);

    const status = err.response?.status;
    const message: string =
      err.response?.data?.error ??
      err.response?.data?.message ??
      (status ? `Request failed (${status})` : "Network error — is the server running?");

    if (status === 401) {
      // Lazy import to avoid circular dependency (api ← auth store ← api)
      import("@/lib/stores/auth").then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
      dispatchToast("Session expired. Please log in again.", "error");
    } else {
      dispatchToast(message, "error");
    }

    return Promise.reject(err);
  }
);
