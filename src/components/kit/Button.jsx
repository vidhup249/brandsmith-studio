import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '~/lib/utils';

const VARIANTS = {
    primary: 'bg-coral text-primary-foreground hover:bg-[#ff7d63] shadow-glow-coral',
    secondary: 'bg-surface-2 text-fg hover:bg-surface-3 border border-line',
    ghost: 'text-fg-muted hover:text-fg hover:bg-white/5',
    outline: 'border border-line-strong text-fg hover:bg-white/5',
    lime: 'bg-lime text-ink hover:brightness-105',
    danger: 'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30',
};

const SIZES = {
    xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-full',
    sm: 'h-9 px-3.5 text-[13px] gap-2 rounded-full',
    md: 'h-11 px-5 text-sm gap-2 rounded-full',
    lg: 'h-13 px-7 text-base gap-2.5 rounded-full',
    icon: 'size-9 rounded-full justify-center',
    'icon-sm': 'size-7 rounded-full justify-center',
};

export const Button = forwardRef(function Button(
    { variant = 'secondary', size = 'md', className, children, disabled, ...props },
    ref
) {
    return (
        <motion.button
            ref={ref}
            type="button"
            whileTap={disabled ? undefined : { scale: 0.96 }}
            disabled={disabled}
            className={cn(
                'inline-flex shrink-0 items-center font-medium whitespace-nowrap transition-colors duration-200 select-none',
                'disabled:pointer-events-none disabled:opacity-40',
                VARIANTS[variant],
                SIZES[size],
                className
            )}
            {...props}
        >
            {children}
        </motion.button>
    );
});
