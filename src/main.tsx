import { createRoot } from "react-dom/client";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { trpc, trpcClient } from './trpc';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

const USER_SCOPED_ROUTERS = ['individualMatch'];

function handleUnauthorized(error: unknown, routerName: string | undefined, retry: () => void) {
    if ((error as any)?.data?.code !== 'UNAUTHORIZED') return;
    // A wrong password at login is not an expired session
    if (routerName === 'auth') return;

    const userScoped = !!routerName && USER_SCOPED_ROUTERS.includes(routerName);
    const storageKey = userScoped ? 'user_token' : 'admin_token';
    const sentToken = (error as any)[userScoped ? 'sentUserToken' : 'sentAdminToken'] ?? null;
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
            retry: (failureCount, error) => (error as any)?.data?.code !== 'UNAUTHORIZED' && failureCount < 3,
        },
    },
    queryCache: new QueryCache({
        onError(error, query) {
            const routerName = Array.isArray(query.queryKey?.[0]) ? query.queryKey[0][0] : undefined;
            const retry = () => queryClient.refetchQueries({ queryKey: query.queryKey, exact: true });
            handleUnauthorized(error, routerName, retry);
        },
    }),
    mutationCache: new MutationCache({
        onError(error, _variables, _context, mutation) {
            const routerName = Array.isArray(mutation.options.mutationKey?.[0])
                ? mutation.options.mutationKey[0][0]
                : undefined;
            const retry = () => mutation.execute(mutation.state.variables);
            handleUnauthorized(error, routerName, retry);
        },
    }),
});

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <App />
                        <Toaster />
                    </AuthProvider>
                </QueryClientProvider>
            </trpc.Provider>
        </BrowserRouter>
    </React.StrictMode>
);
  