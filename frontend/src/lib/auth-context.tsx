"use client";

// Thin re-export — keeps all existing `useAuth()` call sites unchanged.
// Auth state now lives in useAuthStore (Zustand) instead of React Context.
export { useAuthStore as useAuth, type AuthUser as User } from "@/lib/stores/auth";
export { useAuthStore } from "@/lib/stores/auth";
