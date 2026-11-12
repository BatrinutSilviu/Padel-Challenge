import { trpc } from "../trpc";

// 7 (Girls) is retired — only kept so its past tournaments still show their division.
export const DIVISION_NAMES: Record<number, string> = {
    1: "Level 1", 2: "Level 2", 3: "Level 3", 4: "Level 4", 5: "Level 5", 6: "Beginner", 7: "Girls",
};

export const DIVISION_BADGES: Record<number, { label: string; className: string }> = {
    1: { label: "Level 1",  className: "bg-amber-100 text-amber-700 border border-amber-300" },
    2: { label: "Level 2",  className: "bg-slate-100 text-slate-600 border border-slate-300" },
    3: { label: "Level 3",  className: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
    4: { label: "Level 4",  className: "bg-zinc-200 text-zinc-600 border border-zinc-400" },
    5: { label: "Level 5",  className: "bg-orange-100 text-orange-700 border border-orange-300" },
    6: { label: "Beginner", className: "bg-green-100 text-green-700 border border-green-300" },
    7: { label: "Girls",    className: "bg-pink-100 text-pink-700 border border-pink-300" },
};

export const DIVISION_COLORS: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
    2: { bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200" },
    3: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    4: { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200" },
    5: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    6: { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
    7: { bg: "bg-pink-50",   text: "text-pink-700",   border: "border-pink-200" },
};

export function divisionLabel(division: number): string {
    return DIVISION_NAMES[division] ?? `Division ${division}`;
}

// What each level means (backend site.divisionDescriptions) — admin-edited, with defaults.
export function useDivisionDescriptions() {
    const { data } = trpc.site.divisionDescriptions.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
    return (division: number): string | null => data?.[division] ?? null;
}
