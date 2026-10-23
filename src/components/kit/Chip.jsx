import { forwardRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '~/lib/utils';

// Pill-shaped control button used in the prompt docks (model, ratio, quality, ...).
export const Chip = forwardRef(function Chip({ icon, label, active, caret = true, className, children, ...props }, ref) {
    return (
        <motion.button
            ref={ref}
            type="button"
            whileTap={{ scale: 0.95 }}
            className={cn(
                'group inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
                active
                    ? 'border-violet/50 bg-violet/15 text-fg'
                    : 'border-line bg-white/[0.04] text-fg-muted hover:border-line-strong hover:bg-white/[0.07] hover:text-fg',
                className
            )}
            {...props}
        >
            {icon && <span className="flex items-center text-fg-faint group-hover:text-fg-muted">{icon}</span>}
            {label != null && <span className="max-w-[11rem] truncate">{label}</span>}
            {children}
            {caret && <ChevronDown className={cn('size-3.5 opacity-50 transition-transform', active && 'rotate-180')} />}
        </motion.button>
    );
});

// A single-choice list for dropdowns.
export function OptionList({ options, value, onSelect, render }) {
    return (
        <div className="flex flex-col gap-0.5 overflow-y-auto">
            {options.map((opt) => {
                const key = typeof opt === 'object' ? opt.value : opt;
                const label = typeof opt === 'object' ? opt.label : opt;
                const selected = key === value;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onSelect(key)}
                        className={cn(
                            'flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors',
                            selected ? 'bg-white/[0.07] text-fg' : 'text-fg-muted hover:bg-white/[0.05] hover:text-fg'
                        )}
                    >
                        <span className="flex items-center gap-3">{render ? render(opt, selected) : label}</span>
                        {selected && <Check className="size-4 text-lime" />}
                    </button>
                );
            })}
        </div>
    );
}

// Aspect ratio glyph: a little rectangle drawn to the ratio's proportions.
export function RatioGlyph({ ratio, className }) {
    const [w, h] = String(ratio).split(':').map(Number);
    const ok = w > 0 && h > 0;
    const scale = ok ? 14 / Math.max(w, h) : 1;
    return (
        <span className={cn('inline-flex size-4 items-center justify-center', className)}>
            <span
                className="rounded-[3px] border-[1.5px] border-current"
                style={ok ? { width: Math.max(5, w * scale), height: Math.max(5, h * scale) } : { width: 12, height: 12 }}
            />
        </span>
    );
}
