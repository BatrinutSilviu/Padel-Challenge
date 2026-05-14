import { Link } from "react-router-dom";

export function NavBar() {
    const isAdmin = !!localStorage.getItem("admin_token");

    return (
        <header className="bg-[#333366] text-white shadow-md">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
                <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity shrink-0">
                    <img src="/active.png" alt="Act!ve" className="h-4 w-auto" />
                    <span className="text-2xl font-bold tracking-tight text-white leading-none">Padel</span>
                </Link>
                <div className="flex items-center gap-1 sm:gap-2">
                    <Link
                        to="/badges"
                        className="text-sm font-medium px-2.5 py-2 sm:px-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors whitespace-nowrap"
                    >
                        🏅 Badges
                    </Link>
                    {isAdmin && (
                        <Link
                            to="/admin"
                            className="text-sm font-medium px-2.5 py-2 sm:px-3 rounded-lg border border-[#9FD2DD]/50 text-[#9FD2DD] hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                        >
                            Admin
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
