import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../padel-challenge-backend/src/router';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
    links: [
        httpBatchLink({
            url: 'http://localhost:3001',
            headers() {
                const token = localStorage.getItem('admin_token');
                return token ? { Authorization: `Bearer ${token}` } : {};
            },
        }),
    ],
});
