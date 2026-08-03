import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";

type PlayerMode = "existing" | "new";

export function SignupPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    const { data: players } = trpc.player.list.useQuery();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [mode, setMode] = useState<PlayerMode>("existing");
    const [search, setSearch] = useState("");
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [newPlayerName, setNewPlayerName] = useState("");
    const [error, setError] = useState("");

    const signup = trpc.auth.signup.useMutation({
        onSuccess: (data) => {
            login(data.token);
            toast.success("Account created!");
            navigate(searchParams.get("redirect") ?? "/matches/new");
        },
        onError: (e) => setError(e.message),
    });

    const filteredPlayers = (players ?? []).filter(p =>
        search === "" || p.name.toLowerCase().includes(search.toLowerCase())
    );

    const emailValid = /^\S+@\S+\.\S+$/.test(email);
    const passwordValid = password.length >= 8;
    const passwordsMatch = password === confirmPassword;
    const playerChosen = mode === "existing" ? !!selectedPlayerId : newPlayerName.trim().length > 0;
    const canSubmit = emailValid && passwordValid && passwordsMatch && playerChosen;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!canSubmit) return;
        signup.mutate({
            email,
            password,
            player: mode === "existing"
                ? { mode: "existing", playerId: selectedPlayerId! }
                : { mode: "new", name: newPlayerName.trim() },
        });
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-2xl border border-[#E5E5EA] p-8 w-full max-w-md space-y-5 shadow-sm"
                >
                    <h1 className="text-xl font-black text-[#1A1A2E]">Create an account</h1>

                    <div className="space-y-3">
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
                                placeholder="At least 8 characters"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Confirm password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                                placeholder="Repeat password"
                            />
                            {!passwordsMatch && confirmPassword.length > 0 && (
                                <p className="text-xs text-red-500">Passwords don't match</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#F5F5F7]">
                        <p className="text-sm font-medium text-gray-700">Which player are you?</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setMode("existing")}
                                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg border transition-colors ${
                                    mode === "existing"
                                        ? "bg-[#FF4200] text-white border-[#FF4200]"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-[#FF4200]"
                                }`}
                            >
                                I'm already a player
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("new")}
                                className={`flex-1 text-sm font-semibold py-2.5 rounded-lg border transition-colors ${
                                    mode === "new"
                                        ? "bg-[#FF4200] text-white border-[#FF4200]"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-[#FF4200]"
                                }`}
                            >
                                I'm new
                            </button>
                        </div>

                        {mode === "existing" ? (
                            <div className="space-y-2">
                                <input
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setSelectedPlayerId(null); }}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                                    placeholder="Search your name…"
                                />
                                {search && (
                                    <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                        {filteredPlayers.length === 0 ? (
                                            <p className="text-sm text-gray-400 px-3 py-3">No matching players</p>
                                        ) : (
                                            filteredPlayers.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => { setSelectedPlayerId(p.id); setSearch(p.name); }}
                                                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-[#FF4200]/5 hover:text-[#FF4200] ${
                                                        selectedPlayerId === p.id ? "bg-[#FF4200]/10 text-[#FF4200] font-semibold" : "text-gray-700"
                                                    }`}
                                                >
                                                    {p.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <input
                                value={newPlayerName}
                                onChange={e => setNewPlayerName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                                placeholder="Your full name"
                            />
                        )}
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <button
                        type="submit"
                        disabled={!canSubmit || signup.isPending}
                        className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                    >
                        {signup.isPending ? "Creating account…" : "Create account"}
                    </button>
                    <p className="text-sm text-center text-gray-500">
                        Already have an account?{" "}
                        <Link to="/login" className="text-[#FF4200] font-semibold hover:underline">
                            Log in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
