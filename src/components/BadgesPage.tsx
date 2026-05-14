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
    'MOST_POINTS',
    'MOST_TOP3',
    'AMERICANO_5',
    'AMERICANO_10',
    'AMERICANO_20',
    'AMERICANO_50',
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
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-6">
                <div>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-white border border-[#E5E5EA] rounded-xl px-4 py-2 shadow-sm text-sm font-bold text-[#1A1A2E] hover:border-[#FF4200] hover:text-[#FF4200] transition-all mb-4 group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Home
                    </Link>
                    <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tight">Badges</h1>
                    <p className="text-sm text-[#8E8E93] font-medium mt-1">Achievements awarded to players based on their performance.</p>
                </div>

                <div className="space-y-3">
                    {BADGE_ORDER.map(badge => {
                        const meta = BADGE_META[badge];
                        const holders = holdersByBadge.get(badge) ?? [];
                        return (
                            <div key={badge} className={`bg-white rounded-2xl border ${meta.className} overflow-hidden shadow-sm`}>
                                <div className="flex items-center gap-3 px-4 py-4 border-b border-current/10">
                                    <span className="text-3xl shrink-0">{meta.emoji}</span>
                                    <div className="min-w-0">
                                        <p className="font-black text-sm sm:text-base">{meta.label}</p>
                                        <p className="text-xs sm:text-sm opacity-70 mt-0.5">{meta.description}</p>
                                    </div>
                                </div>
                                <div className="px-4 py-3">
                                    {holders.length === 0 ? (
                                        <p className="text-sm opacity-40 italic font-medium">No current holder</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {holders.map(p => (
                                                <Link
                                                    key={p.id}
                                                    to={`/player/${p.id}`}
                                                    className="inline-flex items-center text-sm font-bold px-3 py-1.5 rounded-xl bg-white/70 hover:underline min-h-[36px]"
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
