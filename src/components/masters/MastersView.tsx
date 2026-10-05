import { Link } from "react-router-dom";
import { trpc } from "../../trpc";
import { STAGE_INFO, mastersKnockoutStages, mastersPartnerMap, mastersProgress } from "../../lib/masters";
import { GroupSection } from "../challenger/ChallengerView";
import { TeamFinalStandings } from "../TeamFinalStandings";
import { MastersBracket } from "./MastersBracket";

type TournamentData = NonNullable<ReturnType<typeof trpc.tournament.getById.useQuery>["data"]>;

export function MastersView({ tournament }: { tournament: TournamentData }) {
    const progress = mastersProgress(tournament);
    const { groupCount } = progress.format;
    const firstStage = STAGE_INFO[mastersKnockoutStages(groupCount)[0]].title.toLowerCase();

    return (
        <div className="space-y-6">
            {tournament.status === "COMPLETED" && (
                <TeamFinalStandings participants={tournament.participants} partnerOf={mastersPartnerMap(tournament.rounds)} />
            )}

            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Bracket</h2>
                    <Link
                        to={`/tournament/${tournament.id}/live`}
                        target="_blank"
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#333366] text-white hover:bg-[#FF4200] transition-colors"
                    >
                        📺 TV mode
                    </Link>
                </div>
                <MastersBracket stages={progress.stages} thirdPlace={progress.thirdPlace} courtOf={progress.courtOf} />
            </section>

            <section>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#8E8E93] mb-3">Group Stage</h2>
                <p className="text-xs text-[#8E8E93] mb-3">
                    {groupCount === 1 ? "The top 2 play the Final." : `The top 2 of each group go through to the ${firstStage}.`}
                </p>
                <div className={`grid grid-cols-1 gap-4 ${groupCount > 1 ? "lg:grid-cols-2" : ""}`}>
                    {progress.groups.map(g => (
                        <GroupSection key={g} title={groupCount === 1 ? "Group" : `Group ${g}`} rounds={progress.groupRounds[g]} courtOf={progress.courtOf} />
                    ))}
                </div>
            </section>
        </div>
    );
}
