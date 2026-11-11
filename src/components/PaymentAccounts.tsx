import { useState } from "react";

// Where players pay for a tournament (backend PaymentAccount): a bank account by IBAN,
// or a Revolut / BT Pay handle — the same as the hikes app.

export type PaymentAccount = {
    id: string;
    type: string; // "bank" | "revolut" | "btpay"
    bankName: string | null;
    accountHolder: string;
    iban: string | null;
    paymentHandle: string | null;
    notes: string | null;
    isActive: boolean;
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = { bank: "Bank transfer", revolut: "Revolut", btpay: "BT Pay" };

export function accountTitle(a: PaymentAccount): string {
    return a.type === "bank" ? a.bankName || "Bank transfer" : PAYMENT_TYPE_LABELS[a.type] ?? a.type;
}

// What players copy: the IBAN (grouped in fours, as banks print it) or the handle.
export function accountValue(a: PaymentAccount): string {
    if (a.type === "bank") return (a.iban ?? "").replace(/(.{4})/g, "$1 ").trim();
    return a.paymentHandle ?? "";
}

// A Revolut @tag opens revolut.me.
function revolutLink(a: PaymentAccount): string | null {
    return a.type === "revolut" && a.paymentHandle?.startsWith("@") ? `https://revolut.me/${a.paymentHandle.slice(1)}` : null;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text.replace(/\s+/g, ""));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch { /* clipboard blocked — the text can still be selected */ }
            }}
            className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg border border-[#E5E5EA] text-[#3A3A4E] hover:border-[#FF4200] hover:text-[#FF4200] transition-colors"
        >
            {copied ? "Copied ✓" : "Copy"}
        </button>
    );
}

// The sign-up sheet's "how to pay" box: the amount to send now (the advance, or else the
// full price) and every account it can go to.
export function PayTo({ accounts, entryFee, advanceFee, tournamentName }: {
    accounts: PaymentAccount[];
    entryFee: number | null;
    advanceFee: number | null;
    tournamentName: string;
}) {
    const amount = advanceFee ?? entryFee;
    if (accounts.length === 0 || amount === null || amount === 0) return null;
    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div>
                <p className="text-sm font-black text-amber-900">💳 How to pay</p>
                <p className="text-sm text-amber-800 mt-0.5">
                    Send <b>{amount} lei</b>{advanceFee !== null ? " (the advance)" : ""} to one of these to confirm your spot.
                    Write your name and <i>{tournamentName}</i> in the payment details.
                    {advanceFee !== null && entryFee !== null && entryFee > advanceFee && ` The other ${entryFee - advanceFee} lei are paid on the day.`}
                </p>
            </div>
            {accounts.map(a => {
                const link = revolutLink(a);
                return (
                    <div key={a.id} className="bg-white rounded-xl border border-amber-100 p-3">
                        <p className="text-sm font-bold text-[#1A1A2E]">{accountTitle(a)}</p>
                        <p className="text-xs text-[#8E8E93]">{a.accountHolder}</p>
                        <div className="flex items-center justify-between gap-2 mt-1.5">
                            <span className="font-mono text-[13px] sm:text-sm text-[#1A1A2E] break-words">{accountValue(a)}</span>
                            <CopyButton text={accountValue(a)} />
                        </div>
                        {link && (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center mt-2 bg-[#1A1A2E] text-white text-xs font-bold px-3 py-2 rounded-lg"
                            >
                                Pay with Revolut ↗
                            </a>
                        )}
                        {a.notes && <p className="text-xs text-[#8E8E93] mt-1.5">{a.notes}</p>}
                    </div>
                );
            })}
        </div>
    );
}
