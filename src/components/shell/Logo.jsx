import { cn } from '~/lib/utils';

// Wordmark: a squishy gradient blob with a sparkle, then "matai" in the display face.
export function Logo({ className, onClick }) {
    return (
        <button type="button" onClick={onClick} className={cn('group flex items-center gap-2.5', className)} aria-label="MATAI home">
            <span className="relative flex size-9 items-center justify-center rounded-[38%_62%_55%_45%/45%_40%_60%_55%] bg-gradient-to-br from-coral via-pink to-violet shadow-glow-coral transition-[border-radius,transform] duration-500 group-hover:rotate-12 group-hover:rounded-[55%_45%_40%_60%/60%_55%_45%_40%]">
                <svg viewBox="0 0 24 24" className="size-[18px] text-ink" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5-4.6.5-7 2.9-7.5 7.5-.5-4.6-2.9-7-7.5-7.5 4.6-.5 7-2.9 7.5-7.5Z" />
                    <circle cx="19" cy="19" r="2" />
                </svg>
            </span>
            <span className="font-display text-[22px] font-extrabold tracking-[-0.04em] text-fg">matai</span>
        </button>
    );
}
