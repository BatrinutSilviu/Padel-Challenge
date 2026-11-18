import { trpc } from "../trpc";

// Who players contact for help (backend site.contact): a name and a phone number, with
// buttons to call or write on WhatsApp. Shows nothing until an admin sets a number.

// wa.me wants the number in international form, digits only: a Romanian 07… becomes 407….
function whatsappNumber(phone: string): string {
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
        <div className="bg-surface rounded-2xl border border-line p-4 space-y-3">
            <p className="text-sm font-bold text-ink">Questions? We're here to help</p>
            {contacts.map((c, i) => (
                <div key={i} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${i > 0 ? "pt-3 border-t border-canvas" : ""}`}>
                    <p className="text-sm text-muted min-w-0">
                        {c.name ? <span className="font-semibold text-ink">{c.name}</span> : null}
                        {c.name ? " · " : ""}
                        <a href={`tel:${c.phone!.replace(/\s+/g, "")}`} className="font-semibold text-ink whitespace-nowrap">{c.phone}</a>
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
                            className="flex-1 sm:flex-none text-center text-sm font-bold px-4 py-2.5 rounded-xl border border-line text-ink hover:border-[#FF4200]"
                        >
                            Call
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
}
