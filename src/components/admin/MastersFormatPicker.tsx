import type { ReactNode } from "react";
import {
    MASTERS_GROUP_COUNTS,
    MASTERS_TEAMS_PER_GROUP,
    RECOMMENDED_MASTERS_FORMAT,
    STAGE_INFO,
    isRecommendedMastersFormat,
    mastersKnockoutStages,
    mastersTeamCount,
    type MastersFormat,
} from "../../lib/masters";

// Number of groups × teams per group for a Masters tournament, with a one-tap reset
// to the recommended 4 groups of 4.
export function MastersFormatPicker({
    value,
    onChange,
    disabled,
}: {
    value: MastersFormat;
    onChange: (format: MastersFormat) => void;
    disabled?: boolean;
}) {
    const teams = mastersTeamCount(value);
    const groupMatches = value.groupCount * (value.teamsPerGroup * (value.teamsPerGroup - 1)) / 2;
    const firstStage = mastersKnockoutStages(value.groupCount)[0];
    const recommended = isRecommendedMastersFormat(value);

    return (
        <div className="space-y-3">
            <Row label="Groups">
                {MASTERS_GROUP_COUNTS.map(n => (
                    <Choice key={n} selected={value.groupCount === n} disabled={disabled} onClick={() => onChange({ ...value, groupCount: n })}>
                        {n}
                    </Choice>
                ))}
            </Row>
            <Row label="Teams per group">
                {MASTERS_TEAMS_PER_GROUP.map(n => (
                    <Choice key={n} selected={value.teamsPerGroup === n} disabled={disabled} onClick={() => onChange({ ...value, teamsPerGroup: n })}>
                        {n}
                    </Choice>
                ))}
            </Row>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-500">
                    {teams} teams · {teams * 2} players · {groupMatches} group matches · {value.teamsPerGroup - 1} per team ·
                    {" "}top 2 {value.groupCount === 1 ? "play the Final" : `to the ${STAGE_INFO[firstStage].title.toLowerCase()}`}
                </span>
                {recommended ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold">Recommended</span>
                ) : (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(RECOMMENDED_MASTERS_FORMAT)}
                        className="px-2 py-0.5 rounded-full border border-emerald-300 text-emerald-600 font-semibold hover:bg-emerald-50 disabled:opacity-50"
                    >
                        Use recommended: 4 groups of 4
                    </button>
                )}
            </div>
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 w-32 shrink-0">{label}</span>
            <div className="flex flex-wrap gap-2">{children}</div>
        </div>
    );
}

function Choice({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`w-10 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                selected ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
            }`}
        >
            {children}
        </button>
    );
}
