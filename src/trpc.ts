import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import type { AppRouter } from '../../padel-challenge-backend/src/router';

export const trpc = createTRPCReact<AppRouter>();

// Tags each error with the tokens the request was sent with, so a stale
// UNAUTHORIZED response arriving after a fresh login can be told apart.
const sentTokensLink: TRPCLink<AppRouter> = () => ({ op, next }) => observable(observer => {
    const sentAdminToken = localStorage.getItem('admin_token');
    const sentUserToken = localStorage.getItem('user_token');
    return next(op).subscribe({
        next: value => observer.next(value),
        error: err => {
            Object.assign(err, { sentAdminToken, sentUserToken });
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
