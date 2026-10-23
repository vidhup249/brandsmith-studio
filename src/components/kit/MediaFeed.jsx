import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Play } from 'lucide-react';
import RotatingText from '~/components/reactbits/RotatingText.jsx';
import { downloadMedia, isVideoUrl } from '~/lib/media.js';
import { cn } from '~/lib/utils';

const COOKING_LINES = ['Mixing pixels', 'Warming up the GPU', 'Sprinkling detail', 'Arguing with light', 'Almost there'];

function ratioStyle(ar) {
    const [w, h] = String(ar || '').split(':').map(Number);
    return w > 0 && h > 0 ? { aspectRatio: `${w} / ${h}` } : { aspectRatio: '1 / 1' };
}

function Elapsed({ since }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const s = Math.max(0, Math.floor((now - since) / 1000));
    return <span className="font-mono tabular-nums">{s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`}</span>;
}

export function PendingCard({ job, kind = 'image' }) {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface" style={ratioStyle(job.meta?.aspect_ratio)}>
            <div className="skeleton-sweep absolute inset-0" />
            <div className="absolute -top-1/4 -left-1/4 size-3/4 animate-float rounded-full bg-coral/25 blur-3xl" />
            <div className="absolute -right-1/4 -bottom-1/4 size-3/4 animate-float rounded-full bg-violet/25 blur-3xl [animation-delay:-3s]" />
            <div className="relative flex h-full min-h-40 flex-col justify-between p-4">
                <span className="eyebrow self-start rounded-full bg-ink/50 px-2.5 py-1 text-fg-muted backdrop-blur">
                    {job.resumed ? 'Resumed' : kind === 'video' ? 'Rendering' : 'Generating'}
                </span>
                <div className="flex flex-col gap-1">
                    <RotatingText
                        texts={COOKING_LINES}
                        rotationInterval={2200}
                        mainClassName="font-display text-lg font-semibold text-fg overflow-hidden"
                        staggerFrom="first"
                        staggerDuration={0.015}
                    />
                    <span className="text-xs text-fg-muted"><Elapsed since={job.startedAt} /> · {job.meta?.prompt ? `“${job.meta.prompt.slice(0, 60)}${job.meta.prompt.length > 60 ? '…' : ''}”` : 'no prompt'}</span>
                </div>
            </div>
        </div>
    );
}

export function MediaCard({ item, onOpen, kind, index = 0 }) {
    const video = kind === 'video' || isVideoUrl(item.url);
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04 }}
            className="group relative cursor-zoom-in overflow-hidden rounded-3xl border border-line bg-surface"
            onClick={onOpen}
        >
            {video ? (
                <video
                    src={item.url}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                    className="block w-full transition-transform duration-700 group-hover:scale-[1.03]"
                    style={ratioStyle(item.aspect_ratio)}
                />
            ) : (
                <img
                    src={item.url}
                    alt={item.prompt || 'Generated image'}
                    loading="lazy"
                    className="block w-full transition-transform duration-700 group-hover:scale-[1.03]"
                />
            )}
            {video && (
                <span className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-full bg-ink/60 text-fg backdrop-blur group-hover:opacity-0">
                    <Play className="size-3.5 fill-current" />
                </span>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-3.5 pt-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="line-clamp-2 text-xs leading-snug text-fg/90">{item.prompt || 'Untitled'}</p>
                <button
                    type="button"
                    title="Download"
                    onClick={(e) => { e.stopPropagation(); downloadMedia(item.url, `matai-${item.id}.${video ? 'mp4' : 'jpg'}`); }}
                    className="pointer-events-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-fg text-ink transition-transform hover:scale-110"
                >
                    <Download className="size-4" />
                </button>
            </div>
        </motion.div>
    );
}

// Masonry grid of finished results with in-flight jobs first.
export function MediaFeed({ items, pending = [], onOpen, kind = 'image', className }) {
    return (
        <div className={cn('columns-2 gap-3 md:columns-3 md:gap-4 xl:columns-4', className)}>
            <AnimatePresence initial={false}>
                {pending.map((job) => (
                    <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mb-3 break-inside-avoid md:mb-4"
                    >
                        <PendingCard job={job} kind={kind} />
                    </motion.div>
                ))}
            </AnimatePresence>
            {items.map((item, i) => (
                <div key={item.id} className="mb-3 break-inside-avoid md:mb-4">
                    <MediaCard item={item} kind={kind} index={i} onOpen={() => onOpen?.(i)} />
                </div>
            ))}
        </div>
    );
}
