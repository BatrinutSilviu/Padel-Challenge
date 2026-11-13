import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../../../../trpc";
import { DIVISION_NAMES } from "../../../../lib/divisions";
import { compactField } from "../../formStyles";

// Contact details only admins see: the account's email and the profile's phone.
type PlayerContact = { email: string | null; hasAccount: boolean; google: boolean; phone: string | null };

// A player in the admin list. Edit changes their name, division and gender (players who
// signed up themselves sometimes pick the wrong ones), and their contact details.
export function PlayerRow({ player: p, contact, onDelete }: {
    player: { id: string; name: string; division: number; gender: string };
    contact?: PlayerContact;
    onDelete: () => void;
}) {
    const qc = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ name: p.name, division: p.division, gender: p.gender, phone: "", email: "" });
    const [error, setError] = useState("");
    const update = trpc.player.update.useMutation({
        onSuccess: () => {
            // Names and divisions show up across rankings, tournaments and pickers, so refresh everything.
            qc.invalidateQueries();
            setEditing(false);
            setError("");
        },
        onError: (e) => setError(e.message),
    });
    const divisionText = DIVISION_NAMES[p.division] ?? `Division ${p.division}`;
    const genderText = p.gender === "FEMALE" ? "♀ Female" : "♂ Male";

    function startEditing() {
        setDraft({ name: p.name, division: p.division, gender: p.gender, phone: contact?.phone ?? "", email: contact?.email ?? "" });
        setError("");
        setEditing(true);
    }

    function save(e: React.FormEvent) {
        e.preventDefault();
        const name = draft.name.trim();
        if (!name) return setError("Name is required.");
        const changes = {
            ...(name !== p.name ? { name } : {}),
            ...(draft.division !== p.division ? { division: draft.division } : {}),
            ...(draft.gender !== p.gender ? { gender: draft.gender as "MALE" | "FEMALE" } : {}),
            ...(draft.phone.trim() !== (contact?.phone ?? "") ? { phone: draft.phone.trim() || null } : {}),
            ...(contact?.hasAccount && draft.email.trim() && draft.email.trim() !== contact.email ? { email: draft.email.trim() } : {}),
        };
        if (Object.keys(changes).length === 0) return setEditing(false);
        update.mutate({ id: p.id, ...changes });
    }

    if (editing) {
        return (
            <tr className="border-b border-gray-100 last:border-0 bg-orange-50/40">
                <td colSpan={3} className="px-4 py-3">
                    <form onSubmit={save} className="space-y-2">
                        <input
                            value={draft.name}
                            onChange={e => setDraft({ ...draft, name: e.target.value })}
                            onKeyDown={e => { if (e.key === "Escape") setEditing(false); }}
                            className={`${compactField} w-full`}
                            autoFocus
                            autoComplete="off"
                            aria-label="Name"
                        />
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={draft.division}
                                onChange={e => setDraft({ ...draft, division: Number(e.target.value) })}
                                className={`${compactField} flex-1 min-w-[10rem]`}
                                aria-label="Level"
                            >
                                {[1, 2, 3, 4, 5, 6].map(d => (
                                    <option key={d} value={d}>{DIVISION_NAMES[d]}</option>
                                ))}
                            </select>
                            <select
                                value={draft.gender}
                                onChange={e => setDraft({ ...draft, gender: e.target.value })}
                                className={`${compactField} flex-1 min-w-[7rem]`}
                                aria-label="Gender"
                            >
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                            </select>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                            <input
                                value={draft.phone}
                                onChange={e => setDraft({ ...draft, phone: e.target.value })}
                                placeholder="Phone"
                                inputMode="tel"
                                aria-label="Phone"
                                className={`${compactField} w-full`}
                            />
                            {contact?.hasAccount ? (
                                <input
                                    value={draft.email}
                                    onChange={e => setDraft({ ...draft, email: e.target.value })}
                                    placeholder="Email"
                                    type="email"
                                    aria-label="Email"
                                    className={`${compactField} w-full`}
                                />
                            ) : (
                                <p className="text-xs text-gray-400 self-center">No account yet, so no email.</p>
                            )}
                        </div>
                        {contact?.google && <p className="text-xs text-gray-400">Signs in with Google — changing the email doesn't change their Google account.</p>}
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={update.isPending}
                                className="bg-[#FF4200] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors"
                            >
                                {update.isPending ? "Saving…" : "Save"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditing(false)}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:border-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </td>
            </tr>
        );
    }

    return (
        <tr className="border-b border-gray-100 last:border-0">
            <td className="px-4 py-2 font-medium text-gray-800">
                <div>{p.name}</div>
                <div className="text-xs text-gray-400 sm:hidden">{divisionText} · {genderText}</div>
                {(contact?.email || contact?.phone) && (
                    <div className="text-xs font-normal text-gray-500 mt-0.5">
                        {contact.phone && <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="block hover:text-[#FF4200]">📞 {contact.phone}</a>}
                        {contact.email && <a href={`mailto:${contact.email}`} className="block hover:text-[#FF4200] [overflow-wrap:anywhere]">✉️ {contact.email}</a>}
                    </div>
                )}
            </td>
            <td className="px-4 py-2 text-gray-500 hidden sm:table-cell">{divisionText} · {genderText}</td>
            <td className="px-4 py-2 text-right">
                <div className="inline-flex gap-2">
                    <button
                        onClick={startEditing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium transition-colors"
                        title="Edit name, division and gender"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                    </button>
                    <button
                        onClick={onDelete}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-xs font-medium transition-colors"
                        title="Delete player"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
}
