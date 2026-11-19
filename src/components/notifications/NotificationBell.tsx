import { Link } from "react-router-dom";
import { BellIcon } from "../ui/icons";
import { useUnreadNotifications } from "./useNotifications";

// The bell in the header, with the number of unread notifications. Only for logged-in players.
export function NotificationBell() {
    const { enabled, unread } = useUnreadNotifications();
    if (!enabled) return null;
    const label = unread > 0 ? `Notifications, ${unread} unread` : "Notifications";
    return (
        <Link to="/notifications" aria-label={label} title={label} className="relative p-2 -m-2 text-muted hover:text-ink transition-colors">
            <BellIcon className="w-[22px] h-[22px]" />
            {unread > 0 && (
                <span className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF4200] text-white text-[11px] font-bold leading-[18px] text-center tabular-nums">
                    {unread > 99 ? "99+" : unread}
                </span>
            )}
        </Link>
    );
}
