import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../../../trpc";
import { divisionLabel } from "../../../../lib/divisions";
import { field } from "../../formStyles";
import { SaveMessage } from "./SaveMessage";
import { useFlashMessage } from "./useFlashMessage";

// Admin: what each level (division) means, shown on division and tournament pages.
// Leaving one empty puts its default back.
export function DivisionDescriptionsAdmin() {
    const qc = useQueryClient();
    const { data } = trpc.site.divisionDescriptions.useQuery();
    const [texts, setTexts] = useState<Record<number, string>>({});
    const { message, flash, fail } = useFlashMessage();
    useEffect(() => { if (data) setTexts(data); }, [data]);
    const save = trpc.site.setDivisionDescriptions.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.site.divisionDescriptions) });
            flash("Saved.");
        },
        onError: fail,
    });
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div>
                <h2 className="text-base font-semibold text-gray-800">Levels</h2>
                <p className="text-xs text-gray-500">What each level means, shown on its division page, the home page and its tournaments. Empty a box to get the default back.</p>
            </div>
            {[1, 2, 3, 4, 5, 6].map(d => (
                <label key={d} className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">{divisionLabel(d)}</span>
                    <textarea
                        value={texts[d] ?? ""}
                        onChange={e => setTexts({ ...texts, [d]: e.target.value })}
                        rows={2}
                        maxLength={600}
                        className={field}
                    />
                </label>
            ))}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => save.mutate(Object.fromEntries(Object.entries(texts).map(([d, t]) => [d, t.trim()])))}
                    disabled={save.isPending}
                    className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-medium disabled:opacity-50"
                >
                    {save.isPending ? "Saving…" : "Save"}
                </button>
                <SaveMessage message={message} />
            </div>
        </div>
    );
}
