import { useState, useEffect } from "react";
import { NavBar } from "../NavBar";
import { AdminDashboard } from "./AdminDashboard";
import { trpc } from "../../trpc";

export function AdminPage() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("admin_token"));
    const [sessionExpired, setSessionExpired] = useState(false);

    function handleLogin(t: string) {
        localStorage.setItem("admin_token", t);
        setToken(t);
        setSessionExpired(false);
    }

    function handleLogout() {
        localStorage.removeItem("admin_token");
        setToken(null);
        setSessionExpired(false);
    }

    useEffect(() => {
        function onExpired() {
            setSessionExpired(true);
        }
        window.addEventListener('admin-session-expired', onExpired);
        return () => window.removeEventListener('admin-session-expired', onExpired);
    }, []);

    if (!token && !sessionExpired) return <LoginPage onLogin={handleLogin} />;

    return (
        <>
            <AdminDashboard onLogout={handleLogout} />
            {sessionExpired && <SessionExpiredModal onLogin={handleLogin} />}
        </>
    );
}

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const login = trpc.auth.login.useMutation({
        onSuccess: (data) => onLogin(data.token),
        onError: () => setError("Invalid password"),
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        login.mutate({ password });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm space-y-4 shadow-sm"
                >
                    <h1 className="text-xl font-bold text-gray-800">Admin Login</h1>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            placeholder="Enter admin password"
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                        type="submit"
                        disabled={login.isPending}
                        className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                    >
                        {login.isPending ? "Logging in…" : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function SessionExpiredModal({ onLogin }: { onLogin: (token: string) => void }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const login = trpc.auth.login.useMutation({
        onSuccess: (data) => onLogin(data.token),
        onError: () => setError("Invalid password"),
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        login.mutate({ password });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <form
                onSubmit={handleSubmit}
                className="relative bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm space-y-4 shadow-xl"
            >
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Session expired</h2>
                    <p className="text-sm text-gray-500 mt-1">Log in again to continue — your work is still here.</p>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                        placeholder="Enter admin password"
                        autoFocus
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                    type="submit"
                    disabled={login.isPending}
                    className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                >
                    {login.isPending ? "Logging in…" : "Log in again"}
                </button>
            </form>
        </div>
    );
}
