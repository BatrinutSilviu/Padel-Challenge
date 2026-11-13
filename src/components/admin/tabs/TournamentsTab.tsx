import { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../../../trpc";
import { divisionLabel } from "../../../lib/divisions";
import { tournamentTypeLabel, tournamentWhen } from "../../../lib/tournaments";

// Every tournament, by stage: sign-up sheets first (with who waits to be confirmed), then
// the ones being played, then the rest.
export function TournamentsTab() {
    const utils = trpc.useUtils();
    // Admins still see the retired Girls division's past tournaments.
    const { data, isPending } = trpc.tournament.list.useQuery({ includeRetired: true });
    const signups = data?.filter(t => t.status === "UPCOMING") ?? [];
    const active = data?.filter(t => t.status === "IN_PROGRESS") ?? [];
    const others = data?.filter(t => t.status === "COMPLETED") ?? [];
    // Who waits to be confirmed on each sign-up sheet, oldest first.
    const { data: awaiting } = trpc.tournament.awaitingConfirmation.useQuery(undefined, { refetchInterval: 60_000 });
    const waitingFor = (id: string) => awaiting?.filter(a => a.tournamentId === id) ?? [];

    const deleteTournament = trpc.tournament.delete.useMutation({
        onSuccess: () => utils.tournament.list.invalidate(),
    });

    function handleDelete(id: string, name: string) {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        deleteTournament.mutate({ id });
    }

    return (
        <div className="space-y-6">
            {signups.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-gray-700 mb-3">Sign-ups</h2>
                    <div className="space-y-2">
                        {signups.map(t => {
                            const waiting = waitingFor(t.id);
                            return (
                            <div key={t.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-lg border px-4 py-3 ${waiting.length > 0 ? "border-amber-300 ring-1 ring-amber-200" : "border-sky-200"}`}>
                                <div className="min-w-0">
                                    <TournamentNameEditor id={t.id} name={t.name} />
                                    <span className="text-xs text-gray-400 block">
                                        <Summary tournament={t} />
                                        {" · "}{t._count.participants}{t.maxPlayers !== null ? `/${t.maxPlayers}` : ""} confirmed
                                        {!t.registrationOpen && " · closed"}
                                        {t.womenOnly && " · women only"}
                                    </span>
                                    {waiting.length > 0 && (
                                        <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 rounded-md px-2 py-1 [overflow-wrap:anywhere]">
                                            <span className="font-semibold">
                                                {waiting.length} new sign-up{waiting.length !== 1 ? "s" : ""} to confirm:
                                            </span>{" "}
                                            {waiting.map(w => w.player.name).join(", ")}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                    <Link
                                        to={`/admin/tournament/${t.id}`}
                                        className={`inline-flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors ${waiting.length > 0 ? "bg-amber-500 hover:bg-amber-600" : "bg-sky-600 hover:bg-sky-700"}`}
                                    >
                                        {waiting.length > 0 ? "Confirm sign-ups" : "Manage sign-ups"}
                                    </Link>
                                    <DeleteButton onClick={() => handleDelete(t.id, t.name)} />
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">In Progress</h2>
                {isPending && <p className="text-gray-500">Loading…</p>}
                {!isPending && active.length === 0 && <p className="text-gray-500">No active tournaments.</p>}
                <div className="space-y-2">
                    {active.map(t => (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-lg border border-yellow-200 px-4 py-3">
                            <div className="min-w-0">
                                <TournamentNameEditor id={t.id} name={t.name} />
                                <span className="text-xs text-gray-400 block"><Summary tournament={t} /></span>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                <Link
                                    to={`/admin/tournament/${t.id}`}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#FF4200] text-white px-4 py-2 rounded-lg hover:bg-[#CC3500] transition-colors"
                                >
                                    <PencilIcon />
                                    Enter Scores
                                </Link>
                                <DeleteButton withIcon onClick={() => handleDelete(t.id, t.name)} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Other Tournaments</h2>
                <div className="space-y-2">
                    {others.map(t => (
                        <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white rounded-lg border border-gray-200 px-4 py-3">
                            <div className="min-w-0">
                                <TournamentNameEditor id={t.id} name={t.name} />
                                <span className="text-xs text-gray-400 block"><Summary tournament={t} /></span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto sm:shrink-0">
                                <StatusBadge status={t.status} />
                                <Link
                                    to={`/admin/tournament/${t.id}`}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium border border-[#FF4200] text-[#FF4200] px-3 py-2 rounded-lg hover:bg-[#FF4200]/5 transition-colors whitespace-nowrap"
                                >
                                    <PencilIcon />
                                    {t.status === "COMPLETED" ? "Edit scores" : "Enter scores"}
                                </Link>
                                <DeleteButton withIcon onClick={() => handleDelete(t.id, t.name)} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

// The level, when and where, and the format: "Level 4 · 10/6/2026 · 19:30–21:30 · X3 Padel · Americano".
function Summary({ tournament: t }: { tournament: Parameters<typeof tournamentWhen>[0] & { division: number; type: string } }) {
    return <>{divisionLabel(t.division)} · {tournamentWhen(t)} · {tournamentTypeLabel(t.type)}</>;
}

// The tournament's name; click it to rename it in place (Enter or leaving the field saves, Escape cancels).
function TournamentNameEditor({ id, name }: { id: string; name: string }) {
    const utils = trpc.useUtils();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(name);

    const rename = trpc.tournament.rename.useMutation({
        onSuccess: () => {
            utils.tournament.list.invalidate();
            setEditing(false);
        },
    });

    function save() {
        const trimmed = value.trim();
        if (!trimmed || trimmed === name) {
            setValue(name);
            setEditing(false);
            return;
        }
        rename.mutate({ id, name: trimmed });
    }

    if (editing) {
        return (
            <input
                autoFocus
                value={value}
                disabled={rename.isPending}
                onChange={e => setValue(e.target.value)}
                onBlur={save}
                onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); save(); }
                    if (e.key === "Escape") { setValue(name); setEditing(false); }
                }}
                className="font-medium text-gray-800 bg-white border border-[#FF4200] rounded px-1.5 py-0.5 -my-0.5 w-full max-w-xs focus:outline-none"
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => { setValue(name); setEditing(true); }}
            className="font-medium text-gray-800 truncate text-left hover:underline decoration-dotted underline-offset-2"
            title="Click to rename"
        >
            {name}
        </button>
    );
}

function DeleteButton({ onClick, withIcon = false }: { onClick: () => void; withIcon?: boolean }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1.5 text-sm font-medium border border-red-200 text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
        >
            {withIcon && <TrashIcon />}
            Delete
        </button>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        UPCOMING: "bg-blue-100 text-blue-700",
        IN_PROGRESS: "bg-yellow-100 text-yellow-700",
        COMPLETED: "bg-green-100 text-green-700",
    };
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

function PencilIcon() {
    return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213l-4 1 1-4 12.362-12.726z"/></svg>;
}

function TrashIcon() {
    return <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>;
}
