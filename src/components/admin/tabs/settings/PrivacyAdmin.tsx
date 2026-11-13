import { useEffect, useState } from "react";
import { trpc } from "../../../../trpc";
import { field } from "../../formStyles";
import { SaveMessage } from "./SaveMessage";
import { useFlashMessage } from "./useFlashMessage";

// Admin: who the privacy policy names as the data controller, and the privacy email.
export function PrivacyAdmin() {
    const utils = trpc.useUtils();
    const { data } = trpc.site.privacy.useQuery();
    const [controller, setController] = useState("");
    const [email, setEmail] = useState("");
    const { message, flash, fail } = useFlashMessage();
    useEffect(() => {
        if (!data) return;
        setController(data.controller ?? "");
        setEmail(data.email ?? "");
    }, [data]);
    const save = trpc.site.setPrivacy.useMutation({
        onSuccess: () => {
            utils.site.privacy.invalidate();
            flash("Saved.");
        },
        onError: fail,
    });
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div>
                <h2 className="text-base font-semibold text-gray-800">Privacy policy (GDPR)</h2>
                <p className="text-xs text-gray-500">
                    Named on the <a href="/privacy" target="_blank" className="text-[#FF4200]">privacy policy</a> page: the organisation as registered, and where people send privacy requests.
                </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
                <input value={controller} onChange={e => setController(e.target.value)} placeholder="Organisation, e.g. Asociația … (CIF …)" maxLength={200} className={field} />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Privacy email" type="email" maxLength={120} className={field} />
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => save.mutate({ controller: controller.trim() || null, email: email.trim() || null })}
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
