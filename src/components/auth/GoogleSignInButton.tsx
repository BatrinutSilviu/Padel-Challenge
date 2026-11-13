import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";

// "Continue with Google", through Google Identity Services: Google's own button hands us
// an ID token, which the backend verifies (auth.googleLogin). It logs in a known account,
// or — for someone without one yet — continues on the sign-up page's profile step.
// Hidden unless both the frontend (VITE_GOOGLE_CLIENT_ID) and the backend have a client id.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleIdApi = {
    initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: "popup" }) => void;
    renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
    interface Window {
        google?: { accounts: { id: GoogleIdApi } };
    }
}

let gsiLoading: Promise<void> | null = null;

function loadGsi(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    gsiLoading ??= new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = GSI_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => { gsiLoading = null; reject(new Error("Couldn't load Google sign-in")); };
        document.head.appendChild(script);
    });
    return gsiLoading;
}

// What the sign-up page needs to finish a Google sign-up (passed as router state).
export type GoogleSignup = { signupToken: string; email: string; name: string | null };

export function GoogleSignInButton({ redirect }: { redirect: string | null }) {
    const navigate = useNavigate();
    const { login } = useAuth();
    const buttonRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState("");
    const config = trpc.auth.config.useQuery(undefined, { enabled: !!CLIENT_ID, staleTime: Infinity });
    const enabled = !!CLIENT_ID && config.data?.google === true;

    const googleLogin = trpc.auth.googleLogin.useMutation({
        onSuccess: data => {
            if (data.status === "LOGGED_IN") {
                login(data.token);
                toast.success("Welcome!");
                navigate(redirect ?? "/");
            } else {
                const google: GoogleSignup = { signupToken: data.signupToken, email: data.email, name: data.name };
                navigate(redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup", { state: { google } });
            }
        },
        onError: e => setError(e.message),
    });
    // The GSI callback is registered once; keep it pointing at the current mutation.
    const mutateRef = useRef(googleLogin.mutate);
    mutateRef.current = googleLogin.mutate;

    useEffect(() => {
        if (!enabled || !CLIENT_ID) return;
        let cancelled = false;
        loadGsi()
            .then(() => {
                const el = buttonRef.current;
                const api = window.google?.accounts.id;
                if (cancelled || !el || !api) return;
                api.initialize({
                    client_id: CLIENT_ID,
                    ux_mode: "popup",
                    callback: response => { setError(""); mutateRef.current({ credential: response.credential }); },
                });
                api.renderButton(el, {
                    type: "standard",
                    theme: "outline",
                    size: "large",
                    text: "continue_with",
                    shape: "rectangular",
                    logo_alignment: "center",
                    width: Math.min(el.offsetWidth || 320, 400),
                });
            })
            .catch(e => { if (!cancelled) setError(e.message); });
        return () => { cancelled = true; };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <div className="space-y-4">
            <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]" />
            {googleLogin.isPending && <p className="text-sm text-center text-gray-400">Signing in with Google…</p>}
            {error && <p className="text-sm text-center text-red-500">{error}</p>}
            <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                or with email
                <div className="flex-1 h-px bg-gray-200" />
            </div>
        </div>
    );
}
