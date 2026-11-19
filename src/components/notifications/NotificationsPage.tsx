import { useNavigate } from "react-router-dom";
import { trpc } from "../../trpc";
import { NavBar } from "../NavBar";
import { ChatIcon, PeopleIcon, TrophyIcon } from "../ui/icons";
import { timeAgo } from "./useNotifications";

// Everything under the bell: new messages in the chats of the player's tournaments, and new
// open matches they can join. Opening one marks it read and goes to it.
export function NotificationsPage() {
    return (
        <div className="min-h-screen bg-canvas">
            <NavBar />
            <main className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                <NotificationList />
            </main>
        </div>
    );
}

export function NotificationList({ heading = true }: { heading?: boolean }) {
    const navigate = useNavigate();
    const utils = trpc.useUtils();
    const { data, isPending } = trpc.notification.list.useQuery();
    const refresh = () => { void utils.notification.list.invalidate(); void utils.notification.unreadCount.invalidate(); };
    const markRead = trpc.notification.markRead.useMutation({ onSuccess: refresh });
    const markAllRead = trpc.notification.markAllRead.useMutation({ onSuccess: refresh });
    const unread = (data ?? []).filter(n => !n.readAt).length;

    const open = (n: NonNullable<typeof data>[number]) => {
        if (!n.readAt) markRead.mutate({ id: n.id });
        navigate(n.link);
    };

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                {heading
                    ? <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-ink">Notifications</h1>
                    : <h2 className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">Notifications</h2>}
                {unread > 0 && (
                    <button onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending} className="text-sm font-semibold text-[#FF4200] hover:underline disabled:opacity-50">
                        Mark all as read
                    </button>
                )}
            </div>

            {isPending && <p className="text-sm text-muted">Loading…</p>}
            {data?.length === 0 && (
                <div className="bg-surface rounded-2xl border border-line px-4 py-8 text-center">
                    <p className="text-sm text-ink-2">No notifications yet.</p>
                    <p className="text-xs text-muted mt-1">New tournaments and matches for your level, and new messages in your tournaments' chats, show up here.</p>
                </div>
            )}

            {!!data?.length && (
                <div className="bg-surface rounded-2xl border border-line overflow-hidden divide-y divide-canvas">
                    {data.map(n => {
                        const Icon = n.kind === "CHAT" ? ChatIcon : n.kind === "TOURNAMENT" ? TrophyIcon : PeopleIcon;
                        const title = n.kind === "CHAT"
                            ? `${n.count} new message${n.count === 1 ? "" : "s"} · ${n.title}`
                            : n.title;
                        return (
                            <button
                                key={n.id}
                                onClick={() => open(n)}
                                className={`w-full text-left flex gap-3 px-4 py-3.5 hover:bg-canvas transition-colors ${n.readAt ? "" : "bg-[#FF4200]/[0.06]"}`}
                            >
                                <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.readAt ? "bg-canvas text-muted" : "bg-[#FF4200]/15 text-[#FF4200]"}`}>
                                    <Icon className="w-4 h-4" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className={`block text-sm ${n.readAt ? "text-ink-2" : "font-semibold text-ink"}`}>{title}</span>
                                    {n.body && <span className="block text-sm text-muted line-clamp-2 [overflow-wrap:anywhere]">{n.body}</span>}
                                    <span className="block text-xs text-muted mt-0.5">{timeAgo(n.updatedAt)}</span>
                                </span>
                                {!n.readAt && <span className="mt-2 w-2 h-2 rounded-full bg-[#FF4200] shrink-0" aria-label="Unread" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
