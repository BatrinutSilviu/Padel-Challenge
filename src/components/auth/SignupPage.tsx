import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileStep, identityInput, type Identity } from "./ProfileStep";
import { GoogleSignInButton, type GoogleSignup } from "./GoogleSignInButton";

// Creating an account: pick (or create) your player profile, then either an email and
// password, or — arriving here from "Continue with Google" without an account — just
// confirm. Claiming an existing profile creates the account straight away, but an admin
// has to approve the claim before it plays as that player.
export function SignupPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const redirect = searchParams.get("redirect");
    const { login } = useAuth();
    const google = (location.state as { google?: GoogleSignup } | null)?.google ?? null;

    const [identity, setIdentity] = useState<Identity | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    function onCreated(data: { token: string; pendingApproval: boolean }) {
        login(data.token);
        toast.success(data.pendingApproval ? "Account created! An admin will confirm your profile soon." : "Account created!");
        navigate(redirect ?? "/");
    }

    const signup = trpc.auth.signup.useMutation({ onSuccess: onCreated, onError: (e) => setError(e.message) });
    const googleSignup = trpc.auth.googleSignup.useMutation({ onSuccess: onCreated, onError: (e) => setError(e.message) });
    const pending = signup.isPending || googleSignup.isPending;

    const emailValid = /^\S+@\S+\.\S+$/.test(email);
    const passwordValid = password.length >= 8;
    const passwordsMatch = password === confirmPassword;
    const canSubmit = !!identity && (google ? true : emailValid && passwordValid && passwordsMatch);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!canSubmit || !identity) return;
        if (google) {
            googleSignup.mutate({ signupToken: google.signupToken, player: identityInput(identity) });
        } else {
            signup.mutate({ email, password, player: identityInput(identity) });
        }
    }

    function resetIdentity() {
        setIdentity(null);
        setError("");
    }

    const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]";

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 w-full max-w-md space-y-5 shadow-sm">
                    <div>
                        <h1 className="text-xl font-black text-[#1A1A2E]">Create an account</h1>
                        {google && (
                            <p className="text-sm text-gray-500 mt-1">
                                Signing up with Google as <span className="font-semibold text-gray-700">{google.email}</span>
                            </p>
                        )}
                    </div>

                    {!google && !identity && <GoogleSignInButton redirect={redirect} />}

                    {!identity ? (
                        <ProfileStep initialName={google?.name ?? ""} onChoose={setIdentity} />
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="bg-[#F5F5F7] rounded-lg px-3 py-2.5 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm text-gray-700 min-w-0 truncate">
                                        Signing up as <span className="font-semibold">{identity.name}</span>
                                        {identity.mode === "new" && <span className="text-gray-400"> (new player)</span>}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={resetIdentity}
                                        className="shrink-0 text-xs font-semibold text-[#FF4200] hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                                {identity.mode === "existing" && (
                                    <p className="text-xs text-gray-500">
                                        An admin will confirm it's you. Until then you can log in and look around, but not sign up for tournaments.
                                    </p>
                                )}
                            </div>

                            {!google && (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className={inputClass}
                                            placeholder="you@example.com"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={inputClass}
                                            placeholder="At least 8 characters"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Confirm password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className={inputClass}
                                            placeholder="Repeat password"
                                        />
                                        {!passwordsMatch && confirmPassword.length > 0 && (
                                            <p className="text-xs text-red-500">Passwords don't match</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <button
                                type="submit"
                                disabled={!canSubmit || pending}
                                className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                            >
                                {pending ? "Creating account…" : "Create account"}
                            </button>
                        </form>
                    )}

                    <p className="text-sm text-center text-gray-500">
                        Already have an account?{" "}
                        <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"} className="text-[#FF4200] font-semibold hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
