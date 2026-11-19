import { Link } from "react-router-dom";
import { NavBar } from "./NavBar";
import { useAuth } from "../contexts/useAuth";
import { trpc } from "../trpc";
import { divisionLabel } from "../lib/divisions";
import { formatCoefficient } from "../lib/levels";
import { NotificationList } from "./notifications/NotificationsPage";

// The logged-in player's own page: who they are, links to their public stats and to their
// details (phone, when and where they play), and their notifications.
export function MePage() {
    const { account, logout } = useAuth();
    const player = account?.player;
    const { data: full } = trpc.player.getById.useQuery({ id: player?.id ?? "" }, { enabled: !!player });
    if (!account || !player) return null;

    const initials = player.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
    const coefficient = full?.level.coefficient ?? null;

    return (
        <div className="min-h-screen bg-canvas">
            <NavBar />
            <main className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-6">
                <div className="bg-surface rounded-2xl border border-line p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#333366] flex items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-white">{initials}</span>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-ink tracking-tight leading-tight truncate">{player.name}</h1>
                            <p className="text-sm text-muted mt-0.5">
                                {divisionLabel(player.division)}
                                {coefficient !== null && <> · coefficient {formatCoefficient(coefficient)}{full?.level.provisional && "*"}</>}
                            </p>
                            <p className="text-xs text-muted mt-0.5 truncate">{account.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 mt-5">
                        <MeLink to={`/player/${player.id}`} title="My stats" hint="Results, ranking, level history" />
                        <MeLink to="/league/availability" title="My details" hint="Phone, when and where I play" />
                    </div>
                </div>

                <div id="notifications" className="scroll-mt-20">
                    <NotificationList heading={false} />
                </div>

                <button onClick={logout} className="w-full py-3 rounded-xl border border-line text-sm font-semibold text-muted hover:text-ink hover:border-gray-400 transition-colors">
                    Log out
                </button>
            </main>
        </div>
    );
}

function MeLink({ to, title, hint }: { to: string; title: string; hint: string }) {
    return (
        <Link to={to} className="block rounded-xl border border-line bg-canvas px-4 py-3 hover:border-gray-400 transition-colors">
            <span className="block text-sm font-semibold text-ink">{title} →</span>
            <span className="block text-xs text-muted mt-0.5">{hint}</span>
        </Link>
    );
}
