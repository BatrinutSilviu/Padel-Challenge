import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";

export function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const userLogin = trpc.auth.userLogin.useMutation({
        onSuccess: (data) => {
            login(data.token);
            toast.success("Welcome back!");
            navigate(searchParams.get("redirect") ?? "/");
        },
        onError: () => setError("Invalid email or password"),
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
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
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                            placeholder="Enter your password"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                        type="submit"
                        disabled={userLogin.isPending}
                        className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                    >
                        {userLogin.isPending ? "Logging in…" : "Log in"}
                    </button>
                    <p className="text-sm text-center text-gray-500">
                        New here?{" "}
                        <Link to="/signup" className="text-[#FF4200] font-semibold hover:underline">
                            Create an account
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
