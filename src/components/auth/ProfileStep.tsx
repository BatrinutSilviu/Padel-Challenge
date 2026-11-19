import { useEffect, useState } from "react";
import { trpc } from "../../trpc";
import { cleanPlayerName, playerNameError } from "../../lib/playerName";
import { phoneError } from "../../lib/phone";
import type { Identity } from "./identity";

// Step one of signing up (and of picking again after a rejected claim): type your name,
// pick yourself among the existing profiles that match, or start a new one — a new player
// also says whether they're male or female and leaves a phone number.
export function ProfileStep({ initialName = "", onChoose }: {
    initialName?: string;
    onChoose: (identity: Identity) => void;
}) {
    const [name, setName] = useState(initialName);
    const [debouncedName, setDebouncedName] = useState(initialName.trim());

    useEffect(() => {
        const t = setTimeout(() => setDebouncedName(name.trim()), 300);
        return () => clearTimeout(t);
    }, [name]);

    const searchReady = debouncedName.length >= 2;
    const { data: matches, isFetching: matchesLoading } = trpc.player.matchByName.useQuery(
        { name: debouncedName },
        { enabled: searchReady }
    );
    const newNameError = searchReady ? playerNameError(name) : null;
    // Picked "I'm a new player": asking for gender and phone before going on.
    const [newPlayer, setNewPlayer] = useState(false);

    if (newPlayer) {
        return <NewPlayerDetails name={cleanPlayerName(name)} onBack={() => setNewPlayer(false)} onChoose={onChoose} />;
    }

    return (
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
                                        onClick={() => onChoose({ mode: "existing", playerId: p.id, name: p.name })}
                                        className="shrink-0 text-sm font-semibold px-3 py-2 rounded-lg bg-[#FF4200] text-white hover:bg-[#CC3500] transition-colors"
                                    >
                                        Yes, that's me
                                    </button>
                                </div>
                            ))}
                            <p className="text-xs text-gray-400">
                                An admin checks it's really you before the profile and its results are linked to your account.
                            </p>
                        </div>
                    )}

                    {!matchesLoading && (
                        <>
                            <button
                                type="button"
                                onClick={() => setNewPlayer(true)}
                                disabled={!!newNameError}
                                className="w-full text-sm font-semibold text-gray-500 border border-dashed border-gray-300 rounded-lg py-2.5 hover:border-[#FF4200] hover:text-[#FF4200] disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-500 transition-colors"
                            >
                                {(matches?.length ?? 0) > 0 ? "None of these are me — I'm new" : "I'm a new player"}
                            </button>
                            {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]";

function NewPlayerDetails({ name, onBack, onChoose }: {
    name: string;
    onBack: () => void;
    onChoose: (identity: Identity) => void;
}) {
    const [gender, setGender] = useState<"MALE" | "FEMALE" | null>(null);
    const [phone, setPhone] = useState("");
    const [touched, setTouched] = useState(false);

    const trimmed = phone.trim();
    const phoneProblem = trimmed ? phoneError(trimmed) : "Enter your phone number";
    const canContinue = !!gender && !phoneProblem;

    function handleContinue(e: React.FormEvent) {
        e.preventDefault();
        setTouched(true);
        if (!canContinue || !gender) return;
        onChoose({ mode: "new", name, gender, phone: trimmed });
    }

    return (
        <form onSubmit={handleContinue} className="space-y-4">
            <div className="flex items-center justify-between gap-2 bg-canvas rounded-lg px-3 py-2.5">
                <p className="text-sm text-gray-700 min-w-0 truncate">
                    New player: <span className="font-semibold">{name}</span>
                </p>
                <button type="button" onClick={onBack} className="shrink-0 text-xs font-semibold text-[#FF4200] hover:underline px-2 py-2 -my-2 -mr-2">
                    Change
                </button>
            </div>

            <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">I am</p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
                    {(["MALE", "FEMALE"] as const).map(g => (
                        <button
                            key={g}
                            type="button"
                            role="radio"
                            aria-checked={gender === g}
                            onClick={() => setGender(g)}
                            className={`py-3 rounded-lg text-sm font-semibold border transition-colors ${
                                gender === g ? "bg-[#FF4200] border-[#FF4200] text-white" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
                            }`}
                        >
                            {g === "MALE" ? "Male" : "Female"}
                        </button>
                    ))}
                </div>
                {touched && !gender && <p className="text-xs text-red-500">Pick male or female</p>}
            </div>

            <div className="space-y-1">
                <label htmlFor="signup-phone" className="text-sm font-medium text-gray-700">Phone number</label>
                <input
                    id="signup-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onBlur={() => trimmed && setTouched(true)}
                    placeholder="0740 123 456"
                    className={inputClass}
                />
                {touched && phoneProblem ? (
                    <p className="text-xs text-red-500">{phoneProblem}</p>
                ) : (
                    <p className="text-xs text-gray-400">So organisers and the players you're matched with can reach you. It's never shown publicly.</p>
                )}
            </div>

            <button
                type="submit"
                className="w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] transition-colors"
            >
                Continue
            </button>
        </form>
    );
}
