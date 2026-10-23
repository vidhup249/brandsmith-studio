import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login, logoutBackend, sessionAccount } from '~/lib/api.js';

const AuthContext = createContext(null);

/**
 * Two ways to generate: a content-factory backend session (cf_backend flag +
 * cookie, keys stay server-side) or a kie.ai key stored in this browser.
 * The kie client reads the same localStorage keys, so this only mirrors them.
 */
export function AuthProvider({ children }) {
    const [backend, setBackend] = useState(() => !!localStorage.getItem('cf_backend'));
    const [hasKey, setHasKey] = useState(() => !!localStorage.getItem('kie_key'));
    const [credits, setCredits] = useState(null);
    const [dialog, setDialog] = useState(null); // { onSuccess } while the sign-in dialog is open

    const refreshCredits = useCallback(async () => {
        if (!localStorage.getItem('cf_backend')) return;
        try {
            const account = await sessionAccount();
            setCredits(account.credits);
        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                localStorage.removeItem('cf_backend');
                setBackend(false);
                setCredits(null);
            }
        }
    }, []);

    useEffect(() => { refreshCredits(); }, [refreshCredits]);

    const signIn = useCallback(async (name, pin) => {
        await login(name, pin);
        setBackend(true);
        refreshCredits();
    }, [refreshCredits]);

    const signOut = useCallback(async () => {
        try { await logoutBackend(); } catch { localStorage.removeItem('cf_backend'); }
        setBackend(false);
        setCredits(null);
    }, []);

    const saveKey = useCallback((key) => {
        localStorage.setItem('kie_key', key.trim());
        setHasKey(true);
    }, []);

    const clearKey = useCallback(() => {
        localStorage.removeItem('kie_key');
        setHasKey(false);
    }, []);

    const openSignIn = useCallback((onSuccess) => setDialog({ onSuccess }), []);
    const closeSignIn = useCallback(() => setDialog(null), []);

    // Runs `fn` now if the user can generate, otherwise after they sign in.
    const requireAuth = useCallback((fn) => {
        if (localStorage.getItem('cf_backend') || localStorage.getItem('kie_key')) fn();
        else setDialog({ onSuccess: fn });
    }, []);

    const value = useMemo(() => ({
        backend, hasKey, credits, signedIn: backend || hasKey,
        signIn, signOut, saveKey, clearKey, refreshCredits,
        dialog, openSignIn, closeSignIn, requireAuth,
    }), [backend, hasKey, credits, signIn, signOut, saveKey, clearKey, refreshCredits, dialog, openSignIn, closeSignIn, requireAuth]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
