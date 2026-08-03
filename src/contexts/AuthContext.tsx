import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const STORAGE_KEY = "user_token";

type UserPayload = { userId: string; playerId: string };

type AuthState = {
    token: string | null;
    userId: string | null;
    playerId: string | null;
};

type AuthContextValue = AuthState & {
    login: (token: string) => void;
    logout: () => void;
};

function decodeUserToken(token: string): UserPayload | null {
    try {
        const payloadJson = atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadJson);
        if (typeof payload.userId === "string" && typeof payload.playerId === "string") {
            return { userId: payload.userId, playerId: payload.playerId };
        }
        return null;
    } catch {
        return null;
    }
}

function readState(): AuthState {
    const token = localStorage.getItem(STORAGE_KEY);
    const payload = token ? decodeUserToken(token) : null;
    if (!token || !payload) return { token: null, userId: null, playerId: null };
    return { token, userId: payload.userId, playerId: payload.playerId };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>(readState);

    const login = useCallback((token: string) => {
        localStorage.setItem(STORAGE_KEY, token);
        const payload = decodeUserToken(token);
        setState({ token, userId: payload?.userId ?? null, playerId: payload?.playerId ?? null });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState({ token: null, userId: null, playerId: null });
    }, []);

    return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
