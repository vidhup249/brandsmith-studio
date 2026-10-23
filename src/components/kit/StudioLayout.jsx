import { motion } from 'motion/react';
import RotatingText from '~/components/reactbits/RotatingText.jsx';
import { cn } from '~/lib/utils';

/**
 * Page frame for a studio: scrollable results area with the prompt dock pinned
 * to the bottom. While there are no results it shows the hero instead.
 */
export function StudioLayout({ hero, empty, feed, dock, className }) {
    return (
        <div className={cn('relative flex h-full min-h-0 flex-col', className)}>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-72 md:px-8 md:pt-8 md:pb-64">
                <div className="mx-auto w-full max-w-6xl">
                    {empty ? hero : feed}
                </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent px-3 pt-16 pb-3 md:px-6 md:pb-6">
                <div className="pointer-events-auto mx-auto w-full max-w-3xl">{dock}</div>
            </div>
        </div>
    );
}

/**
 * Big playful headline for an empty studio.
 *   title: lead-in text; words: rotating highlighted words; accent: tailwind bg class for the pill
 */
export function StudioHero({ eyebrow, title, words, accent = 'bg-coral', subtitle, children }) {
    return (
        <div className="flex min-h-[calc(100dvh-24rem)] flex-col items-center justify-center py-10 text-center">
            {eyebrow && (
                <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="eyebrow mb-5 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-fg-muted"
                >
                    {eyebrow}
                </motion.span>
            )}
            <motion.h1
                initial={{ opacity: 0, y: 14, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.6 }}
                className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-display text-4xl font-extrabold tracking-[-0.03em] text-fg sm:text-5xl md:text-7xl"
            >
                <span>{title}</span>
                {words?.length > 0 && (
                    <RotatingText
                        texts={words}
                        rotationInterval={2400}
                        staggerFrom="last"
                        staggerDuration={0.02}
                        mainClassName={cn('overflow-hidden rounded-2xl px-3 py-0.5 text-ink md:rounded-3xl md:px-4', accent)}
                        splitLevelClassName="overflow-hidden pb-1"
                    />
                )}
            </motion.h1>
            {subtitle && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="mt-5 max-w-xl text-base text-fg-muted md:text-lg"
                >
                    {subtitle}
                </motion.p>
            )}
            {children && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mt-8 flex w-full flex-col items-center"
                >
                    {children}
                </motion.div>
            )}
        </div>
    );
}

// Feed header row: title + count + right-side slot.
export function FeedHeader({ title, count, right }) {
    return (
        <div className="mb-5 flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-3">
                <h2 className="font-display text-2xl font-bold tracking-tight text-fg md:text-3xl">{title}</h2>
                {count != null && <span className="font-mono text-xs text-fg-faint">{count}</span>}
            </div>
            {right}
        </div>
    );
}
