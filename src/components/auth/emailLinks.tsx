import { useState, type ReactNode } from "react";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";

// Shared bits of the email flows: confirming a new account's address, and resetting a password.

// The page frame the auth pages share.
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="min-h-screen bg-canvas">
            <NavBar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
                <div className="bg-surface rounded-2xl border border-line p-8 w-full max-w-sm space-y-4 shadow-sm">
                    <h1 className="text-xl font-bold text-ink">{title}</h1>
                    {children}
                </div>
            </div>
        </div>
    );
}

// "Resend the confirmation email". The backend answers the same whether or not it sent one.
export function ResendConfirmationButton({ email, redirect }: { email: string; redirect: string | null }) {
    const [sent, setSent] = useState(false);
    const resend = trpc.auth.resendConfirmation.useMutation({ onSuccess: () => setSent(true) });
    if (sent) return <p className="text-sm text-gray-600">Sent — check your inbox (and the spam folder).</p>;
    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={() => resend.mutate({ email, redirect: redirect ?? undefined })}
                disabled={resend.isPending || !email}
                className="text-sm font-semibold text-[#FF4200] hover:underline disabled:opacity-50"
            >
                {resend.isPending ? "Sending…" : "Resend the confirmation email"}
            </button>
            {resend.error && <p className="text-sm text-red-500">{resend.error.message}</p>}
        </div>
    );
}

// After signing up with email and password: the account waits for the link we emailed.
export function CheckInbox({ email, redirect }: { email: string; redirect: string | null }) {
    return (
        <div className="space-y-3">
            <p className="text-sm text-gray-700">
                We've sent a confirmation link to <span className="font-semibold">{email}</span>.
                Open it to finish creating your account — it works for 24 hours.
            </p>
            <p className="text-sm text-gray-500">Nothing there? Check the spam folder, or:</p>
            <ResendConfirmationButton email={email} redirect={redirect} />
        </div>
    );
}
