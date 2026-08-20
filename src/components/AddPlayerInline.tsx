import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../trpc";
import { DIVISION_NAMES } from "../lib/divisions";

type NewPlayer = { id: string; name: string; division: number; gender: "MALE" | "FEMALE" };

export function AddPlayerInline({
    defaultName = "",
    defaultDivision = 6,
    onCreated,
    onCancel,
}: {
    defaultName?: string;
    defaultDivision?: number;
    onCreated: (player: NewPlayer) => void;
    onCancel: () => void;
}) {
    const qc = useQueryClient();
    const [name, setName] = useState(defaultName);
    const [division, setDivision] = useState(defaultDivision);
    const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");

    const create = trpc.player.create.useMutation({
        onSuccess: (player) => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.division.allPlayers) });
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.division.players) });
            onCreated(player);
        },
    });

    function handleSubmit() {
        if (!name.trim()) return;
        create.mutate({ name: name.trim(), division, gender });
    }

    return (
        // A plain <div>, not a <form> — this is rendered inside CreateTournamentForm's
        // (and, via PlayerPicker, another ancestor form's) own <form>, and nested <form>
        // elements have unspecified submit behavior (observed: submitting this one could
        // trigger the OUTER form's submit too). Submission is handled manually instead.
        <div
            onClick={e => e.stopPropagation()}
            className="rounded-lg border border-[#FF4200]/30 bg-[#FF4200]/5 p-3 space-y-2.5"
        >
            <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
                placeholder="New player's name"
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white"
            />
            <div className="flex flex-wrap gap-2">
                <select
                    value={division}
                    onChange={e => setDivision(Number(e.target.value))}
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white"
                >
                    {[1, 2, 3, 4, 5, 6].map(d => (
                        <option key={d} value={d}>{d === 6 ? "Beginner" : `Div ${d} — ${DIVISION_NAMES[d]}`}</option>
                    ))}
                </select>
                <select
                    value={gender}
                    onChange={e => setGender(e.target.value as "MALE" | "FEMALE")}
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white"
                >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                </select>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={create.isPending || !name.trim()}
                    className="bg-[#FF4200] text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                >
                    {create.isPending ? "Adding…" : "Add player"}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5"
                >
                    Cancel
                </button>
            </div>
            {create.error && <p className="text-xs text-red-500">{create.error.message}</p>}
        </div>
    );
}
