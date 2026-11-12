import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "@/services/auth.service";
import { readSession, UNAUTHORIZED_EVENT, writeSession } from "@/services/session";
import type { AuthSession, Role } from "@/types";

export const ROLE_HOME: Record<Role, "/admin" | "/cashier" | "/finance" | "/guest"> = {
  admin: "/admin",
  cashier: "/cashier",
  finance: "/finance",
  guest: "/guest",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "System Administrator",
  cashier: "Cashier",
  finance: "Finance Manager",
  guest: "Guest",
};

interface AuthContextValue {
  session: AuthSession | null;
  hydrated: boolean;
  login: (username: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setHydrated(true);
    const onUnauthorized = () => {
      setSession(null);
      queryClient.clear();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.includes("session")) setSession(readSession());
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener("storage", onStorage);
    };
  }, [queryClient]);

  const login = useCallback(
    async (username: string, password: string) => {
      const s = await authService.login(username, password);
      writeSession(s);
      queryClient.clear();
      setSession(s);
      return s;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* session may already be gone */
    }
    writeSession(null);
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(() => ({ session, hydrated, login, logout }), [session, hydrated, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
