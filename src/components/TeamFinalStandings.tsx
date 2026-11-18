import { Link } from "react-router-dom";

type Participant = {
    id: string;
    finalRank: number | null;
    player: { id: string; name: string };
};

// Renders a team's players stacked together under one rank — used by formats where
// finalRank is assigned per-team (both teammates share the same rank), e.g. Challenger
// and King of the Court. Formats where several teams share a rank (Masters: both
// semifinal losers are 3rd) pass `partnerOf` (player id → teammate id) so each team
// still gets its own row.
export function TeamFinalStandings({ participants, partnerOf }: { participants: Participant[]; partnerOf?: Map<string, string> }) {
    const sorted = [...participants]
        .filter(p => p.finalRank != null)
        .sort((a, b) => (a.finalRank ?? 0) - (b.finalRank ?? 0));

    const seen = new Set<string>();
    const rows: { rank: number; players: Participant[] }[] = [];
    for (const p of sorted) {
        if (seen.has(p.id)) continue;
        const teammates = partnerOf
            ? sorted.filter(x => x.id === p.id || x.player.id === partnerOf.get(p.player.id))
            : sorted.filter(x => x.finalRank === p.finalRank);
        teammates.forEach(t => seen.add(t.id));
        rows.push({ rank: p.finalRank ?? 0, players: teammates });
    }

    return (
        <section>
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted mb-3">Final Standings</h2>
            <div className="bg-surface rounded-2xl border border-line overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-sm min-w-[280px]">
                    <thead className="border-b border-canvas">
                        <tr>
                            <th className="text-left px-4 py-3 font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted w-12">Rank</th>
                            <th className="text-left px-4 py-3 font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">Team</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ rank, players }) => (
                            <tr key={players[0].id} className="border-b border-canvas last:border-0 hover:bg-canvas transition-colors">
                                <td className="px-4 py-3 align-top">
                                    <RankMedal rank={rank} />
                                </td>
                                <td className="px-4 py-3">
                                    {players.map(p => (
                                        <Link key={p.id} to={`/player/${p.player.id}`} className="font-semibold text-ink hover:text-[#FF4200] transition-colors block">
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
    if (rank === 1) return <span className="text-yellow-500 font-bold text-lg">🥇</span>;
    if (rank === 2) return <span className="text-gray-400 font-bold text-lg">🥈</span>;
    if (rank === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>;
    return <span className="text-muted font-bold">#{rank}</span>;
}
