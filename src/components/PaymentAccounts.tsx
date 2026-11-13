import { useState } from "react";
import { accountTitle, accountValues, type PaymentAccount } from "../lib/paymentAccounts";

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
            className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-md border border-[#E5E5EA] text-[#3A3A4E] hover:border-[#FF4200] hover:text-[#FF4200] transition-colors"
        >
            {copied ? "Copied ✓" : "Copy"}
        </button>
    );
}

// The "how to pay" box, on every tournament page: the amount to send now (the advance, or
// else the full price) when there is one, and every account it can go to — kept compact,
// one short row per account.
export function PayTo({ accounts, entryFee, advanceFee, tournamentName }: {
    accounts: PaymentAccount[];
    entryFee: number | null;
    advanceFee: number | null;
    tournamentName: string;
}) {
    const amount = advanceFee ?? entryFee;
    if (accounts.length === 0 || amount === 0) return null; // 0 = free
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs text-amber-900">
                <span className="font-black">💳 How to pay:</span>{" "}
                {amount !== null ? <>send <b>{amount} lei</b> to one of these</> : <>pay to one of these</>}, with your name and <i>{tournamentName}</i> in the details.
            </p>
            <ul className="mt-1.5 divide-y divide-amber-100 bg-white rounded-lg border border-amber-100">
                {accounts.map(a => {
                    const link = revolutLink(a);
                    return (
                        <li key={a.id} className="px-2.5 py-1.5">
                            <p className="text-xs text-[#8E8E93] truncate">
                                <span className="font-bold text-[#1A1A2E]">{accountTitle(a)}</span> · {a.accountHolder}
                                {a.notes && <> · {a.notes}</>}
                            </p>
                            {accountValues(a).map(v => (
                                <div key={v} className="flex items-center justify-between gap-2">
                                    {link && v === a.paymentHandle ? (
                                        <a href={link} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#FF4200] font-semibold [overflow-wrap:anywhere]">{v} ↗</a>
                                    ) : (
                                        <span className="font-mono text-xs text-[#1A1A2E] [overflow-wrap:anywhere]">{v}</span>
                                    )}
                                    <CopyButton text={v} />
                                </div>
                            ))}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
