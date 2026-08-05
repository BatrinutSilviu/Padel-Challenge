import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/AuthContext";

type Identity =
    | { mode: "existing"; playerId: string; name: string }
    | { mode: "new"; name: string };

export function SignupPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();

    const [name, setName] = useState("");
    const [debouncedName, setDebouncedName] = useState("");
    const [identity, setIdentity] = useState<Identity | null>(null);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const t = setTimeout(() => setDebouncedName(name.trim()), 300);
        return () => clearTimeout(t);
    }, [name]);

    const searchReady = debouncedName.length >= 2;
    const { data: matches, isFetching: matchesLoading } = trpc.player.matchByName.useQuery(
        { name: debouncedName },
        { enabled: searchReady }
    );

    const signup = trpc.auth.signup.useMutation({
        onSuccess: (data) => {
            login(data.token);
            toast.success("Account created!");
            navigate(searchParams.get("redirect") ?? "/matches/new");
        },
        onError: (e) => setError(e.message),
    });

    const emailValid = /^\S+@\S+\.\S+$/.test(email);
    const passwordValid = password.length >= 8;
    const passwordsMatch = password === confirmPassword;
    const canSubmit = !!identity && emailValid && passwordValid && passwordsMatch;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!canSubmit || !identity) return;
        signup.mutate({
            email,
            password,
            player: identity.mode === "existing"
                ? { mode: "existing", playerId: identity.playerId }
                : { mode: "new", name: identity.name },
        });
    }

    function resetIdentity() {
        setIdentity(null);
        setError("");
    }

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 w-full max-w-md space-y-5 shadow-sm">
                    <h1 className="text-xl font-black text-[#1A1A2E]">Create an account</h1>

                    {!identity ? (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Your name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]"
                                    placeholder="Full name"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-400">We'll check if you already have a player record.</p>
                            </div>

                            {searchReady && (
                                <div className="space-y-2">
                                    {matchesLoading && <p className="text-sm text-gray-400">Searching…</p>}

                                    {!matchesLoading && (matches?.length ?? 0) > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-sm font-medium text-gray-700">Is one of these you?</p>
                                            {matches!.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2.5"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                                                        <p className="text-xs text-gray-400">Division {p.division} · {p.gender === "MALE" ? "Male" : "Female"}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIdentity({ mode: "existing", playerId: p.id, name: p.name })}
                                                        className="shrink-0 text-sm font-semibold px-3 py-2 rounded-lg bg-[#FF4200] text-white hover:bg-[#CC3500] transition-colors"
                                                    >
                                                        Yes, that's me
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!matchesLoading && (
                                        <button
                                            type="button"
                                            onClick={() => setIdentity({ mode: "new", name: name.trim() })}
                                            className="w-full text-sm font-semibold text-gray-500 border border-dashed border-gray-300 rounded-lg py-2.5 hover:border-[#FF4200] hover:text-[#FF4200] transition-colors"
                                        >
                                            {(matches?.length ?? 0) > 0 ? "None of these are me — I'm new" : "I'm a new player"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="flex items-center justify-between gap-2 bg-[#F5F5F7] rounded-lg px-3 py-2.5">
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

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <button
                                type="submit"
                                disabled={!canSubmit || signup.isPending}
                                className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                            >
                                {signup.isPending ? "Creating account…" : "Create account"}
                            </button>
                        </form>
                    )}

                    <p className="text-sm text-center text-gray-500">
                        Already have an account?{" "}
                        <Link to="/login" className="text-[#FF4200] font-semibold hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
