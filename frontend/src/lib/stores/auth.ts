import { create } from "zustand";
import { api } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket-client";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  steamId?: string;
  discordTag?: string;
  isPrivate?: boolean;
  isAdmin?: boolean;
  emailNotifications?: boolean;
  notifFollow?: boolean;
  notifLike?: boolean;
  notifComment?: boolean;
  notifMention?: boolean;
}

interface AuthStore {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  loading: true,

  login: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem("token");
    disconnectSocket();
    set({ user: null, token: null });
  },

  init: async () => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!stored) {
      set({ loading: false });
      return;
    }
    try {
      const res = await api.get("/api/auth/me");
      set({ token: stored, user: res.data, loading: false });
    } catch {
      // Token expired or invalid — clear it so we don't keep retrying
      localStorage.removeItem("token");
      set({ user: null, token: null, loading: false });
    }
  },
}));
