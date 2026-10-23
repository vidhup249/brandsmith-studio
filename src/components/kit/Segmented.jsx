import { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '~/lib/utils';

// Segmented control with a sliding highlight.
export function Segmented({ options, value, onChange, size = 'md', className }) {
    const id = useId();
    return (
        <div className={cn('inline-flex rounded-full border border-line bg-white/[0.03] p-1', className)}>
            {options.map((opt) => {
                const key = typeof opt === 'object' ? opt.value : opt;
                const label = typeof opt === 'object' ? opt.label : opt;
                const icon = typeof opt === 'object' ? opt.icon : null;
                const selected = key === value;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        className={cn(
                            'relative flex items-center gap-1.5 rounded-full font-medium transition-colors',
                            size === 'sm' ? 'h-7 px-3 text-xs' : 'h-9 px-4 text-[13px]',
                            selected ? 'text-ink' : 'text-fg-muted hover:text-fg'
                        )}
                    >
                        {selected && (
                            <motion.span
                                layoutId={`seg-${id}`}
                                className="absolute inset-0 rounded-full bg-fg"
                                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                            />
                        )}
                        <span className="relative flex items-center gap-1.5">{icon}{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
