import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { trpc } from "../../../trpc";

// The next Monday on or after today, as YYYY-MM-DD — leagues run Monday to Sunday.
function nextMonday(): string {
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AdminLeaguesTab() {
    const navigate = useNavigate();
    const { data: leagues, isPending } = trpc.league.list.useQuery();
    const [name, setName] = useState("");
    const [startDate, setStartDate] = useState(nextMonday);
    const [tierCount, setTierCount] = useState(1);
    const create = trpc.league.create.useMutation({
        onSuccess: l => navigate(`/admin/league/${l.id}`),
    });
    const isMonday = new Date(`${startDate}T00:00:00Z`).getUTCDay() === 1;

    return (
        <div className="space-y-6">
            <form
                onSubmit={e => { e.preventDefault(); create.mutate({ name: name.trim(), startDate, tierCount }); }}
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-4"
            >
                <div>
                    <h2 className="font-semibold text-gray-800">New Act!ve Padel League</h2>
                    <p className="text-sm text-gray-500">Groups of fixed teams play a round robin, one match a week. You add the teams and set the promotion rules next.</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                    <label className="space-y-1 sm:col-span-1">
                        <span className="text-sm font-medium text-gray-700">Name</span>
                        <input value={name} onChange={e => setName(e.target.value)} placeholder="Autumn League 2026" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]" />
                    </label>
                    <label className="space-y-1">
                        <span className="text-sm font-medium text-gray-700">Week 1 starts</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]" />
                    </label>
                    <label className="space-y-1">
                        <span className="text-sm font-medium text-gray-700">Leagues (tiers)</span>
                        <select value={tierCount} onChange={e => setTierCount(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF4200]">
                            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 1 ? "1 — just one league" : `${n} — League 1 to ${n}`}</option>)}
                        </select>
                    </label>
                </div>
                {!isMonday && startDate && <p className="text-xs text-amber-700">Weeks run from this day for 7 days — usually a Monday.</p>}
                {create.error && <p className="text-sm text-red-500">{create.error.message}</p>}
                <button type="submit" disabled={!name.trim() || !startDate || create.isPending} className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#FF4200] text-white text-sm font-semibold hover:bg-[#CC3500] disabled:opacity-50">
                    {create.isPending ? "Creating…" : "Create league"}
                </button>
            </form>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isPending && <p className="p-4 text-gray-400">Loading…</p>}
                {!isPending && leagues?.length === 0 && <p className="p-4 text-gray-400">No leagues yet.</p>}
                {leagues?.map(l => (
                    <Link key={l.id} to={`/admin/league/${l.id}`} className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{l.name}</p>
                            <p className="text-xs text-gray-500">
                                From {new Date(l.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · {l._count.teams} teams · {l._count.tiers} tier{l._count.tiers > 1 ? "s" : ""}
                            </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${l.status === "DRAFT" ? "bg-gray-100 text-gray-600" : l.status === "IN_PROGRESS" ? "bg-[#FF4200]/10 text-[#FF4200]" : "bg-emerald-50 text-emerald-600"}`}>
                            {l.status === "DRAFT" ? "Draft" : l.status === "IN_PROGRESS" ? "Live" : "Completed"}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
