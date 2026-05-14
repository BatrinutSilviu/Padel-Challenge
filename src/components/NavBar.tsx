import { Link, useLocation } from "react-router-dom";

export function NavBar() {
    const isAdmin = !!localStorage.getItem("admin_token");

    return (
        <>
            <header className="bg-[#333366] text-white sticky top-0 z-40 border-b-2 border-[#FF4200]">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
                    <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0">
                        <img src="/active.png" alt="Act!ve" className="h-6 w-auto" />
                        <div className="flex items-center gap-2.5 translate-y-1">
                            <div className="w-px h-5 bg-white/20 rounded-full" />
                            <span className="text-2xl font-black tracking-tighter leading-none">
                                <span className="text-white">Padel</span><span className="text-[#FF4200]">.</span>
                            </span>
                        </div>
                    </Link>
                    <div className="hidden sm:flex items-center gap-1 sm:gap-2">
                        <Link
                            to="/badges"
                            className="text-sm font-semibold px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors whitespace-nowrap"
                        >
                            🏅 Badges
                        </Link>
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className="text-sm font-semibold px-3 py-2 rounded-lg border border-[#9FD2DD]/50 text-[#9FD2DD] hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                            >
                                Admin
                            </Link>
                        )}
                    </div>
                </div>
            </header>
            <MobileBottomNav isAdmin={isAdmin} />
        </>
    );
}

function MobileBottomNav({ isAdmin }: { isAdmin: boolean }) {
    const { pathname } = useLocation();
    const isHome = !pathname.startsWith("/badges") && !pathname.startsWith("/admin");
    const isBadges = pathname.startsWith("/badges");
    const isAdminPage = pathname.startsWith("/admin");

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E5EA]">
            <div className="flex">
                <BottomTab to="/" label="Home" active={isHome}>
                    <HomeIcon />
                </BottomTab>
                <BottomTab to="/badges" label="Badges" active={isBadges}>
                    <StarIcon />
                </BottomTab>
                {isAdmin && (
                    <BottomTab to="/admin" label="Admin" active={isAdminPage}>
                        <CogIcon />
                    </BottomTab>
                )}
            </div>
        </nav>
    );
}

function BottomTab({ to, label, active, children }: { to: string; label: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            to={to}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                active ? "text-[#FF4200]" : "text-[#8E8E93]"
            }`}
        >
            {children}
            <span className="text-[10px] font-bold">{label}</span>
        </Link>
    );
}

function HomeIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
    );
}

function StarIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    );
}

function CogIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
    );
}
