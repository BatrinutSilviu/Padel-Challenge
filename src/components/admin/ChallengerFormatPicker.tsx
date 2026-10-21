import type { ChallengerFormat } from "../../lib/tournaments";

const OPTIONS: { value: ChallengerFormat; label: string; description: string }[] = [
    {
        value: "BRACKETS",
        label: "Golden / Silver brackets",
        description: "Top 2 of each group to the Golden bracket, bottom 2 to the Silver — semifinals, then a final and a 3rd place match in each.",
    },
    {
        value: "PLACEMENT",
        label: "Placement matches",
        description: "8 teams only. One match each after the groups: A #1 vs B #1 for 1st place, A #2 vs B #2 for 3rd, A #3 vs B #3 for 5th, A #4 vs B #4 for 7th.",
    },
];

// What a Challenger plays after its group stage.
export function ChallengerFormatPicker({
    value,
    onChange,
    disabled,
}: {
    value: ChallengerFormat;
    onChange: (format: ChallengerFormat) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {OPTIONS.map(o => (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onChange(o.value)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                            value === o.value ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
            <p className="text-xs text-gray-400">{OPTIONS.find(o => o.value === value)!.description}</p>
        </div>
    );
}
