import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Copy, Download, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from './Button.jsx';
import { downloadMedia, isVideoUrl, timeAgo } from '~/lib/media.js';

/**
 * Full-screen viewer for a list of results. Arrow keys move between items.
 *   details(item) – extra rows for the side panel: [{ label, value }]
 *   actions(item, close) – extra buttons (reuse, use as reference, ...)
 */
export function Lightbox({ items, index, onIndexChange, onClose, kind, details, actions }) {
    const open = index != null && items[index];
    const item = open ? items[index] : null;

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
            if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, index, items.length, onClose, onIndexChange]);

    const video = item && (kind === 'video' || item.mediaType === 'video' || isVideoUrl(item.url));

    return createPortal(
        <AnimatePresence>
            {item && (
                <motion.div
                    className="fixed inset-0 z-[350] flex flex-col bg-ink/90 backdrop-blur-xl lg:flex-row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 lg:p-10" onClick={onClose}>
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="flex max-h-full max-w-full items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {video ? (
                                <video src={item.url} controls autoPlay loop playsInline className="max-h-[calc(100dvh-14rem)] max-w-full rounded-3xl shadow-float lg:max-h-[calc(100dvh-5rem)]" />
                            ) : (
                                <img src={item.url} alt={item.prompt || ''} className="max-h-[calc(100dvh-14rem)] max-w-full rounded-3xl object-contain shadow-float lg:max-h-[calc(100dvh-5rem)]" />
                            )}
                        </motion.div>
                        {index > 0 && (
                            <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
                                className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-surface-2/80 text-fg backdrop-blur hover:bg-surface-3">
                                <ChevronLeft className="size-5" />
                            </button>
                        )}
                        {index < items.length - 1 && (
                            <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
                                className="absolute right-3 flex size-10 items-center justify-center rounded-full bg-surface-2/80 text-fg backdrop-blur hover:bg-surface-3">
                                <ChevronRight className="size-5" />
                            </button>
                        )}
                    </div>

                    <motion.aside
                        initial={{ x: 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                        className="flex max-h-[45dvh] w-full shrink-0 flex-col gap-5 overflow-y-auto border-t border-line bg-surface p-6 lg:max-h-none lg:w-[22rem] lg:border-t-0 lg:border-l"
                    >
                        <div className="flex items-center justify-between">
                            <span className="eyebrow">{index + 1} / {items.length}</span>
                            <button type="button" onClick={onClose} aria-label="Close"
                                className="flex size-8 items-center justify-center rounded-full text-fg-muted hover:bg-white/5 hover:text-fg">
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="eyebrow">Prompt</span>
                            <p className="text-[15px] leading-relaxed text-fg">{item.prompt || <span className="text-fg-faint">No prompt</span>}</p>
                            {item.prompt && (
                                <button type="button" onClick={() => { navigator.clipboard.writeText(item.prompt); toast.success('Prompt copied'); }}
                                    className="flex items-center gap-1.5 self-start text-xs text-fg-muted hover:text-fg">
                                    <Copy className="size-3.5" /> Copy prompt
                                </button>
                            )}
                        </div>

                        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-line p-4">
                            {(details?.(item) || []).filter(d => d.value).map(d => (
                                <div key={d.label} className="min-w-0">
                                    <dt className="eyebrow mb-1">{d.label}</dt>
                                    <dd className="truncate text-sm text-fg" title={String(d.value)}>{d.value}</dd>
                                </div>
                            ))}
                            {item.timestamp && (
                                <div>
                                    <dt className="eyebrow mb-1">Created</dt>
                                    <dd className="text-sm text-fg">{timeAgo(item.timestamp)}</dd>
                                </div>
                            )}
                        </dl>

                        <div className="mt-auto flex flex-col gap-2">
                            {actions?.(item, onClose)}
                            <Button variant="primary" className="w-full justify-center" onClick={() => downloadMedia(item.url, `matai-${item.id}.${video ? 'mp4' : 'jpg'}`)}>
                                <Download className="size-4" /> Download
                            </Button>
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
