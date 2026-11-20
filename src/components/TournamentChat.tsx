import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";
import { ChatIcon } from "./ui/icons";
import { useAuth } from "../contexts/useAuth";

// A chat (backend chat router): a tournament's — open from when the tournament is created
// until a day after it's completed, for the players on its list — or an open match's — for
// the players in it, until it's over. Admins can use them all. Only the
// newest page of messages is shown and refreshed every few seconds; older ones are loaded
// a page at a time when the reader asks for them.

const MAX_LENGTH = 1000;
const POLL_MS = 5000;

export type ChatRoom = { tournamentId: string } | { openMatchId: string };
const roomKey = (room: ChatRoom) => ("tournamentId" in room ? room.tournamentId : `match-${room.openMatchId}`);

function useChat(room: ChatRoom) {
    return trpc.chat.messages.useQuery(
        room,
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

// How many messages in the newest page the viewer hasn't seen: "30+" when all of it is new
// and there's more. null when they can't read the chat.
function useUnreadChat(room: ChatRoom): { count: number; label: string } | null {
    const { data } = useChat(room);
    if (!data?.canRead) return null;
    const seen = readSeen(roomKey(room));
    const count = data.messages.filter(m => seen === null || new Date(m.createdAt).getTime() > seen).length;
    return { count, label: count === data.messages.length && data.hasMore ? `${count}+` : String(count) };
}

// The number of new messages as a little badge (nothing when there are none).
export function ChatUnreadBadge({ room }: { room: ChatRoom }) {
    const unread = useUnreadChat(room);
    if (!unread?.count) return null;
    return (
        <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FF4200] text-white text-[11px] font-bold inline-flex items-center justify-center">{unread.label}</span>
    );
}

// A link in the tournament's header that jumps down to the chat, with the number of new messages.
export function ChatJumpLink({ tournamentId }: { tournamentId: string }) {
    const unread = useUnreadChat({ tournamentId });
    if (!unread) return null;
    const unreadCount = unread.count;
    return (
        <a href="#chat" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#9FD2DD] hover:text-[#FF4200]">
            <ChatIcon className="w-4 h-4" /> Chat
            {unreadCount > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FF4200] text-white text-[11px] font-bold inline-flex items-center justify-center">{unread.label}</span>
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
    return <Chat room={{ tournamentId }} name={tournamentName} />;
}

// An open match's chat, shown under its card for the players in it.
export function OpenMatchChat({ openMatchId }: { openMatchId: string }) {
    return <Chat room={{ openMatchId }} name="the match" />;
}

function Chat({ room, name }: { room: ChatRoom; name: string }) {
    const isTournament = "tournamentId" in room;
    const tournamentId = isTournament ? room.tournamentId : "";
    const key = roomKey(room);
    const { token, playerId } = useAuth();
    const isAdmin = !!localStorage.getItem("admin_token");
    const { data } = useChat(room);
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

    // Arriving from a notification (…#chat): go to the chat once it's on the page. Loading
    // the messages read its notification on the server, so the bell's number is refreshed.
    const loaded = !!data;
    useEffect(() => {
        if (!loaded) return;
        void utils.notification.unreadCount.invalidate();
        if (!isTournament || window.location.hash !== "#chat") return;
        // Scrolled by hand, just below the sticky header (scrollIntoView ignores the chat's
        // scroll margin here).
        const jump = () => {
            const el = document.getElementById("chat");
            const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 12 });
        };
        jump();
        // Again once the rest of the page above the chat has loaded and pushed it down.
        const id = setTimeout(jump, 600);
        return () => clearTimeout(id);
    }, [loaded, utils, isTournament]);

    const refresh = () => utils.chat.messages.invalidate(room);
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
            const page = await utils.chat.messages.fetch({ ...room, before: first.id }, { staleTime: Infinity });
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
        if (lastAt && data?.canRead) writeSeen(key, new Date(lastAt).getTime());
    }, [lastAt, data?.canRead, key]);

    if (!data) return null;
    if (!data.canRead) {
        // Nothing to join once it's closed; a match's chat is only shown to its players.
        if (!data.open || !isTournament) return null;
        return (
            <section id="chat" className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-bold text-ink"><ChatIcon className="w-4 h-4 text-[#9FD2DD]" /> Tournament chat</p>
                <p className="text-sm text-muted mt-0.5">
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
        if (body && !send.isPending) send.mutate({ ...room, body });
    };

    return (
        <section id={isTournament ? "chat" : undefined} className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden scroll-mt-20">
            <div className="px-4 sm:px-5 py-3 border-b border-canvas flex items-baseline justify-between gap-3">
                <p className="flex items-center gap-2 font-display text-base font-semibold uppercase tracking-wider text-ink whitespace-nowrap"><ChatIcon className="w-4 h-4 text-[#9FD2DD]" /> {isTournament ? "Tournament" : "Match"} chat</p>
                {(!data.open || closes) && (
                    <p className="text-xs text-muted text-right">
                        {!data.open ? "Closed" : `Open until ${dayLabel(closes!).toLowerCase()} ${timeLabel(closes!)}`}
                    </p>
                )}
            </div>

            <div
                ref={listRef}
                onScroll={e => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}
                className="max-h-[45vh] sm:max-h-96 overflow-y-auto px-3 sm:px-4 py-3 space-y-1.5 bg-canvas/60"
            >
                {hasEarlier && (
                    <div className="text-center pb-1">
                        <button
                            type="button"
                            onClick={loadOlder}
                            disabled={loadingOlder}
                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-surface border border-line text-[#9FD2DD] hover:border-[#FF4200] hover:text-[#FF4200] disabled:opacity-50"
                        >
                            {loadingOlder ? "Loading…" : "↑ Show earlier messages"}
                        </button>
                    </div>
                )}
                {messages.length === 0 && (
                    <p className="text-center text-sm text-muted py-6">
                        {!data.open ? "No messages." : isTournament ? "No messages yet — say hi, find a partner, ask about the event." : "No messages yet — sort out the court, the balls, who brings what."}
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
                            {newDay && <p className="text-center text-[11px] font-bold text-muted uppercase tracking-wide py-1.5">{dayLabel(at)}</p>}
                            <div className={`flex ${mine ? "justify-end" : "justify-start"} ${sameAuthor ? "" : "pt-1"}`}>
                                <div className={`group max-w-[85%] rounded-2xl px-3 py-1.5 ${
                                    mine ? "bg-[#FF4200] text-white rounded-br-md"
                                    : m.fromAdmin ? "bg-[#333366] text-white rounded-bl-md"
                                    : "bg-surface border border-line text-ink rounded-bl-md"
                                }`}>
                                    {!sameAuthor && (
                                        <p className={`text-[11px] font-bold truncate ${mine ? "text-white/85 text-right" : m.fromAdmin ? "text-[#9FD2DD]" : "text-[#FF4200]"}`}>
                                            {mine
                                                ? "You"
                                                : m.player
                                                ? <Link to={`/player/${m.player.id}`} className="hover:underline">{m.player.name}</Link>
                                                : "Act!ve"}
                                            {m.fromAdmin && <span className="font-bold"> · organiser</span>}
                                        </p>
                                    )}
                                    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{m.body}</p>
                                    <p className={`text-[10px] text-right mt-0.5 ${mine || m.fromAdmin ? "text-white/70" : "text-muted"}`}>
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
                <div className="px-3 sm:px-4 py-3 border-t border-canvas">
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
                            placeholder={isAdmin ? "Write as Act!ve…" : `Message ${name}…`}
                            aria-label="Message"
                            className="flex-1 min-w-0 resize-none max-h-32 border border-gray-300 rounded-xl px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-surface field-sizing-content"
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
                <p className="px-4 py-3 border-t border-canvas text-xs text-muted">{isTournament ? "The chat closed a day after the tournament ended." : "The chat is closed."}</p>
            )}
        </section>
    );
}
