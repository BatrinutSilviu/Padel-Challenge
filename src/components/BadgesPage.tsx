import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { NavBar } from "./NavBar";
import { BADGE_META, BadgeType } from "../lib/badges";

const BADGE_ORDER: BadgeType[] = [
    'AMERICANO_CHAMPION',
    'CHALLENGER_CHAMPION',
    'DIVISION_LEADER',
    'QUEEN_OF_COURT',
    'ON_FIRE',
    'MOST_TOURNAMENTS',
];

export function BadgesPage() {
    const { data: players } = trpc.player.list.useQuery();

    const holdersByBadge = new Map<BadgeType, typeof players>();
    if (players) {
        for (const badge of BADGE_ORDER) {
            holdersByBadge.set(badge, players.filter(p => (p.badges as BadgeType[]).includes(badge)));
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
                <div className="space-y-1">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-[#FF4200] hover:text-[#FF4200] shadow-sm transition-colors w-fit"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Home
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Badges</h1>
                    <p className="text-sm text-gray-500">Achievements awarded to players based on their performance.</p>
                </div>

                <div className="space-y-4">
                    {BADGE_ORDER.map(badge => {
                        const meta = BADGE_META[badge];
                        const holders = holdersByBadge.get(badge) ?? [];
                        return (
                            <div key={badge} className={`bg-white rounded-xl border ${meta.className} overflow-hidden`}>
                                <div className="flex items-center gap-3 px-4 py-4 border-b border-current/10">
                                    <span className="text-3xl sm:text-4xl shrink-0">{meta.emoji}</span>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm sm:text-base">{meta.label}</p>
                                        <p className="text-xs sm:text-sm opacity-70 mt-0.5">{meta.description}</p>
                                    </div>
                                </div>
                                <div className="px-4 py-3">
                                    {holders.length === 0 ? (
                                        <p className="text-sm opacity-50 italic">No current holder</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {holders.map(p => (
                                                <Link
                                                    key={p.id}
                                                    to={`/player/${p.id}`}
                                                    className="inline-flex items-center text-sm font-medium px-2.5 py-1 rounded-lg bg-white/60 hover:underline min-h-[36px]"
                                                >
                                                    {p.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
