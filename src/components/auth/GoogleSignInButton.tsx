import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";

// "Continue with Google", through Google Identity Services: Google's own button hands us
// an ID token, which the backend verifies (auth.googleLogin). Google's button only comes in a
// few fixed looks that clash with the site, so ours is drawn in the site's style and Google's
// real one sits on top of it, invisible, taking the clicks. It logs in a known account,
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
                    locale: "en",
                    size: "large",
                    text: "continue_with",
                    shape: "rectangular",
                    logo_alignment: "center",
                    // As wide as ours, so a click anywhere on it lands on Google's.
                    width: Math.min(el.offsetWidth || 320, 400),
                });
            })
            .catch(e => { if (!cancelled) setError(e.message); });
        return () => { cancelled = true; };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <div className="space-y-4">
            <div className="group relative h-12">
                {/* What people see: a button in the site's own style. */}
                <div
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-surface text-base font-medium text-ink transition-colors group-hover:border-gray-400 group-hover:bg-canvas group-focus-within:ring-2 group-focus-within:ring-[#FF4200]"
                >
                    <GoogleLogo />
                    Continue with Google
                </div>
                {/* Google's real button, on top and invisible, takes the click. color-scheme light:
                    otherwise Chrome paints its iframe on an opaque white box on the dark site. */}
                <div ref={buttonRef} className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.01] [color-scheme:light]" />
            </div>
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

// Google's "G", in its own colours (as Google's branding asks).
function GoogleLogo() {
    return (
        <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
        </svg>
    );
}
