import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, KeyRound, Loader2 } from 'lucide-react';
import { Modal } from '~/components/kit/Modal.jsx';
import { Button } from '~/components/kit/Button.jsx';
import { BorderBeam } from '~/components/ui/border-beam.jsx';
import { useAuth } from '~/app/auth.jsx';

const inputClass = 'h-12 w-full rounded-2xl border border-line bg-ink/60 px-4 text-[15px] text-fg placeholder:text-fg-faint transition-colors focus:border-violet/70 focus:outline-none';

// Sign in with a content-factory account (first name + PIN), or paste a kie.ai key.
export function SignInDialog() {
    const { dialog, closeSignIn, signIn, saveKey } = useAuth();
    const [mode, setMode] = useState('account');
    const [name, setName] = useState('');
    const [pin, setPin] = useState('');
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (dialog) { setMode('account'); setError(''); setPin(''); }
    }, [dialog]);

    const finish = () => {
        const next = dialog?.onSuccess;
        closeSignIn();
        if (next) setTimeout(next, 0);
    };

    const submitAccount = async (e) => {
        e.preventDefault();
        if (!name.trim() || !pin.trim()) { setError('Enter your first name and PIN.'); return; }
        setBusy(true);
        setError('');
        try {
            await signIn(name, pin);
            finish();
        } catch (err) {
            setError(err.message || 'Sign in failed.');
        } finally {
            setBusy(false);
        }
    };

    const submitKey = (e) => {
        e.preventDefault();
        if (!key.trim()) { setError('Paste your kie.ai API key.'); return; }
        saveKey(key);
        finish();
    };

    return (
        <Modal open={!!dialog} onClose={closeSignIn}>
            <BorderBeam size={160} duration={8} colorFrom="#ff6a4d" colorTo="#9b7bff" borderWidth={1.5} />
            <div className="relative p-8 pt-10">
                <div className="mb-7 flex flex-col items-center text-center">
                    <span className="mb-5 flex size-14 items-center justify-center rounded-[38%_62%_55%_45%/45%_40%_60%_55%] bg-gradient-to-br from-coral via-pink to-violet shadow-glow-coral">
                        <svg viewBox="0 0 24 24" className="size-6 text-ink" fill="currentColor" aria-hidden="true">
                            <path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5-4.6.5-7 2.9-7.5 7.5-.5-4.6-2.9-7-7.5-7.5 4.6-.5 7-2.9 7.5-7.5Z" />
                        </svg>
                    </span>
                    <h2 className="font-display text-3xl font-extrabold tracking-tight text-fg">
                        {mode === 'account' ? 'Hey, welcome back' : 'Bring your own key'}
                    </h2>
                    <p className="mt-2 text-sm text-fg-muted">
                        {mode === 'account'
                            ? 'Sign in to content-factory for credits, the shared library and the prompt builder.'
                            : 'Requests go straight from this browser to kie.ai, billed to your key.'}
                    </p>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                    {mode === 'account' ? (
                        <motion.form key="account" onSubmit={submitAccount} className="flex flex-col gap-3"
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                            <input autoFocus className={inputClass} placeholder="First name" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} />
                            <input className={inputClass} placeholder="PIN" type="password" autoComplete="current-password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
                            {error && <p className="text-center text-sm text-danger">{error}</p>}
                            <Button type="submit" variant="primary" size="lg" disabled={busy} className="mt-2 w-full justify-center">
                                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                                {busy ? 'Signing in…' : 'Sign in'}
                                {!busy && <ArrowRight className="size-4" />}
                            </Button>
                        </motion.form>
                    ) : (
                        <motion.form key="key" onSubmit={submitKey} className="flex flex-col gap-3"
                            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                            <input autoFocus className={inputClass} placeholder="kie.ai API key" type="password" value={key} onChange={(e) => setKey(e.target.value)} />
                            {error && <p className="text-center text-sm text-danger">{error}</p>}
                            <Button type="submit" variant="primary" size="lg" className="mt-2 w-full justify-center">
                                Save key <ArrowRight className="size-4" />
                            </Button>
                            <a href="https://kie.ai/api-key" target="_blank" rel="noreferrer" className="text-center text-xs text-fg-faint hover:text-fg-muted">
                                Get a key at kie.ai →
                            </a>
                        </motion.form>
                    )}
                </AnimatePresence>

                <button
                    type="button"
                    onClick={() => { setMode(mode === 'account' ? 'key' : 'account'); setError(''); }}
                    className="mx-auto mt-6 flex items-center gap-2 text-xs text-fg-muted transition-colors hover:text-fg"
                >
                    <KeyRound className="size-3.5" />
                    {mode === 'account' ? 'Use a kie.ai API key instead' : 'Sign in with content-factory instead'}
                </button>
            </div>
        </Modal>
    );
}
