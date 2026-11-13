import { useEffect, useState } from "react";
import { useIsMutating, onlineManager } from "@tanstack/react-query";

// A strip at the top of every page while the device is offline: what's on screen is the
// last data loaded, and changes made now wait and go out once the connection is back.
export function ConnectionBanner() {
    const [online, setOnline] = useState(() => onlineManager.isOnline());
    const waiting = useIsMutating();
    const [backAt, setBackAt] = useState<number | null>(null);

    useEffect(() => onlineManager.subscribe(isOnline => {
        setOnline(isOnline);
        if (isOnline) setBackAt(Date.now());
    }), []);
    // "Back online" shows for a few seconds after reconnecting.
    useEffect(() => {
        if (backAt === null) return;
        const t = setTimeout(() => setBackAt(null), 3000);
        return () => clearTimeout(t);
    }, [backAt]);

    if (online && backAt === null) return null;
    return (
        <div
            role="status"
            className={`fixed top-0 inset-x-0 z-[60] px-4 pt-[max(env(safe-area-inset-top),0.375rem)] pb-1.5 text-center text-xs sm:text-sm font-semibold text-white ${online ? "bg-emerald-600" : "bg-[#1A1A2E]"}`}
        >
            {online
                ? "Back online"
                : waiting > 0
                ? "You're offline — your changes will be sent when you're back online."
                : "You're offline — showing what was last loaded."}
        </div>
    );
}
