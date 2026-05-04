export const DIVISION_NAMES: Record<number, string> = {
    1: "Elite", 2: "Premier", 3: "Gold", 4: "Silver", 5: "Bronze", 6: "Beginner",
};

export const DIVISION_BADGES: Record<number, { label: string; className: string }> = {
    1: { label: "Elite",    className: "bg-amber-100 text-amber-700 border border-amber-300" },
    2: { label: "Premier",  className: "bg-slate-100 text-slate-600 border border-slate-300" },
    3: { label: "Gold",     className: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
    4: { label: "Silver",   className: "bg-gray-100 text-gray-500 border border-gray-300" },
    5: { label: "Bronze",   className: "bg-orange-100 text-orange-700 border border-orange-300" },
    6: { label: "Beginner", className: "bg-green-100 text-green-700 border border-green-300" },
};

export const DIVISION_COLORS: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" },
    2: { bg: "bg-slate-50",  text: "text-slate-600",  border: "border-slate-200" },
    3: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    4: { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200" },
    5: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    6: { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" },
};

export function divisionLabel(division: number): string {
    return division === 6 ? "Beginner" : `Division ${division}`;
}
