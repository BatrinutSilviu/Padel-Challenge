import { useEffect, useState } from "react";
import { trpc } from "../../../../trpc";
import { field } from "../../formStyles";
import { SaveMessage } from "./SaveMessage";
import { useFlashMessage } from "./useFlashMessage";

// Admin: the people players can contact — as many as needed, in the order shown.
type ContactDraft = { name: string; phone: string; whatsapp: boolean };
const MAX_CONTACTS = 6;

export function SupportContactsAdmin() {
    const utils = trpc.useUtils();
    const { data } = trpc.site.contacts.useQuery();
    const [rows, setRows] = useState<ContactDraft[]>([]);
    const { message, flash, fail } = useFlashMessage();
    useEffect(() => {
        if (!data) return;
        const saved = data.map(c => ({ name: c.name ?? "", phone: c.phone ?? "", whatsapp: c.whatsapp }));
        setRows(saved.length > 0 ? saved : [{ name: "", phone: "", whatsapp: true }]);
    }, [data]);
    const save = trpc.site.setContacts.useMutation({
        onSuccess: () => {
            utils.site.contacts.invalidate();
            flash("Saved.");
        },
        onError: fail,
    });
    const setRow = (i: number, change: Partial<ContactDraft>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...change } : r)));
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div>
                <h2 className="text-base font-semibold text-gray-800">Support contacts</h2>
                <p className="text-xs text-gray-500">Shown on tournament pages so players can ask for help, in this order. A person without a phone number isn't shown.</p>
            </div>
            {rows.map((r, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-2.5 space-y-2">
                    <div className="grid sm:grid-cols-2 gap-2">
                        <input value={r.name} onChange={e => setRow(i, { name: e.target.value })} placeholder="Name, e.g. Dani" maxLength={60} className={field} aria-label="Contact name" />
                        <input value={r.phone} onChange={e => setRow(i, { phone: e.target.value })} placeholder="Phone, e.g. 0722 123 456" maxLength={30} inputMode="tel" className={field} aria-label="Contact phone" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={r.whatsapp} onChange={e => setRow(i, { whatsapp: e.target.checked })} className="w-4 h-4 accent-[#FF4200]" />
                            Also on WhatsApp
                        </label>
                        <button
                            type="button"
                            onClick={() => setRows(rows.filter((_, j) => j !== i))}
                            className="text-xs font-medium px-3 py-2 rounded-lg border border-red-200 text-red-600"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => setRows([...rows, { name: "", phone: "", whatsapp: true }])}
                    disabled={rows.length >= MAX_CONTACTS}
                    className="text-sm font-medium px-3 py-2 rounded-lg border border-[#FF4200] text-[#FF4200] disabled:opacity-40"
                >
                    + Add person
                </button>
                <button
                    onClick={() => save.mutate(rows.map(r => ({ name: r.name.trim() || null, phone: r.phone.trim() || null, whatsapp: r.whatsapp })))}
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
