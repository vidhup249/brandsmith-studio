import { Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './auth.jsx';
import { ROUTES, routeFromHash } from './routes.js';
import { AppBackground } from '~/components/shell/AppBackground.jsx';
import { TopBar } from '~/components/shell/TopBar.jsx';
import { SignInDialog } from '~/components/shell/SignInDialog.jsx';

function PageFallback() {
    return (
        <div className="flex h-full items-center justify-center">
            <span className="size-8 animate-spin rounded-full border-2 border-violet border-t-transparent" />
        </div>
    );
}

export function App() {
    const [route, setRoute] = useState(routeFromHash);

    useEffect(() => {
        const onHash = () => setRoute(routeFromHash());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const navigate = useCallback((id) => {
        window.location.hash = `/${id}`;
        setRoute(id);
    }, []);

    const Page = ROUTES.find(r => r.id === route).page;

    return (
        <AuthProvider>
            <AppBackground />
            <div className="flex h-dvh flex-col">
                <TopBar route={route} onNavigate={navigate} />
                <main className="relative min-h-0 flex-1 pb-16 md:pb-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={route}
                            className="h-full"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.22 }}
                        >
                            <Suspense fallback={<PageFallback />}>
                                <Page onNavigate={navigate} />
                            </Suspense>
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
            <SignInDialog />
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'var(--color-surface-2)',
                        color: 'var(--color-fg)',
                        border: '1px solid var(--color-line)',
                        borderRadius: '999px',
                        fontSize: '14px',
                        padding: '10px 16px',
                    },
                    success: { iconTheme: { primary: '#d4f25a', secondary: '#0c0b10' } },
                    error: { iconTheme: { primary: '#ff5d6c', secondary: '#0c0b10' }, duration: 6000 },
                }}
            />
        </AuthProvider>
    );
}
