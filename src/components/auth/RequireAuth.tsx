import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
    const { token } = useAuth();
    const location = useLocation();

    if (!token) {
        return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }
    return <>{children}</>;
}
