import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { useAuth } from "../contexts/useAuth";

// The tournament's chat (backend chat router): open from when the tournament is created
// until a day after it's completed, for the players on its list and the admins. Only the
// newest page of messages is shown and refreshed every few seconds; older ones are loaded
// a page at a time when the reader asks for them.

const MAX_LENGTH = 1000;
const POLL_MS = 5000;

function useChat(tournamentId: string) {
    return trpc.chat.messages.useQuery(
        { tournamentId },
        { refetchInterval: q => (q.state.data?.canRead && q.state.data.open ? POLL_MS : false) },
    );
}

type ChatMessage = NonNullable<ReturnType<typeof useChat>["data"]>["messages"][number];

// The messages the viewer hasn't seen yet: newer than the last one they saw here.
const seenKey = (id: string) => `chat-seen-at-${id}`;
function readSeen(id: string): number | null {
    try { const v = localStorage.getItem(seenKey(id)); return v ? Number(v) : null; } catch { return null; }
}
function writeSeen(id: string, at: number) {
    try { localStorage.setItem(seenKey(id), String(at)); } catch { /* private mode */ }
}

// A link in the tournament's header that jumps down to the chat, with the number of new messages.
export function ChatJumpLink({ tournamentId }: { tournamentId: string }) {
    const { data } = useChat(tournamentId);
    if (!data?.canRead) return null;
    const seen = readSeen(tournamentId);
    const unreadCount = data.messages.filter(m => seen === null || new Date(m.createdAt).getTime() > seen).length;
    // Only the newest page is known here: "30+" when all of it is new and there's more.
    const unread = unreadCount === data.messages.length && data.hasMore ? `${unreadCount}+` : unreadCount;
    return (
        <a href="#chat" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#333366] hover:text-[#FF4200]">
            <span aria-hidden>💬</span> Chat
            {unreadCount > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FF4200] text-white text-[11px] font-bold inline-flex items-center justify-center">{unread}</span>
            )}
        </a>
    );
}

function timeLabel(d: Date): string {
    return d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}
function dayLabel(d: Date): string {
    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function TournamentChat({ tournamentId, tournamentName }: { tournamentId: string; tournamentName: string }) {
    const { token, playerId } = useAuth();
    const isAdmin = !!localStorage.getItem("admin_token");
    const { data } = useChat(tournamentId);
    const [text, setText] = useState("");
    const [error, setError] = useState("");
    const listRef = useRef<HTMLDivElement>(null);
    const nearBottom = useRef(true);
    // Older messages the reader loaded, oldest first, and whether there are more before them.
    const utils = trpc.useUtils();
    const [older, setOlder] = useState<ChatMessage[]>([]);
    const [olderHasMore, setOlderHasMore] = useState<boolean | null>(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    // The list's height before older messages went in on top, to keep the reader's place.
    const heightBefore = useRef<number | null>(null);

    const refresh = () => utils.chat.messages.invalidate({ tournamentId });
    const send = trpc.chat.send.useMutation({
        onSuccess: () => { setText(""); setError(""); nearBottom.current = true; refresh(); },
        onError: e => setError(e.message),
    });
    const remove = trpc.chat.delete.useMutation({
        onSuccess: (_, { id }) => { setOlder(o => o.filter(m => m.id !== id)); refresh(); },
        onError: e => setError(e.message),
    });

    const latest = data?.messages ?? [];
    const latestIds = new Set(latest.map(m => m.id));
    const messages = [...older.filter(m => !latestIds.has(m.id)), ...latest];
    const hasEarlier = olderHasMore ?? data?.hasMore ?? false;
    const lastId = messages.at(-1)?.id;

    async function loadOlder() {
        const first = messages[0];
        if (!first || loadingOlder) return;
        setLoadingOlder(true);
        try {
            const page = await utils.chat.messages.fetch({ tournamentId, before: first.id }, { staleTime: Infinity });
            heightBefore.current = listRef.current?.scrollHeight ?? null;
            setOlder(o => [...page.messages, ...o]);
            setOlderHasMore(page.hasMore);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoadingOlder(false);
        }
    }
    // After older messages go in on top, keep the same messages in view.
    useLayoutEffect(() => {
        const el = listRef.current;
        if (el && heightBefore.current !== null) {
            el.scrollTop += el.scrollHeight - heightBefore.current;
            heightBefore.current = null;
        }
    }, [older]);
    // Stay at the newest message as they come in, unless the reader has scrolled up.
    useLayoutEffect(() => {
        const el = listRef.current;
        if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
    }, [lastId]);
    const lastAt = latest.at(-1)?.createdAt;
    useEffect(() => {
        if (lastAt && data?.canRead) writeSeen(tournamentId, new Date(lastAt).getTime());
    }, [lastAt, data?.canRead, tournamentId]);

    if (!data) return null;
    if (!data.canRead) {
        // Nothing to join once it's closed.
        if (!data.open) return null;
        return (
            <section id="chat" className="bg-white rounded-2xl border border-[#E5E5EA] p-4 sm:p-5 shadow-sm">
                <p className="text-sm font-black text-[#1A1A2E]">💬 Tournament chat</p>
                <p className="text-sm text-[#8E8E93] mt-0.5">
                    {token
                        ? "For the players signed up — sign up to join the conversation."
                        : <>For the players signed up. <Link to={`/login?redirect=${encodeURIComponent(`/tournament/${tournamentId}`)}`} className="text-[#FF4200] font-semibold">Log in</Link> and sign up to join it.</>}
                </p>
            </section>
        );
    }

    const closes = data.closesAt ? new Date(data.closesAt) : null;
    const submit = () => {
        const body = text.trim();
        if (body && !send.isPending) send.mutate({ tournamentId, body });
    };

    return (
        <section id="chat" className="bg-white rounded-2xl border border-[#E5E5EA] shadow-sm overflow-hidden scroll-mt-20">
            <div className="px-4 sm:px-5 py-3 border-b border-[#F5F5F7] flex items-baseline justify-between gap-3">
                <p className="text-sm font-black text-[#1A1A2E] whitespace-nowrap">💬 Tournament chat</p>
                {(!data.open || closes) && (
                    <p className="text-xs text-[#8E8E93] text-right">
                        {!data.open ? "Closed" : `Open until ${dayLabel(closes!).toLowerCase()} ${timeLabel(closes!)}`}
                    </p>
                )}
            </div>

            <div
                ref={listRef}
                onScroll={e => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
                className="max-h-[60vh] sm:max-h-96 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5 bg-[#F5F5F7]/60"
            >
                {hasEarlier && (
                    <div className="text-center pb-1">
                        <button
                            type="button"
                            onClick={loadOlder}
                            disabled={loadingOlder}
                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-[#E5E5EA] text-[#333366] hover:border-[#FF4200] hover:text-[#FF4200] disabled:opacity-50"
                        >
                            {loadingOlder ? "Loading…" : "↑ Show earlier messages"}
                        </button>
                    </div>
                )}
                {messages.length === 0 && (
                    <p className="text-center text-sm text-[#8E8E93] py-6">
                        {data.open ? "No messages yet — say hi, find a partner, ask about the event." : "No messages."}
                    </p>
                )}
                {messages.map((m, i) => {
                    const at = new Date(m.createdAt);
                    const prev = messages[i - 1];
                    const newDay = !prev || new Date(prev.createdAt).toDateString() !== at.toDateString();
                    // Mine: written from my player account, or — for an admin not logged in as a player — as Act!ve.
                    const mine = m.player ? !!playerId && m.player.id === playerId : m.fromAdmin && isAdmin && !playerId;
                    const sameAuthor = !newDay && prev && prev.fromAdmin === m.fromAdmin && prev.player?.id === m.player?.id;
                    const canDelete = isAdmin || (data.open && !m.fromAdmin && !!playerId && m.player?.id === playerId);
                    return (
                        <div key={m.id}>
                            {newDay && <p className="text-center text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide py-1.5">{dayLabel(at)}</p>}
                            <div className={`flex ${mine ? "justify-end" : "justify-start"} ${sameAuthor ? "" : "pt-1"}`}>
                                <div className={`group max-w-[85%] rounded-2xl px-3 py-1.5 ${
                                    mine ? "bg-[#FF4200] text-white rounded-br-md"
                                    : m.fromAdmin ? "bg-[#333366] text-white rounded-bl-md"
                                    : "bg-white border border-[#E5E5EA] text-[#1A1A2E] rounded-bl-md"
                                }`}>
                                    {!sameAuthor && (
                                        <p className={`text-[11px] font-bold truncate ${mine ? "text-white/85 text-right" : m.fromAdmin ? "text-[#9FD2DD]" : "text-[#FF4200]"}`}>
                                            {mine
                                                ? "You"
                                                : m.player
                                                ? <Link to={`/player/${m.player.id}`} className="hover:underline">{m.player.name}</Link>
                                                : "Act!ve"}
                                            {m.fromAdmin && <span className="font-black"> · organiser</span>}
                                        </p>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                                    <p className={`text-[10px] text-right mt-0.5 ${mine || m.fromAdmin ? "text-white/70" : "text-[#8E8E93]"}`}>
                                        {timeLabel(at)}
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => { if (confirm("Delete this message?")) remove.mutate({ id: m.id }); }}
                                                className="ml-2 underline opacity-70 hover:opacity-100"
                                            >
                                                delete
                                            </button>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {data.open ? (
                <div className="px-3 sm:px-4 py-3 border-t border-[#F5F5F7]">
                    <div className="flex items-end gap-2">
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => {
                                // Enter sends on a keyboard; Shift+Enter starts a new line.
                                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
                            }}
                            rows={1}
                            maxLength={MAX_LENGTH}
                            placeholder={isAdmin ? "Write as Act!ve…" : `Message ${tournamentName}…`}
                            aria-label="Message"
                            className="flex-1 min-w-0 resize-none max-h-32 border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white field-sizing-content"
                        />
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!text.trim() || send.isPending}
                            className="shrink-0 bg-[#FF4200] text-white rounded-xl px-4 py-2.5 text-sm font-bold hover:bg-[#CC3500] disabled:opacity-40"
                        >
                            Send
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
                </div>
            ) : (
                <p className="px-4 py-3 border-t border-[#F5F5F7] text-xs text-[#8E8E93]">The chat closed a day after the tournament ended.</p>
            )}
        </section>
    );
}
