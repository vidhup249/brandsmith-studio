import { Loader2, Sparkles } from 'lucide-react';
import { ShimmerButton } from '~/components/ui/shimmer-button.jsx';
import ClickSpark from '~/components/reactbits/ClickSpark.jsx';
import { cn } from '~/lib/utils';

// The big coral call-to-action: Magic UI shimmer + React Bits click sparks.
export function GenerateButton({ busy, disabled, onClick, label = 'Generate', busyLabel = 'Cooking…', count, className }) {
    return (
        <ClickSpark className="!h-auto !w-auto" sparkColor="#d4f25a" sparkSize={9} sparkRadius={22} sparkCount={9} duration={420}>
            <ShimmerButton
                onClick={onClick}
                disabled={disabled}
                background="linear-gradient(135deg, #ff7a5c 0%, #ff6a4d 45%, #f2533a 100%)"
                shimmerColor="#fff3d6"
                shimmerDuration="2.6s"
                borderRadius="999px"
                className={cn(
                    'h-11 gap-2 border-white/20 px-6 text-sm font-semibold text-primary-foreground shadow-glow-coral',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    className
                )}
            >
                <span className="relative z-10 flex items-center gap-2">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {busy ? busyLabel : label}
                    {count > 1 && !busy && (
                        <span className="rounded-full bg-ink/15 px-1.5 font-mono text-[11px]">×{count}</span>
                    )}
                </span>
            </ShimmerButton>
        </ClickSpark>
    );
}
