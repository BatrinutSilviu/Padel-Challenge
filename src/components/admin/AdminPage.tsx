import { AdminDashboard } from "./AdminDashboard";
import { useAdminSession, LoginPage, SessionExpiredModal } from "./AdminAuth";

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
