import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { ResendConfirmationButton } from "./emailLinks";
import { errorReason, safeRedirect } from "./authHelpers";

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    // The password was right but the email isn't confirmed yet: offer to send the link again.
    const [unconfirmed, setUnconfirmed] = useState(false);

    const userLogin = trpc.auth.userLogin.useMutation({
        onSuccess: (data) => {
            login(data.token);
            toast.success("Welcome back!");
            navigate(safeRedirect(searchParams.get("redirect")) ?? "/");
        },
        onError: (e) => {
            setUnconfirmed(errorReason(e) === "EMAIL_NOT_VERIFIED");
            setError(e.message || "Invalid email or password");
        },
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setUnconfirmed(false);
        userLogin.mutate({ email, password });
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-2xl border border-[#E5E5EA] p-8 w-full max-w-sm space-y-4 shadow-sm"
                >
                    <h1 className="text-xl font-black text-[#1A1A2E]">Log in</h1>
                    <GoogleSignInButton redirect={searchParams.get("redirect")} />
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            placeholder="you@example.com"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-baseline justify-between">
                            <label className="text-sm font-medium text-gray-700">Password</label>
                            <Link
                                to={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}
                                className="text-xs font-semibold text-[#FF4200] hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            placeholder="Enter your password"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {unconfirmed && <ResendConfirmationButton email={email} redirect={safeRedirect(searchParams.get("redirect"))} />}
                    <button
                        type="submit"
                        disabled={userLogin.isPending}
                        className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                    >
                        {userLogin.isPending ? "Logging in…" : "Log in"}
                    </button>
                    <p className="text-sm text-center text-gray-500">
                        New here?{" "}
                        <Link to={searchParams.get("redirect") ? `/signup?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : "/signup"} className="text-[#FF4200] font-semibold hover:underline">
                            Create an account
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
