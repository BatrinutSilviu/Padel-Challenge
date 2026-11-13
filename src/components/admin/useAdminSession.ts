import { useEffect, useRef, useState } from "react";

// The admin's login, kept in localStorage. When a request finds the session expired
// (main.tsx sends 'admin-session-expired'), the page asks to log in again and retries the
// failed requests once the admin has.
export function useAdminSession() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"));
    const [sessionExpired, setSessionExpired] = useState(false);
    const pendingRetriesRef = useRef<(() => void)[]>([]);

    function handleLogin(t: string) {
        localStorage.setItem("admin_token", t);
        setToken(t);
        setSessionExpired(false);
        const retries = pendingRetriesRef.current;
        pendingRetriesRef.current = [];
        retries.forEach(retry => retry());
    }

    function handleLogout() {
        localStorage.removeItem("admin_token");
        setToken(null);
        setSessionExpired(false);
    }

    useEffect(() => {
        function onExpired(e: Event) {
            const retry = (e as CustomEvent).detail?.retry;
            if (retry) pendingRetriesRef.current.push(retry);
            setSessionExpired(true);
        }
        window.addEventListener('admin-session-expired', onExpired);
        return () => window.removeEventListener('admin-session-expired', onExpired);
    }, []);

    return { token, sessionExpired, handleLogin, handleLogout };
}
