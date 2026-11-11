import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../trpc";

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
    const { data } = trpc.site.contact.useQuery(undefined, { staleTime: 10 * 60 * 1000 });
    if (!data?.phone) return null;
    const text = context ? `?text=${encodeURIComponent(`Salut! Am o întrebare despre ${context}.`)}` : "";
    return (
        <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm font-bold text-[#1A1A2E]">Questions? We're here to help</p>
                <p className="text-sm text-[#8E8E93]">
                    {data.name ? `${data.name} · ` : ""}<a href={`tel:${data.phone.replace(/\s+/g, "")}`} className="font-semibold text-[#1A1A2E]">{data.phone}</a>
                </p>
            </div>
            <div className="flex gap-2 shrink-0">
                {data.whatsapp && (
                    <a
                        href={`https://wa.me/${whatsappNumber(data.phone)}${text}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none text-center text-sm font-bold px-4 py-2.5 rounded-xl bg-[#25D366] text-white hover:opacity-90"
                    >
                        WhatsApp
                    </a>
                )}
                <a
                    href={`tel:${data.phone.replace(/\s+/g, "")}`}
                    className="flex-1 sm:flex-none text-center text-sm font-bold px-4 py-2.5 rounded-xl border border-[#E5E5EA] text-[#1A1A2E] hover:border-[#FF4200]"
                >
                    Call
                </a>
            </div>
        </div>
    );
}

// Admin: setting the contact.
export function SupportContactAdmin() {
    const qc = useQueryClient();
    const { data } = trpc.site.contact.useQuery();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsapp, setWhatsapp] = useState(true);
    const [msg, setMsg] = useState("");
    useEffect(() => {
        if (!data) return;
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setWhatsapp(data.phone ? data.whatsapp : true);
    }, [data]);
    const save = trpc.site.setContact.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.site.contact) });
            setMsg("Saved.");
            setTimeout(() => setMsg(""), 3000);
        },
        onError: e => setMsg(`Error: ${e.message}`),
    });
    const field = "border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full";
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div>
                <h2 className="text-base font-semibold text-gray-800">Support contact</h2>
                <p className="text-xs text-gray-500">Shown on tournament pages so players can ask for help. Leave the number empty to hide it.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional), e.g. Dani" maxLength={60} className={field} />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone, e.g. 0722 123 456" maxLength={30} inputMode="tel" className={field} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)} className="w-4 h-4 accent-[#FF4200]" />
                Also on WhatsApp
            </label>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => save.mutate({ name: name.trim() || null, phone: phone.trim() || null, whatsapp })}
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
