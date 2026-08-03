import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../padel-challenge-backend/src/router';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
    links: [
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
