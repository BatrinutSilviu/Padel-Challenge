import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../trpc";
import type { RouterOutputs } from "../backendRouter";

const STORAGE_KEY = "user_token";

// The token's playerId is only a hint for the first render: an account's player can
// change while its token stays the same (an admin approves its profile claim), so the
// real one comes from auth.me.
type UserPayload = { userId: string; playerId: string | null };

type AuthState = {
    token: string | null;
    userId: string | null;
    tokenPlayerId: string | null;
};

type Account = RouterOutputs["auth"]["me"];

type AuthContextValue = {
    token: string | null;
    userId: string | null;
    // The player this account plays as — null when logged out, or while its profile claim
    // waits for an admin (or was rejected): see `account.claim`.
    playerId: string | null;
    // The logged-in account, once loaded.
    account: Account | null;
    login: (token: string) => void;
    logout: () => void;
};

function decodeUserToken(token: string): UserPayload | null {
    try {
        const payloadJson = atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        if (typeof payload.userId === "string") {
            return { userId: payload.userId, playerId: typeof payload.playerId === "string" ? payload.playerId : null };
        }
        return null;
    } catch {
        return null;
    }
}

const LOGGED_OUT: AuthState = { token: null, userId: null, tokenPlayerId: null };

function stateFor(token: string | null): AuthState {
    const payload = token ? decodeUserToken(token) : null;
    if (!token || !payload) return LOGGED_OUT;
    return { token, userId: payload.userId, tokenPlayerId: payload.playerId };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const qc = useQueryClient();
    const [state, setState] = useState<AuthState>(() => stateFor(localStorage.getItem(STORAGE_KEY)));

    const me = trpc.auth.me.useQuery(undefined, {
        enabled: !!state.token,
        retry: false,
        // While a claim waits for an admin, check now and then so the approval shows up.
        refetchInterval: query => (query.state.data && !query.state.data.playerId ? 60_000 : false),
    });

    const login = useCallback((token: string) => {
        localStorage.setItem(STORAGE_KEY, token);
        setState(stateFor(token));
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.auth.me) });
    }, [qc]);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState(LOGGED_OUT);
        qc.removeQueries({ queryKey: getQueryKey(trpc.auth.me) });
    }, [qc]);

    // The account is gone (or the token expired): log out.
    const meError = me.error?.data?.code;
    useEffect(() => {
        if (meError === "UNAUTHORIZED" && state.token) logout();
    }, [meError, state.token, logout]);

    // A user-scoped request came back unauthorized (see main.tsx), which already dropped the token.
    useEffect(() => {
        const onExpired = () => { if (!localStorage.getItem(STORAGE_KEY)) logout(); };
        window.addEventListener("user-session-expired", onExpired);
        return () => window.removeEventListener("user-session-expired", onExpired);
    }, [logout]);

    const account = state.token && me.data ? me.data : null;
    const value: AuthContextValue = {
        token: state.token,
        userId: state.userId,
        playerId: account ? account.playerId : state.tokenPlayerId,
        account,
        login,
        logout,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
