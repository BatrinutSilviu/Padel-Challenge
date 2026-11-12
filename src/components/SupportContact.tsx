import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../trpc";
import { divisionLabel } from "../lib/divisions";

// Who players contact for help (backend site.contact): a name and a phone number, with
// buttons to call or write on WhatsApp. Shows nothing until an admin sets a number.

// wa.me wants the number in international form, digits only: a Romanian 07… becomes 407….
export function whatsappNumber(phone: string): string {
    const digits = phone.replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) return digits.slice(1);
    if (digits.startsWith("00")) return digits.slice(2);
    if (digits.startsWith("0")) return `40${digits.slice(1)}`;
    return digits;
}

export function SupportContact({ context }: { context?: string }) {
    const { data: contacts } = trpc.site.contacts.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
    if (!contacts?.length) return null;
    const text = context ? `?text=${encodeURIComponent(`Salut! Am o întrebare despre ${context}.`)}` : "";
    return (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 space-y-3">
            <p className="text-sm font-bold text-[#1A1A2E]">Questions? We're here to help</p>
            {contacts.map((c, i) => (
                <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${i > 0 ? "pt-3 border-t border-[#F5F5F7]" : ""}`}>
                    <p className="text-sm text-[#8E8E93] min-w-0">
                        {c.name ? <span className="font-semibold text-[#1A1A2E]">{c.name}</span> : null}
                        {c.name ? " · " : ""}
                        <a href={`tel:${c.phone!.replace(/\s+/g, "")}`} className="font-semibold text-[#1A1A2E] whitespace-nowrap">{c.phone}</a>
                    </p>
                    <div className="flex gap-2 shrink-0">
                        {c.whatsapp && (
                            <a
                                href={`https://wa.me/${whatsappNumber(c.phone!)}${text}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 sm:flex-none text-center text-sm font-bold px-4 py-2.5 rounded-xl bg-[#25D366] text-white hover:opacity-90"
                            >
                                WhatsApp
                            </a>
                        )}
                        <a
                            href={`tel:${c.phone!.replace(/\s+/g, "")}`}
                            className="flex-1 sm:flex-none text-center text-sm font-bold px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1A1A2E] hover:border-[#FF4200]"
                        >
                            Call
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Admin: the people players can contact — as many as needed, in the order shown.
type ContactDraft = { name: string; phone: string; whatsapp: boolean };
const MAX_CONTACTS = 6;

export function SupportContactAdmin() {
    const qc = useQueryClient();
    const { data } = trpc.site.contacts.useQuery();
    const [rows, setRows] = useState<ContactDraft[]>([]);
    const [msg, setMsg] = useState("");
    useEffect(() => {
        if (!data) return;
        const saved = data.map(c => ({ name: c.name ?? "", phone: c.phone ?? "", whatsapp: c.whatsapp }));
        setRows(saved.length > 0 ? saved : [{ name: "", phone: "", whatsapp: true }]);
    }, [data]);
    const save = trpc.site.setContacts.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.site.contacts) });
            setMsg("Saved.");
            setTimeout(() => setMsg(""), 3000);
        },
        onError: e => setMsg(`Error: ${e.message}`),
    });
    const setRow = (i: number, change: Partial<ContactDraft>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...change } : r)));
    const field = "border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full";
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
                {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
            </div>
        </div>
    );
}

// Admin: who the privacy policy names as the data controller, and the privacy email.
export function PrivacyAdmin() {
    const qc = useQueryClient();
    const { data } = trpc.site.privacy.useQuery();
    const [controller, setController] = useState("");
    const [email, setEmail] = useState("");
    const [msg, setMsg] = useState("");
    useEffect(() => {
        if (!data) return;
        setController(data.controller ?? "");
        setEmail(data.email ?? "");
    }, [data]);
    const save = trpc.site.setPrivacy.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.site.privacy) });
            setMsg("Saved.");
            setTimeout(() => setMsg(""), 3000);
        },
        onError: e => setMsg(`Error: ${e.message}`),
    });
    const field = "border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full";
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
                {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
            </div>
        </div>
    );
}

// Admin: what each level (division) means, shown on division and tournament pages.
// Leaving one empty puts its default back.
export function DivisionDescriptionsAdmin() {
    const qc = useQueryClient();
    const { data } = trpc.site.divisionDescriptions.useQuery();
    const [texts, setTexts] = useState<Record<number, string>>({});
    const [msg, setMsg] = useState("");
    useEffect(() => { if (data) setTexts(data); }, [data]);
    const save = trpc.site.setDivisionDescriptions.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.site.divisionDescriptions) });
            setMsg("Saved.");
            setTimeout(() => setMsg(""), 3000);
        },
        onError: e => setMsg(`Error: ${e.message}`),
    });
    const field = "border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full";
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div>
                <h2 className="text-base font-semibold text-gray-800">Levels</h2>
                <p className="text-xs text-gray-500">What each level means, shown on its division page, the home page and its tournaments. Empty a box to get the default back.</p>
            </div>
            {[1, 2, 3, 4, 5, 6].map(d => (
                <label key={d} className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">{d === 6 ? "Beginner" : `Division ${d} — ${divisionLabel(d)}`}</span>
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
                {msg && <p className={`text-sm ${msg.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{msg}</p>}
            </div>
        </div>
    );
}
