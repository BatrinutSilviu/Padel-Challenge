import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { CogIcon, HomeIcon, TrophyIcon, UserIcon } from "./ui/icons";
import { NotificationBell } from "./notifications/NotificationBell";
import { useUnreadNotifications } from "./notifications/useNotifications";

export function NavBar() {
    const isAdmin = !!localStorage.getItem("admin_token");
    const { token, logout } = useAuth();
    const { pathname } = useLocation();
    const isLeague = pathname.startsWith("/league");
    const isAdminPage = pathname.startsWith("/admin");
    const isMe = pathname.startsWith("/me") || pathname.startsWith("/notifications");
    const isHome = !isLeague && !isAdminPage && !isMe;

    return (
        <>
            <header className="bg-canvas/95 backdrop-blur text-ink sticky top-0 z-40 border-b border-line">
                <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity shrink-0">
                        <img src="/active.png" alt="Act!ve" className="h-5 sm:h-6 w-auto" />
                        <span className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider leading-none text-[#FF4200]">Padel</span>
                    </Link>
                    {token && <div className="sm:hidden flex items-center pr-1"><NotificationBell /></div>}
                    <nav className="hidden sm:flex items-center gap-6 font-display text-[15px] font-semibold uppercase tracking-wider">
                        <NavLink to="/" active={isHome}>Home</NavLink>
                        <NavLink to="/league" active={isLeague}>League</NavLink>
                        {isAdmin && <NavLink to="/admin" active={isAdminPage}>Admin</NavLink>}
                        {token && <NavLink to="/me" active={isMe}>My profile</NavLink>}
                        {token && <NotificationBell />}
                        {token ? (
                            <button
                                onClick={logout}
                                className="font-display uppercase tracking-wider text-muted hover:text-ink transition-colors"
                            >
                                Log out
                            </button>
                        ) : (
                            <Link
                                to="/login"
                                className="font-sans normal-case tracking-normal text-sm font-semibold px-4 py-2 rounded-md border border-gray-300 text-ink hover:border-gray-400 transition-colors"
                            >
                                Log in
                            </Link>
                        )}
                    </nav>
                </div>
            </header>
            <MobileBottomNav isAdmin={isAdmin} />
        </>
    );
}

function MobileBottomNav({ isAdmin }: { isAdmin: boolean }) {
    const { pathname } = useLocation();
    const isLeague = pathname.startsWith("/league");
    const isMe = pathname.startsWith("/me") || pathname.startsWith("/notifications");
    const isHome = !pathname.startsWith("/admin") && !isLeague && !isMe;
    const isAdminPage = pathname.startsWith("/admin");
    const { token } = useAuth();
    const { unread } = useUnreadNotifications();

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
            <div className="flex">
                <BottomTab to="/" label="Home" active={isHome}>
                    <HomeIcon className="w-5 h-5" />
                </BottomTab>
                <BottomTab to="/league" label="League" active={isLeague}>
                    <TrophyIcon className="w-5 h-5" />
                </BottomTab>
                <BottomTab to={token ? "/me" : "/login"} label={token ? "Me" : "Log in"} active={isMe}>
                    <span className="relative">
                        <UserIcon className="w-5 h-5" />
                        {unread > 0 && <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[#FF4200]" aria-label={`${unread} unread notifications`} />}
                    </span>
                </BottomTab>
                {isAdmin && (
                    <BottomTab to="/admin" label="Admin" active={isAdminPage}>
                        <CogIcon className="w-5 h-5" />
                    </BottomTab>
                )}
            </div>
        </nav>
    );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link to={to} className={`transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}>
            {children}
        </Link>
    );
}

function BottomTab({ to, label, active, children }: { to: string; label: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            to={to}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                active ? "text-[#FF4200] shadow-[inset_0_2px_0_#FF4200]" : "text-muted"
            }`}
        >
            {children}
            <span className="text-[11px] font-semibold">{label}</span>
        </Link>
    );
}
