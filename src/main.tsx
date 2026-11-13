import { createRoot } from "react-dom/client";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { isConnectionError, trpc, trpcClient } from './trpc';
import { ConnectionBanner } from './components/ConnectionBanner';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

const USER_SCOPED_ROUTERS = ['profile'];
// The league and tournament routers mix admin procedures with ones players use.
const USER_SCOPED_PROCEDURES = [
    'league.myOpenMatches', 'league.submitScore', 'league.confirmScore', 'league.setSchedule',
    'tournament.join', 'tournament.leave', 'tournament.mySignups',
];

// What a failed request carries: tRPC's error code and the HTTP status, and the tokens it
// was sent with (added by sentTokensLink in trpc.ts).
type RequestError = {
    data?: { code?: string };
    meta?: { response?: { status?: number } };
    sentUserToken?: string | null;
    sentAdminToken?: string | null;
} | null;

function handleUnauthorized(error: unknown, path: string[] | undefined, retry: () => void) {
    if ((error as RequestError)?.data?.code !== 'UNAUTHORIZED') return;
    const routerName = path?.[0];
    // A wrong password at login is not an expired session
    if (routerName === 'auth') return;

    const userScoped = (!!routerName && USER_SCOPED_ROUTERS.includes(routerName))
        || (!!path && USER_SCOPED_PROCEDURES.includes(path.join('.')));
    const storageKey = userScoped ? 'user_token' : 'admin_token';
    const sentToken = (error as RequestError)?.[userScoped ? 'sentUserToken' : 'sentAdminToken'] ?? null;
    const currentToken = localStorage.getItem(storageKey);

    // The request went out with an older token than the one stored now (e.g. it was in
    // flight while the user logged in again), so the fresh session is fine — just retry.
    if (sentToken !== currentToken) {
        if (currentToken) retry();
        return;
    }

    localStorage.removeItem(storageKey);
    window.dispatchEvent(new CustomEvent(userScoped ? 'user-session-expired' : 'admin-session-expired', { detail: { retry } }));
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error) => (error as RequestError)?.data?.code !== 'UNAUTHORIZED' && failureCount < 3,
        },
        // Offline, changes wait (the button keeps saying "Saving…") and go out once the
        // connection is back — React Query's "online" network mode. When the proxy answers
        // 502/503/504 the backend never saw the request (it's restarting for a deploy), so
        // it's safe to send again; any other failure is shown, not repeated, so nothing is
        // ever done twice.
        mutations: {
            retry: (failureCount, error) => {
                const status = (error as RequestError)?.meta?.response?.status;
                return isConnectionError(error) && status !== undefined && [502, 503, 504].includes(status) && failureCount < 4;
            },
            retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
        },
    },
    queryCache: new QueryCache({
        onError(error, query) {
            const path = Array.isArray(query.queryKey?.[0]) ? query.queryKey[0] as string[] : undefined;
            const retry = () => queryClient.refetchQueries({ queryKey: query.queryKey, exact: true });
            handleUnauthorized(error, path, retry);
        },
    }),
    mutationCache: new MutationCache({
        onError(error, _variables, _context, mutation) {
            const path = Array.isArray(mutation.options.mutationKey?.[0])
                ? mutation.options.mutationKey[0] as string[]
                : undefined;
            const retry = () => mutation.execute(mutation.state.variables);
            handleUnauthorized(error, path, retry);
        },
    }),
});

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <ConnectionBanner />
                        <App />
                        <Toaster />
                    </AuthProvider>
                </QueryClientProvider>
            </trpc.Provider>
        </BrowserRouter>
    </React.StrictMode>
);
  