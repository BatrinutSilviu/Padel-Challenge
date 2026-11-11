import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { NavBar } from "../NavBar";
import { AccountStatusNotice } from "./AccountStatus";

// Pages for logged-in players. An account that doesn't play as a player yet (its profile
// claim waits for an admin, or was rejected) sees why instead — unless the page is about
// sorting that out (requirePlayer false).
export function RequireAuth({ children, requirePlayer = true }: { children: ReactNode; requirePlayer?: boolean }) {
    const { token, account } = useAuth();
    const location = useLocation();

    if (!token) {
        return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }
    if (requirePlayer && account && !account.playerId) {
        return (
            <div className="min-h-screen bg-[#F5F5F7]">
                <NavBar />
                <main className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                    <AccountStatusNotice />
                </main>
            </div>
        );
    }
    return <>{children}</>;
}
