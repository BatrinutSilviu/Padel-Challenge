import { Link } from "react-router-dom";

type Participant = {
    id: string;
    finalRank: number | null;
    player: { id: string; name: string };
};

// Renders a team's players stacked together under one rank — used by formats where
// finalRank is assigned per-team (both teammates share the same rank), e.g. Challenger
// and King of the Court.
export function TeamFinalStandings({ participants }: { participants: Participant[] }) {
    const sorted = [...participants]
        .filter(p => p.finalRank != null)
        .sort((a, b) => (a.finalRank ?? 0) - (b.finalRank ?? 0));

    const seen = new Set<string>();
    const rows: { rank: number; players: Participant[] }[] = [];
    for (const p of sorted) {
        if (seen.has(p.id)) continue;
        const teammates = sorted.filter(x => x.finalRank === p.finalRank);
        teammates.forEach(t => seen.add(t.id));
        rows.push({ rank: p.finalRank ?? 0, players: teammates });
    }

    return (
        <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Final Standings</h2>
            <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-sm min-w-[280px]">
                    <thead className="border-b border-[#F5F5F7]">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93] w-12">Rank</th>
                            <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Team</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ rank, players }) => (
                            <tr key={rank} className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                                <td className="px-4 py-3 align-top">
                                    <RankMedal rank={rank} />
                                </td>
                                <td className="px-4 py-3">
                                    {players.map(p => (
                                        <Link key={p.id} to={`/player/${p.player.id}`} className="font-semibold text-[#1A1A2E] hover:text-[#FF4200] transition-colors block">
                                            {p.player.name}
                                        </Link>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function RankMedal({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-yellow-500 font-black text-lg">🥇</span>;
    if (rank === 2) return <span className="text-gray-400 font-black text-lg">🥈</span>;
    if (rank === 3) return <span className="text-amber-600 font-black text-lg">🥉</span>;
    return <span className="text-[#8E8E93] font-bold">#{rank}</span>;
}
