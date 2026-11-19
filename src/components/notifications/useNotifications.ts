import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";

// The bell's number: unread notifications of the logged-in player (lib/notifications on the
// backend). Checked every minute and whenever the tab comes back into view.
export function useUnreadNotifications() {
    const { account } = useAuth();
    const enabled = !!account?.playerId;
    const { data } = trpc.notification.unreadCount.useQuery(undefined, {
        enabled,
        refetchInterval: 60_000,
        refetchOnWindowFocus: true,
    });
    return { enabled, unread: enabled ? data ?? 0 : 0 };
}

// "just now", "5 min ago", "3 h ago", "yesterday", "12 Nov".
export function timeAgo(when: Date | string): string {
    const d = new Date(when);
    const s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 2 * 86_400) return "yesterday";
    if (s < 7 * 86_400) return `${Math.floor(s / 86_400)} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
