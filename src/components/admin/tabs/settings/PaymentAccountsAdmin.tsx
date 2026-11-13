import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../../../trpc";
import { field } from "../../formStyles";
import { PAYMENT_TYPE_LABELS, accountTitle, accountValue, type PaymentAccount } from "../../../../lib/paymentAccounts";

// Admin: the accounts players can pay into. Each tournament shows the ones picked for
// it (in its time, place, price & prizes card), or every active one.

type Draft = { type: string; bankName: string; accountHolder: string; iban: string; paymentHandle: string; notes: string };
const EMPTY: Draft = { type: "bank", bankName: "", accountHolder: "", iban: "", paymentHandle: "", notes: "" };

export function PaymentAccountsAdmin() {
    const qc = useQueryClient();
    const { data: accounts } = trpc.paymentAccount.list.useQuery();
    const [editing, setEditing] = useState<string | "new" | null>(null);
    const [draft, setDraft] = useState<Draft>(EMPTY);
    const [error, setError] = useState("");

    const refresh = () => {
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.paymentAccount.list) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.tournament.getById) });
    };
    const done = () => { refresh(); setEditing(null); setError(""); };
    const onError = (e: { message: string }) => setError(e.message);
    const create = trpc.paymentAccount.create.useMutation({ onSuccess: done, onError });
    const update = trpc.paymentAccount.update.useMutation({ onSuccess: done, onError });
    const remove = trpc.paymentAccount.delete.useMutation({ onSuccess: refresh, onError });
    const busy = create.isPending || update.isPending;

    function startEdit(a?: PaymentAccount) {
        setError("");
        setEditing(a ? a.id : "new");
        setDraft(a ? {
            type: a.type, bankName: a.bankName ?? "", accountHolder: a.accountHolder, iban: a.iban ?? "",
            paymentHandle: a.paymentHandle ?? "", notes: a.notes ?? "",
        } : EMPTY);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        const input = { ...draft, type: draft.type as "bank" | "revolut" | "btpay" };
        if (editing === "new") create.mutate(input);
        else if (editing) update.mutate({ id: editing, ...input });
    }

    const form = (
        <form onSubmit={save} className="space-y-2 bg-orange-50/40 rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
                {Object.entries(PAYMENT_TYPE_LABELS).map(([type, label]) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setDraft({ ...draft, type })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border ${draft.type === type ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 bg-white"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <input value={draft.accountHolder} onChange={e => setDraft({ ...draft, accountHolder: e.target.value })} placeholder="Account holder, e.g. Asociația Act!ve" className={field} />
            {draft.type === "bank" ? (
                <>
                    <input value={draft.bankName} onChange={e => setDraft({ ...draft, bankName: e.target.value })} placeholder="Bank, e.g. ING, Raiffeisen, CEC" className={field} />
                    <input value={draft.iban} onChange={e => setDraft({ ...draft, iban: e.target.value })} placeholder="IBAN, e.g. RO49 AAAA 1B31 0075 9384 0000" className={`${field} font-mono`} autoCapitalize="characters" />
                    <input
                        value={draft.paymentHandle}
                        onChange={e => setDraft({ ...draft, paymentHandle: e.target.value })}
                        placeholder="and/or the phone number to pay to"
                        inputMode="tel"
                        className={field}
                    />
                    <p className="text-xs text-gray-400">An IBAN, a phone number (for the bank app's pay-by-phone), or both.</p>
                </>
            ) : (
                <input
                    value={draft.paymentHandle}
                    onChange={e => setDraft({ ...draft, paymentHandle: e.target.value })}
                    placeholder={draft.type === "revolut" ? "@revtag or phone number" : "Phone number"}
                    className={field}
                />
            )}
            <input value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Note for players (optional)" className={field} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-medium disabled:opacity-50">
                    {busy ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                    Cancel
                </button>
            </div>
        </form>
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Payment accounts</h2>
                    <p className="text-xs text-gray-500">Shown on every tournament page, so players know where to pay. A tournament shows all active ones unless you pick some in its price card.</p>
                </div>
                {editing === null && (
                    <button onClick={() => startEdit()} className="shrink-0 px-3 py-2 rounded-lg bg-[#FF4200] text-white text-sm font-medium">+ Add</button>
                )}
            </div>
            {editing === "new" && form}
            {accounts?.length === 0 && editing !== "new" && <p className="text-sm text-gray-400">No accounts yet.</p>}
            {accounts?.map(a => editing === a.id ? <div key={a.id}>{form}</div> : (
                <div key={a.id} className={`flex items-start justify-between gap-3 border border-gray-100 rounded-lg p-3 ${a.isActive ? "" : "opacity-50"}`}>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                            {accountTitle(a)} {!a.isActive && <span className="text-xs font-normal text-gray-500">· hidden</span>}
                        </p>
                        <p className="text-xs text-gray-500">{a.accountHolder}</p>
                        <p className="font-mono text-xs text-gray-700 break-words mt-0.5">{accountValue(a)}</p>
                        {a.notes && <p className="text-xs text-gray-400 mt-0.5">{a.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => startEdit(a)} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">Edit</button>
                        <button
                            onClick={() => update.mutate({
                                id: a.id, type: a.type as "bank" | "revolut" | "btpay", bankName: a.bankName, accountHolder: a.accountHolder,
                                iban: a.iban, paymentHandle: a.paymentHandle, notes: a.notes, isActive: !a.isActive,
                            })}
                            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium"
                        >
                            {a.isActive ? "Hide" : "Show"}
                        </button>
                        <button
                            onClick={() => { if (confirm(`Delete ${accountTitle(a)} (${a.accountHolder})?`)) remove.mutate({ id: a.id }); }}
                            className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}
            {editing === null && error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}
