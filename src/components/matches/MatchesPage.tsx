import { Link } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";

export function MatchesPage() {
    const { token } = useAuth();
    const { data: matches, isPending } = trpc.individualMatch.list.useQuery();

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight">Individual Matches</h1>
                    {token && (
                        <Link
                            to="/matches/new"
                            className="text-sm font-semibold px-3 py-2 rounded-lg bg-[#FF4200] text-white hover:bg-[#CC3500] transition-colors whitespace-nowrap"
                        >
                            Record a match
                        </Link>
                    )}
                </div>

                {!token && (
                    <p className="text-sm text-[#8E8E93]">
                        <Link to="/login" className="text-[#FF4200] font-semibold hover:underline">Log in</Link> to record a match you played.
                    </p>
                )}

                {isPending && <p className="text-[#8E8E93]">Loading…</p>}
                {!isPending && (matches?.length ?? 0) === 0 && (
                    <p className="text-[#8E8E93]">No matches recorded yet.</p>
                )}

                <div className="space-y-2.5">
                    {matches?.map(m => {
                        const team1Wins = m.team1Score > m.team2Score;
                        return (
                            <div key={m.id} className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <div className="sm:flex-1 text-center sm:text-right">
                                    <p className={`font-medium text-sm ${team1Wins ? "text-[#FF4200]" : "text-gray-800"}`}>
                                        <PlayerLink player={m.team1Player1} /> &amp; <PlayerLink player={m.team1Player2} />
                                    </p>
                                </div>
                                <div className="shrink-0 text-center">
                                    <span className="text-lg font-black text-[#1A1A2E]">{m.team1Score} – {m.team2Score}</span>
                                    <p className="text-xs text-[#8E8E93]">{new Date(m.playedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="sm:flex-1 text-center sm:text-left">
                                    <p className={`font-medium text-sm ${!team1Wins ? "text-[#FF4200]" : "text-gray-800"}`}>
                                        <PlayerLink player={m.team2Player1} /> &amp; <PlayerLink player={m.team2Player2} />
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

function PlayerLink({ player }: { player: { id: string; name: string } }) {
    return (
        <Link to={`/player/${player.id}`} className="hover:underline">
            {player.name}
        </Link>
    );
}
