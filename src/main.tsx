import { createRoot } from "react-dom/client";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { trpc, trpcClient } from './trpc';

const queryClient = new QueryClient({
    mutationCache: new MutationCache({
        onError(error, _variables, _context, mutation) {
            if ((error as any)?.data?.code === 'UNAUTHORIZED') {
                localStorage.removeItem('admin_token');
                const retry = () => mutation.execute(mutation.state.variables);
                window.dispatchEvent(new CustomEvent('admin-session-expired', { detail: { retry } }));
            }
        },
    }),
});

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <trpc.Provider client={trpcClient} queryClient={queryClient}>
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
            </trpc.Provider>
        </BrowserRouter>
    </React.StrictMode>
);
  