import { useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";
import { AuthCard } from "./emailLinks";
import { safeRedirect } from "./authHelpers";

// Opened from the confirmation email: confirms the address, logs the account in and goes
// on to where the person was heading when they signed up (e.g. the tournament to join).
export function ConfirmEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();
    const token = searchParams.get("token") ?? "";
    const redirect = safeRedirect(searchParams.get("redirect"));

    const confirm = trpc.auth.confirmEmail.useMutation({
        onSuccess: (data) => {
            login(data.token);
            toast.success(data.pendingApproval ? "Email confirmed! An admin will confirm your profile soon." : "Email confirmed — welcome!");
            navigate(redirect ?? "/", { replace: true });
        },
    });

    // The link works once, so it's sent once (React's dev mode runs effects twice).
    const sent = useRef(false);
    useEffect(() => {
        if (sent.current || !token) return;
        sent.current = true;
        confirm.mutate({ token });
    }, [token, confirm]);

    return (
        <AuthCard title="Confirming your email">
            {!token || confirm.isError ? (
                <>
                    <p className="text-sm text-red-500">
                        {confirm.error?.message ?? "This link is incomplete — open it straight from the email."}
                    </p>
                    <p className="text-sm text-gray-500">
                        Already confirmed? <Link to="/login" className="text-[#FF4200] font-semibold hover:underline">Log in</Link>.
                        Otherwise log in to get a new link.
                    </p>
                </>
            ) : (
                <p className="text-sm text-gray-500">One moment…</p>
            )}
        </AuthCard>
    );
}
