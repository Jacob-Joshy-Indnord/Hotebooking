/**
 * File: web/src/components/AuthProvider.tsx
 *
 * Client-side session context for the RoomBook UI. On mount it reads the API
 * key and the cached role from sessionStorage, then marks itself `ready` so
 * protected pages don't redirect before the session has loaded. It registers
 * the API client's unauthenticated handler: any 401 drops the in-memory
 * session and sends the user to /sign-in?reason=unauthenticated, where a
 * message explains the key is missing or invalid. The role it exposes drives
 * the admin-only navigation and report guard (task-xR5tK2uAzH2).
 *
 * Exports: AuthProvider (the context provider component) and useAuth(), which
 * returns { ready, apiKey, role, signIn(key, role), signOut() }. signIn
 * persists the session and signOut removes it, then returns to sign-in.
 */
"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setUnauthenticatedHandler } from "@/lib/api";
import { clearSession, getApiKey, getRole, saveSession, type Role } from "@/lib/session";

interface AuthState {
  ready: boolean;
  apiKey: string | null;
  role: Role | null;
  signIn: (apiKey: string, role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    setApiKey(getApiKey());
    setRole(getRole());
    setReady(true);
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setApiKey(null);
      setRole(null);
      router.replace("/sign-in?reason=unauthenticated");
    });
    return () => setUnauthenticatedHandler(null);
  }, [router]);

  const signIn = useCallback((key: string, nextRole: Role) => {
    saveSession(key, nextRole);
    setApiKey(key);
    setRole(nextRole);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setApiKey(null);
    setRole(null);
    router.replace("/sign-in?reason=signed-out");
  }, [router]);

  const value = useMemo(
    () => ({ ready, apiKey, role, signIn, signOut }),
    [ready, apiKey, role, signIn, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
