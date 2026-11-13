import { useSearchParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { AdminLeaguesTab } from "./league/AdminLeaguesTab";
import { TournamentsTab } from "./tabs/TournamentsTab";
import { NewTournamentTab } from "./tabs/newTournament/NewTournamentTab";
import { PlayersTab } from "./tabs/players/PlayersTab";
import { SettingsTab } from "./tabs/settings/SettingsTab";
import { ExportTab } from "./tabs/ExportTab";

// In the order they're shown.
const TABS = ["tournaments", "new-tournament", "league", "players", "settings", "export"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
    tournaments: "Tournaments",
    "new-tournament": "New Tournament",
    league: "League",
    players: "Players",
    export: "Export",
    settings: "Settings",
};

// What the tabs say on a phone, where all of them have to fit on one row.
const SHORT_LABELS: Partial<Record<Tab, string>> = { "new-tournament": "+ New", settings: "⚙", export: "⤓" };

// The admin home: one tab per area, the chosen one kept in the URL (?tab=…).
export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get("tab") as Tab) ?? "tournaments";
    const setTab = (t: Tab) => setSearchParams({ tab: t });
    const pendingClaims = trpc.profileClaim.pendingCount.useQuery();
    // Players who signed themselves up and wait to be confirmed, on sheets that haven't started.
    const awaiting = trpc.tournament.awaitingConfirmation.useQuery(undefined, { refetchInterval: 60_000 });
    const tabBadges: Partial<Record<Tab, number>> = { players: pendingClaims.data ?? 0, tournaments: awaiting.data?.length ?? 0 };

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            <main className="max-w-5xl mx-auto px-3 sm:px-4 pt-6 pb-24 sm:py-8">
                {/* One row on every screen: on a phone each tab is as wide as its label, Logout beside them.
                    If the tabs don't fit (a pending-claims count makes them wider) they scroll sideways. */}
                <div className="flex items-center gap-2 sm:gap-3 sm:justify-between mb-5 sm:mb-6">
                    <div className="flex-1 sm:flex-none min-w-0 flex gap-0.5 sm:gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                title={TAB_LABELS[t]}
                                aria-label={TAB_LABELS[t]}
                                // The chosen tab scrolls into view when the row is wider than the phone.
                                ref={el => { if (el && tab === t) el.scrollIntoView({ block: "nearest", inline: "nearest" }); }}
                                className={`flex-auto shrink-0 sm:flex-none px-1 min-[400px]:px-1.5 py-2 sm:px-4 sm:py-1.5 md:px-6 md:py-2.5 rounded-lg text-xs sm:text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                                    tab === t ? "bg-[#FF4200] text-white" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                {t in SHORT_LABELS ? (
                                    <><span className="sm:hidden">{SHORT_LABELS[t]}</span><span className="hidden sm:inline">{TAB_LABELS[t]}</span></>
                                ) : TAB_LABELS[t]}
                                {/* Profile claims wait at the top of the Players tab, sign-ups to confirm on the Tournaments tab. */}
                                {(tabBadges[t] ?? 0) > 0 && (
                                    <span className={`ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-bold ${
                                        tab === t ? "bg-white text-[#FF4200]" : "bg-amber-500 text-white"
                                    }`}>
                                        {tabBadges[t]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onLogout}
                        aria-label="Logout"
                        className="shrink-0 text-sm font-medium px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-red-300 hover:text-red-500 transition-colors"
                    >
                        <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>

                {tab === "tournaments" && <TournamentsTab />}
                {tab === "new-tournament" && <NewTournamentTab onCreated={() => setTab("tournaments")} />}
                {tab === "league" && <AdminLeaguesTab />}
                {tab === "players" && <PlayersTab />}
                {tab === "settings" && <SettingsTab />}
                {tab === "export" && <ExportTab />}
            </main>
        </div>
    );
}
