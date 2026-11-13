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

export const PAYMENT_TYPE_LABELS: Record<string, string> = { bank: "Other bank", revolut: "Revolut", btpay: "BT Pay" };

export function accountTitle(a: PaymentAccount): string {
    return a.type === "bank" ? a.bankName || "Bank" : PAYMENT_TYPE_LABELS[a.type] ?? a.type;
}

// What players copy: the IBAN (grouped in fours, as banks print it) and/or the phone
// number or handle — a bank can have either or both.
export function accountValues(a: PaymentAccount): string[] {
    const iban = a.type === "bank" && a.iban ? a.iban.replace(/(.{4})/g, "$1 ").trim() : null;
    return [iban, a.paymentHandle].filter((v): v is string => !!v);
}

export function accountValue(a: PaymentAccount): string {
    return accountValues(a).join(" · ");
}
