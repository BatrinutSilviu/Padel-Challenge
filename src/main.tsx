import { createRoot } from "react-dom/client";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { trpc, trpcClient } from './trpc';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

const USER_SCOPED_ROUTERS = ['individualMatch'];

const queryClient = new QueryClient({
    mutationCache: new MutationCache({
        onError(error, _variables, _context, mutation) {
            if ((error as any)?.data?.code === 'UNAUTHORIZED') {
                const routerName = Array.isArray(mutation.options.mutationKey?.[0])
                    ? mutation.options.mutationKey[0][0]
                    : undefined;
                const retry = () => mutation.execute(mutation.state.variables);

                if (routerName && USER_SCOPED_ROUTERS.includes(routerName)) {
                    localStorage.removeItem('user_token');
                    window.dispatchEvent(new CustomEvent('user-session-expired', { detail: { retry } }));
                } else {
                    localStorage.removeItem('admin_token');
                    window.dispatchEvent(new CustomEvent('admin-session-expired', { detail: { retry } }));
                }
            }
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
  