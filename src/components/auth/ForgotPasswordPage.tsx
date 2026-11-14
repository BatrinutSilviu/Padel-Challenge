import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../../trpc";
import { AuthCard } from "./emailLinks";
import { buttonClass, inputClass } from "./authHelpers";

// "Forgot password?": emails a link to choose a new one. The answer is the same whether or
// not the email has an account.
export function ForgotPasswordPage() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState(searchParams.get("email") ?? "");
    const request = trpc.auth.requestPasswordReset.useMutation();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        request.mutate({ email: email.trim() });
    }

    return (
        <AuthCard title="Reset your password">
            {request.isSuccess ? (
                <p className="text-sm text-gray-700">
                    If <span className="font-semibold">{email.trim()}</span> has an account, we've emailed it a link to choose
                    a new password. The link works for 1 hour — check the spam folder too.
                </p>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-gray-500">Enter your account's email and we'll send you a link to choose a new password.</p>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" autoFocus />
                    </div>
                    {request.error && <p className="text-sm text-red-500">{request.error.message}</p>}
                    <button type="submit" disabled={request.isPending || !/^\S+@\S+\.\S+$/.test(email.trim())} className={buttonClass}>
                        {request.isPending ? "Sending…" : "Send reset link"}
                    </button>
                </form>
            )}
            <p className="text-sm text-center text-gray-500">
                <Link to="/login" className="text-[#FF4200] font-semibold hover:underline">Back to log in</Link>
            </p>
        </AuthCard>
    );
}
