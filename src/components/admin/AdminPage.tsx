import { AdminDashboard } from "./AdminDashboard";
import { LoginPage, SessionExpiredModal } from "./AdminAuth";
import { useAdminSession } from "./useAdminSession";

export function AdminPage() {
    const { token, sessionExpired, handleLogin, handleLogout } = useAdminSession();

    if (!token && !sessionExpired) return <LoginPage onLogin={handleLogin} />;

    return (
        <>
            <AdminDashboard onLogout={handleLogout} />
            {sessionExpired && <SessionExpiredModal onLogin={handleLogin} />}
        </>
    );
}
