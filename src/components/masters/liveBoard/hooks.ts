// Hooks for the TV board: sizing it to the screen, keeping the screen awake, and timing.
import { useEffect, useRef, useState } from "react";
import type { ChallengerMatch } from "../../../lib/challenger";

// How long a newly scored match stays highlighted.
const FLASH_MS = 15_000;

// Scales every rem-based size with the screen, so the board fills a 720p, 1080p or 4K TV
// the same way (16px at 1920×1080).
export function useTvScale() {
    useEffect(() => {
        const html = document.documentElement;
        const previous = html.style.fontSize;
        html.style.fontSize = "max(10px, min(0.833vw, 1.48vh))";
        return () => { html.style.fontSize = previous; };
    }, []);
}

// Stops the TV's browser from dimming or sleeping while the board is up.
export function useWakeLock() {
    useEffect(() => {
        let lock: WakeLockSentinel | null = null;
        const request = () => {
            navigator.wakeLock?.request("screen").then(l => { lock = l; }).catch(() => {});
        };
        const onVisible = () => { if (document.visibilityState === "visible") request(); };
        request();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            lock?.release().catch(() => {});
        };
    }, []);
}

// The current time, ticking every second.
export function useNow(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    return now;
}

// True once the mouse hasn't moved for `ms`, to hide the pointer and the help line.
export function useIdle(ms: number): boolean {
    const [idle, setIdle] = useState(false);
    useEffect(() => {
        let t = setTimeout(() => setIdle(true), ms);
        const onMove = () => {
            setIdle(false);
            clearTimeout(t);
            t = setTimeout(() => setIdle(true), ms);
        };
        window.addEventListener("mousemove", onMove);
        return () => { clearTimeout(t); window.removeEventListener("mousemove", onMove); };
    }, [ms]);
    return idle;
}

// Match ids whose score changed (or that were just drawn) in the last FLASH_MS. Nothing
// flashes on the first load — only updates that arrive while the board is up.
export function useRecentlyChanged(matches: ChallengerMatch[], now: number): Set<string> {
    const previous = useRef<Map<string, string> | null>(null);
    const [changedAt, setChangedAt] = useState<Map<string, number>>(new Map());
    const signatures = new Map(matches.map(m => [
        m.id,
        `${m.team1Score}-${m.team2Score}-${m.team1TiebreakPoints}-${m.team2TiebreakPoints}`,
    ]));
    const key = [...signatures].join("|");

    useEffect(() => {
        const prev = previous.current;
        previous.current = signatures;
        if (!prev) return;
        const fresh = [...signatures].filter(([id, sig]) => prev.get(id) !== sig).map(([id]) => id);
        if (fresh.length === 0) return;
        setChangedAt(old => {
            const next = new Map(old);
            for (const id of fresh) next.set(id, Date.now());
            return next;
        });
        // signatures is a new Map every render; key stands in for it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return new Set([...changedAt].filter(([, t]) => now - t < FLASH_MS).map(([id]) => id));
}
