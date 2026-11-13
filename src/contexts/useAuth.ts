import { createContext, useContext } from "react";
import type { RouterOutputs } from "../backendRouter";

type Account = RouterOutputs["auth"]["me"];

// The player's login, provided by AuthProvider (AuthContext.tsx).
export type AuthContextValue = {
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

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}
