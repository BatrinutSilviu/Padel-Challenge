import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";
import { AuthCard } from "./emailLinks";
import { buttonClass, inputClass } from "./authHelpers";

// Opened from the password-reset email: choose a new password (the same rules as sign-up).
// Saving it logs out every other session and logs this one in.
export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    // Kept from the first render, then dropped from the address bar so it isn't left in the
    // history or sent on as a referrer.
    const [token] = useState(() => {
        const t = searchParams.get("token") ?? "";
        if (t) window.history.replaceState(null, "", window.location.pathname);
        return t;
    });
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const reset = trpc.auth.resetPassword.useMutation({
        onSuccess: (data) => {
            login(data.token);
            toast.success("Password changed — you're logged in.");
            navigate("/", { replace: true });
        },
    });

    const passwordValid = password.length >= 8;
    const passwordsMatch = password === confirmPassword;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!passwordValid || !passwordsMatch) return;
        reset.mutate({ token, password });
    }

    if (!token) {
        return (
            <AuthCard title="Choose a new password">
                <p className="text-sm text-red-500">This link is incomplete — open it straight from the email.</p>
                <Link to="/forgot-password" className="text-sm text-[#FF4200] font-semibold hover:underline">Get a new link</Link>
            </AuthCard>
        );
    }

    return (
        <AuthCard title="Choose a new password">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">New password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" autoFocus autoComplete="new-password" />
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Confirm password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repeat password" autoComplete="new-password" />
                    {!passwordsMatch && confirmPassword.length > 0 && <p className="text-xs text-red-500">Passwords don't match</p>}
                </div>
                {reset.error && (
                    <p className="text-sm text-red-500">
                        {reset.error.message}{" "}
                        {reset.error.data?.code === "BAD_REQUEST" && <Link to="/forgot-password" className="font-semibold underline">Get a new link</Link>}
                    </p>
                )}
                <button type="submit" disabled={reset.isPending || !passwordValid || !passwordsMatch} className={buttonClass}>
                    {reset.isPending ? "Saving…" : "Save new password"}
                </button>
            </form>
        </AuthCard>
    );
}
