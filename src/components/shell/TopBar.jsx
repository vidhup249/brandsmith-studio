import { motion } from 'motion/react';
import { KeyRound, LogOut, User } from 'lucide-react';
import { Logo } from './Logo.jsx';
import { Dropdown } from '~/components/kit/Dropdown.jsx';
import { Button } from '~/components/kit/Button.jsx';
import { NumberTicker } from '~/components/ui/number-ticker.jsx';
import { useAuth } from '~/app/auth.jsx';
import { ROUTES } from '~/app/routes.js';
import { cn } from '~/lib/utils';

// `id` keeps the desktop and mobile navs' sliding highlights separate.
function NavPill({ id, route, onNavigate }) {
    return (
        <nav className="glass no-scrollbar flex items-center gap-0.5 overflow-x-auto rounded-full p-1 shadow-float">
            {ROUTES.map((r) => {
                const active = r.id === route;
                const Icon = r.icon;
                return (
                    <button
                        key={r.id}
                        type="button"
                        onClick={() => onNavigate(r.id)}
                        className={cn(
                            'relative flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors md:px-4',
                            active ? 'text-ink' : 'text-fg-muted hover:text-fg'
                        )}
                    >
                        {active && (
                            <motion.span
                                layoutId={`nav-active-${id}`}
                                className={cn('absolute inset-0 rounded-full', r.accent)}
                                transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                            />
                        )}
                        <Icon className="relative size-4" />
                        <span className={cn('relative', active ? 'inline' : 'hidden sm:inline')}>{r.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

function Account() {
    const { backend, hasKey, credits, signOut, clearKey, openSignIn } = useAuth();

    if (!backend && !hasKey) {
        return <Button variant="primary" size="sm" onClick={() => openSignIn()}>Sign in</Button>;
    }

    return (
        <div className="flex items-center gap-2">
            {backend && credits != null && (
                <span className="glass hidden h-9 items-center gap-2 rounded-full pr-3.5 pl-3 text-[13px] sm:flex" title="Credits remaining">
                    <span className="size-2 rounded-full bg-lime shadow-[0_0_10px_var(--color-lime)]" />
                    <NumberTicker value={Number(credits) || 0} className="font-mono font-medium text-fg" />
                    <span className="text-fg-faint">credits</span>
                </span>
            )}
            <Dropdown
                width={260}
                align="end"
                placement="bottom"
                trigger={({ toggle }) => (
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label="Account"
                        className="glass flex size-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:text-fg"
                    >
                        {backend ? <User className="size-4" /> : <KeyRound className="size-4" />}
                    </button>
                )}
            >
                {({ close }) => (
                    <div className="flex flex-col gap-1 p-1">
                        <div className="px-3 pt-2 pb-3">
                            <p className="text-sm font-semibold text-fg">{backend ? 'content-factory account' : 'Your kie.ai key'}</p>
                            <p className="text-xs text-fg-faint">
                                {backend ? 'Keys, credits and library live on the server.' : 'Requests go straight to kie.ai from this browser.'}
                            </p>
                            {backend && credits != null && (
                                <p className="mt-2 font-mono text-xs text-lime sm:hidden">{credits} credits</p>
                            )}
                        </div>
                        {backend && hasKey && (
                            <button type="button" onClick={() => { clearKey(); close(); }}
                                className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm text-fg-muted hover:bg-white/5 hover:text-fg">
                                <KeyRound className="size-4" /> Forget saved kie.ai key
                            </button>
                        )}
                        {!backend && (
                            <button type="button" onClick={() => { close(); openSignIn(); }}
                                className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm text-fg-muted hover:bg-white/5 hover:text-fg">
                                <User className="size-4" /> Sign in to content-factory
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => { close(); if (backend) signOut(); else clearKey(); }}
                            className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm text-danger hover:bg-danger/10"
                        >
                            <LogOut className="size-4" /> {backend ? 'Sign out' : 'Remove key'}
                        </button>
                    </div>
                )}
            </Dropdown>
        </div>
    );
}

export function TopBar({ route, onNavigate }) {
    return (
        <header className="relative z-40 flex shrink-0 items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <Logo onClick={() => onNavigate('library')} className="shrink-0" />
            <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
                <NavPill id="desktop" route={route} onNavigate={onNavigate} />
            </div>
            <Account />
            <div className="fixed inset-x-3 bottom-3 z-50 flex justify-center md:hidden">
                <NavPill id="mobile" route={route} onNavigate={onNavigate} />
            </div>
        </header>
    );
}
