import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '~/lib/utils';

// Centered dialog with a blurred backdrop. Closes on Escape and backdrop click.
export function Modal({ open, onClose, children, className, closable = true }) {
    useEffect(() => {
        if (!open || !closable) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, closable, onClose]);

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[400] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-ink/70 backdrop-blur-md" onClick={closable ? onClose : undefined} />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        initial={{ opacity: 0, y: 24, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        className={cn('relative w-full max-w-md overflow-hidden rounded-[2rem] border border-line bg-surface shadow-float', className)}
                    >
                        {closable && (
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full text-fg-faint transition-colors hover:bg-white/5 hover:text-fg"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
