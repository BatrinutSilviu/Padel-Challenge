import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AppRouter } from '../../padel-challenge-backend/src/router';

export const trpc = createTRPCReact<AppRouter>();

// An error with no tRPC answer behind it: the request never got a reply from the backend
// (offline, a dropped connection, or the proxy's 502/503/504 while the server restarts).
export function isConnectionError(err: unknown): boolean {
    const e = err as { data?: unknown; meta?: { response?: { status?: number } } } | null;
    if (!e || e.data) return false;
    const status = e.meta?.response?.status;
    return status === undefined || status === 502 || status === 503 || status === 504;
}

// Tags each error with the tokens the request was sent with, so a stale
// UNAUTHORIZED response arriving after a fresh login can be told apart.
const sentTokensLink: TRPCLink<AppRouter> = () => ({ op, next }) => observable(observer => {
    const sentAdminToken = localStorage.getItem('admin_token');
    const sentUserToken = localStorage.getItem('user_token');
    return next(op).subscribe({
        next: value => observer.next(value),
        error: err => {
            Object.assign(err, { sentAdminToken, sentUserToken });
            // No answer from the server at all (no connection, or the server is restarting):
            // say so plainly instead of "Failed to fetch".
            if (isConnectionError(err)) {
                err.message = navigator.onLine
                    ? "Couldn't reach the server — check your connection and try again."
                    : "You're offline — check your connection and try again.";
            }
            observer.error(err);
        },
        complete: () => observer.complete(),
    });
});

export const trpcClient = trpc.createClient({
    links: [
        sentTokensLink,
        httpBatchLink({
            url: import.meta.env.VITE_API_URL ?? '/api',
            headers() {
                const adminToken = localStorage.getItem('admin_token');
                const userToken = localStorage.getItem('user_token');
                return {
                    ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
                    ...(userToken ? { 'x-user-token': userToken } : {}),
                };
            },
        }),
    ],
});
