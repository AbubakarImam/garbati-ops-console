import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { setUnauthorizedHandler } from "../api/client";
import { sessionApi } from "../api/endpoints";
import type { MeResponse } from "../api/types";

// DESIGN.md Section 4. This is the ONLY place `role` lives client-side (step 2) - every role-gated nav
// item/route reads from here, never from a locally-recomputed guess. Every full page load calls
// GET /v1/ops/me before rendering anything role-gated (step 3), because the session cookie is HttpOnly -
// this app's own JS cannot read it, so there is genuinely no other way to know who is logged in.

interface AuthState {
  user: MeResponse | null;
  // true only while the very first GET /v1/ops/me (on app load) is in flight - lets routes avoid
  // flashing "please log in" before that call has even come back once.
  isInitializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();

  // DESIGN.md Section 4 step 4: any 401 from any call, anywhere in the app, routes to Login through one
  // shared handler. AuthContext is the only thing allowed to register this (src/api/client.ts's own
  // comment) because it is also the only thing that owns `user` - clearing it here is what makes the
  // rest of the app (role-gated nav, route guards) immediately agree that nobody is logged in.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      navigate("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DESIGN.md Section 4 step 3: every full page load (first visit, refresh, a bookmarked URL) calls
  // GET /v1/ops/me before rendering anything role-gated. A failure here (missing/expired/revoked
  // session, or any other error reaching OpsApi) just means "not logged in" - no special-casing, the
  // user stays null and every route that requires a session sends them to Login.
  useEffect(() => {
    let cancelled = false;
    sessionApi
      .me()
      .then((me) => {
        if (!cancelled) {
          setUser(me);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsInitializing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isInitializing,
      async login(username, password) {
        // DESIGN.md Section 4 steps 1-2: POST /v1/ops/login sets the cookie server-side; this app never
        // touches it. Login itself already returns {staffId, fullName, role} (SessionController.Login),
        // so no separate GET /v1/ops/me round trip is needed right after logging in.
        const me = await sessionApi.login({ username, password });
        setUser(me);
      },
      async logout() {
        try {
          await sessionApi.logout();
        } finally {
          // Clear local state and route to Login even if the logout call itself fails (e.g. the session
          // was already gone) - there is nothing useful to retry here, and staying "logged in" on screen
          // after an explicit logout action would be the wrong failure mode.
          setUser(null);
          navigate("/login", { replace: true });
        }
      },
    }),
    [user, isInitializing, navigate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
