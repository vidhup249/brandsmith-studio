// MATAI Library — every generated asset from the content-factory backend.
// All media types in one place (images, videos, talking avatars), newest first.
// Requires a backend session; prompts sign-in otherwise.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ExternalLink, Library, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react';
import { listLibrary } from '~/lib/api.js';
import { timeAgo } from '~/lib/media.js';
import { useAuth } from '~/app/auth.jsx';
import { Button } from '~/components/kit/Button.jsx';
import { Segmented } from '~/components/kit/Segmented.jsx';
import { Lightbox } from '~/components/kit/Lightbox.jsx';
import { MagicCard } from '~/components/ui/magic-card.jsx';
import GradientText from '~/components/reactbits/GradientText.jsx';
import { cn } from '~/lib/utils';

function kindLabel(item) {
    const model = String(item.model || '').toLowerCase();
    if (/omnihuman|infinitalk|avatar|lipsync/.test(model)) return 'Talking';
    if (Number(item.duration) > 0 || /kling|seedance|wan|video|happyhorse/.test(model)) return 'Video';
    return 'Image';
}

function groupOf(item) {
    return String(item.kind || '').toLowerCase() === 'videos' ? 'videos' : 'images';
}

const KIND_STYLES = {
    Image: 'bg-coral text-ink',
    Video: 'bg-violet text-ink',
    Talking: 'bg-lime text-ink',
};

function Tile({ item, onOpen, index }) {
    const ready = Boolean(item.url);
    const video = groupOf(item) === 'videos';
    const failed = item.state === 'failed' || item.status === 'Failed';
    const queued = item.state === 'waiting' || item.state === 'draft';
    const kind = kindLabel(item);

    return (
        <motion.div
            initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, delay: Math.min(index, 12) * 0.035 }}
            className="rounded-3xl"
        >
            <MagicCard
                mode="orb"
                glowFrom="#ff6a4d"
                glowTo="#9b7bff"
                glowSize={260}
                glowOpacity={0.35}
                className={cn('rounded-3xl', ready ? 'cursor-zoom-in' : 'cursor-default')}
            >
                <div className="group relative" onClick={ready ? onOpen : undefined}>
                    <div className="aspect-square w-full overflow-hidden rounded-[calc(1.5rem-1px)] bg-ink/60">
                        {item.thumb && video ? (
                            <video src={item.url} poster={item.thumb} muted playsInline preload="metadata"
                                onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : item.thumb ? (
                            <img src={item.thumb} alt={`${item.model || 'Generated'} result`} loading="lazy"
                                className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                            <div className="flex size-full flex-col items-center justify-center gap-2.5">
                                {queued && <><Loader2 className="size-6 animate-spin text-violet" /><span className="eyebrow">Queued</span></>}
                                {failed && <><AlertCircle className="size-6 text-danger" /><span className="eyebrow">Failed</span></>}
                                {!queued && !failed && <span className="eyebrow">No preview</span>}
                            </div>
                        )}
                    </div>

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className={cn('rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider uppercase', KIND_STYLES[kind])}>{kind}</span>
                        {!ready && (
                            <span className="rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[10px] tracking-wider text-fg-muted uppercase backdrop-blur">
                                {item.status || item.state || 'draft'}
                            </span>
                        )}
                    </div>
                    {video && ready && (
                        <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-ink/60 text-fg backdrop-blur group-hover:opacity-0">
                            <Play className="size-3.5 fill-current" />
                        </span>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[calc(1.5rem-1px)] bg-gradient-to-t from-ink/95 via-ink/60 to-transparent p-3.5 pt-14 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <p className="truncate text-xs font-medium text-fg">{item.model || 'unknown model'}</p>
                        {item.prompt && <p className="mt-0.5 line-clamp-2 text-[11px] text-fg-muted">{item.prompt}</p>}
                        <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-fg-faint">
                            <span>{timeAgo(item.createdAt)}</span>
                            {item.credits ? <span className="text-lime">{item.credits} cr</span> : null}
                            {item.duration ? <span>{item.duration}s</span> : null}
                        </div>
                    </div>
                </div>
            </MagicCard>
        </motion.div>
    );
}

function SignedOut({ onSignIn }) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <span className="mb-6 flex size-16 animate-float items-center justify-center rounded-[38%_62%_55%_45%/45%_40%_60%_55%] bg-gradient-to-br from-coral via-pink to-violet shadow-glow-coral [--float-rotate:-6deg]">
                <Library className="size-7 text-ink" />
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-fg md:text-4xl">Your library lives here</h2>
            <p className="mt-3 max-w-sm text-fg-muted">Sign in to your content-factory account to browse everything you’ve made, across every device.</p>
            <Button variant="primary" size="lg" className="mt-7" onClick={onSignIn}>Sign in</Button>
        </div>
    );
}

export default function LibraryPage({ onNavigate }) {
    const { backend, openSignIn } = useAuth();
    const [items, setItems] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [viewer, setViewer] = useState(null);

    const load = useCallback(async () => {
        if (!backend) return;
        setLoading(true);
        setError('');
        try {
            setItems((await listLibrary()) || []);
        } catch (err) {
            setError(err.message || 'Failed to load the library.');
        } finally {
            setLoading(false);
        }
    }, [backend]);

    useEffect(() => { load(); }, [load]);

    const visible = useMemo(() => items
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .filter(it => filter === 'all' || groupOf(it) === filter), [items, filter]);

    const viewable = useMemo(() => visible.filter(it => it.url), [visible]);
    const counts = useMemo(() => ({
        all: items.length,
        images: items.filter(i => groupOf(i) === 'images').length,
        videos: items.filter(i => groupOf(i) === 'videos').length,
    }), [items]);

    return (
        <div className="h-full overflow-y-auto px-4 pt-4 pb-24 md:px-8 md:pt-8">
            <div className="mx-auto w-full max-w-7xl">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <span className="eyebrow">Everything you’ve made</span>
                        <h1 className="mt-2 font-display text-5xl font-extrabold tracking-[-0.035em] text-fg md:text-6xl">
                            Your{' '}
                            <GradientText colors={['#ff6a4d', '#ff8fcb', '#9b7bff', '#d4f25a', '#ff6a4d']} animationSpeed={10} className="inline-flex">
                                library
                            </GradientText>
                        </h1>
                    </div>
                    {backend && (
                        <div className="flex items-center gap-2">
                            <Segmented
                                value={filter}
                                onChange={setFilter}
                                options={[
                                    { value: 'all', label: `All ${counts.all || ''}`.trim() },
                                    { value: 'images', label: `Images ${counts.images || ''}`.trim() },
                                    { value: 'videos', label: `Videos ${counts.videos || ''}`.trim() },
                                ]}
                            />
                            <Button size="icon" variant="secondary" onClick={load} disabled={loading} title="Refresh">
                                <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
                            </Button>
                        </div>
                    )}
                </div>

                {!backend ? (
                    <SignedOut onSignIn={() => openSignIn(load)} />
                ) : error ? (
                    <div className="flex flex-col items-center gap-4 py-24 text-center">
                        <AlertCircle className="size-8 text-danger" />
                        <p className="text-fg-muted">{error}</p>
                        <Button variant="secondary" onClick={load}>Try again</Button>
                    </div>
                ) : loading && !items.length ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="skeleton-sweep aspect-square rounded-3xl border border-line" />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-24 text-center">
                        <Sparkles className="size-8 text-violet" />
                        <p className="text-fg-muted">
                            {filter === 'all' ? 'Nothing here yet — your creations land here.' : `No ${filter} yet.`}
                        </p>
                        <Button variant="primary" onClick={() => onNavigate(filter === 'videos' ? 'video' : 'image')}>
                            Make something
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                        {visible.map((item, i) => (
                            <Tile key={item.id || i} item={item} index={i} onOpen={() => setViewer(viewable.indexOf(item))} />
                        ))}
                    </div>
                )}
            </div>

            <Lightbox
                items={viewable.map(it => ({ ...it, timestamp: it.createdAt, mediaType: groupOf(it) === 'videos' ? 'video' : 'image' }))}
                index={viewer}
                onIndexChange={setViewer}
                onClose={() => setViewer(null)}
                details={(it) => [
                    { label: 'Model', value: it.model },
                    { label: 'Type', value: kindLabel(it) },
                    { label: 'Credits', value: it.credits ? `${it.credits}` : null },
                    { label: 'Duration', value: it.duration ? `${it.duration}s` : null },
                ]}
                actions={(it) => (
                    <Button variant="secondary" className="w-full justify-center" onClick={() => window.open(it.url, '_blank', 'noopener')}>
                        <ExternalLink className="size-4" /> Open original
                    </Button>
                )}
            />
        </div>
    );
}
