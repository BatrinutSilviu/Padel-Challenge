import { Link } from "react-router-dom";

export function NavBar() {
    return (
        <header className="bg-[#333366] text-white shadow-md">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
                    <img src="/active.png" alt="Act!ve" className="h-6 w-auto" />
                    <span className="text-2xl font-bold tracking-tight text-white leading-none">Padel</span>
                </Link>
                <Link
                    to="/admin"
                    className="text-sm font-medium px-3 py-1.5 rounded-lg border border-[#9FD2DD]/50 text-[#9FD2DD] hover:bg-white/10 hover:text-white transition-colors"
                >
                    Admin
                </Link>
            </div>
        </header>
    );
}
