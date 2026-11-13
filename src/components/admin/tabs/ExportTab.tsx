import { useState } from "react";
import { trpc } from "../../../trpc";
import { Field } from "../formControls";
import { compactField } from "../formStyles";

// Who played in a date range, as a CSV.
export function ExportTab() {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [startDate, setStartDate] = useState(toDateInputValue(firstOfMonth));
    const [endDate, setEndDate] = useState(toDateInputValue(today));

    const { data, isFetching, error } = trpc.tournament.participantsByDateRange.useQuery(
        { startDate, endDate },
        { enabled: !!startDate && !!endDate }
    );

    const males = data?.players.filter(p => p.gender === "MALE") ?? [];
    const females = data?.players.filter(p => p.gender === "FEMALE") ?? [];

    function handleDownload() {
        if (!data) return;
        const ordered = [...males, ...females];
        const rows = [["Name", "Gender"], ...ordered.map(p => [p.name, p.gender === "MALE" ? "Male" : "Female"])];
        downloadCsv(`participants_${startDate}_to_${endDate}.csv`, rows);
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-base font-semibold text-gray-800">Export Participants</h2>
                <p className="text-sm text-gray-500">
                    Download every player who took part in a tournament within the selected date range, split by gender.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="From">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={compactField} />
                    </Field>
                    <Field label="To">
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={compactField} />
                    </Field>
                </div>

                {error && <p className="text-sm text-red-500">{error.message}</p>}

                {data && (
                    <div className="text-sm text-gray-600 space-y-2">
                        <p>
                            {data.tournaments.length} tournament{data.tournaments.length === 1 ? "" : "s"} found · {data.players.length} unique participant{data.players.length === 1 ? "" : "s"} ({males.length} male, {females.length} female)
                        </p>
                        {data.tournaments.length > 0 && (
                            <ul className="text-xs text-gray-400 space-y-0.5">
                                {data.tournaments.map(t => (
                                    <li key={t.id}>{new Date(t.date).toLocaleDateString()} — {t.name}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!data || data.players.length === 0 || isFetching}
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-[#FF4200] text-white px-4 py-2 rounded-lg hover:bg-[#e63c00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                    Download CSV
                </button>
            </div>
        </div>
    );
}

// "YYYY-MM-DD" in local time, as a date input wants it.
function toDateInputValue(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Saves the rows as a CSV file, every cell quoted.
function downloadCsv(filename: string, rows: string[][]) {
    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
