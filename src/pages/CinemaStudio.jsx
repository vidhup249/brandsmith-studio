import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Aperture, Camera, Check, Clapperboard, Gem, RotateCcw, Trash2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { kie } from '~/lib/kie.js';
import { buildNanoBananaPrompt, CAMERA_MAP, LENS_MAP, FOCAL_PERSPECTIVE, APERTURE_EFFECT } from '~/lib/promptUtils.js';
import { readJSON } from '~/lib/media.js';
import { useGenerations } from '~/hooks/useGenerations.js';
import { useAuth } from '~/app/auth.jsx';
import { StudioLayout, StudioHero, FeedHeader } from '~/components/kit/StudioLayout.jsx';
import { PromptDock } from '~/components/kit/PromptDock.jsx';
import { GenerateButton } from '~/components/kit/GenerateButton.jsx';
import { Chip, OptionList, RatioGlyph } from '~/components/kit/Chip.jsx';
import { Dropdown, DropdownLabel } from '~/components/kit/Dropdown.jsx';
import { Button } from '~/components/kit/Button.jsx';
import { Modal } from '~/components/kit/Modal.jsx';
import { MediaFeed } from '~/components/kit/MediaFeed.jsx';
import { Lightbox } from '~/components/kit/Lightbox.jsx';
import { cn } from '~/lib/utils';

const STORAGE_KEY = 'cinema_history';
const MODEL = 'nano-banana-pro';
const NEGATIVE_PROMPT = 'blurry, low quality, distortion, bad composition';
const RATIOS = ['16:9', '21:9', '9:16', '1:1', '4:5'];
const RESOLUTIONS = ['1K', '2K', '4K'];

const CAMERAS = Object.keys(CAMERA_MAP);
const LENSES = Object.keys(LENS_MAP);
const FOCALS = Object.keys(FOCAL_PERSPECTIVE).map(Number);
const APERTURES = Object.keys(APERTURE_EFFECT);

const DEFAULT_RIG = { camera: CAMERAS[0], lens: LENSES[0], focal: 35, aperture: 'f/1.4' };

const assetFor = (name) => `/assets/cinema/${name.toLowerCase().replace(/[/.-]/g, '_').replace(/\s+/g, '_')}.webp`;

// Entries saved by the old studio have no id/prompt at the top level; give them
// both so the feed, lightbox and delete work on them.
(function migrateLegacyHistory() {
    const saved = readJSON(STORAGE_KEY, []);
    if (!Array.isArray(saved) || saved.every(e => e.id)) return;
    const migrated = saved.map((e, i) => e.id ? e : {
        ...e,
        id: `cinema-${e.timestamp || i}-${i}`,
        prompt: e.prompt ?? e.settings?.prompt ?? '',
        aspect_ratio: e.aspect_ratio ?? e.settings?.aspect_ratio,
        timestamp: typeof e.timestamp === 'number' ? new Date(e.timestamp).toISOString() : e.timestamp,
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch { /* storage blocked */ }
})();

function GearCard({ selected, onClick, image, title, subtitle, big }) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileHover={{ y: -3, rotate: selected ? 0 : -1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className={cn(
                'relative flex w-32 shrink-0 snap-start flex-col overflow-hidden rounded-3xl border bg-surface-2 text-left transition-colors md:w-36',
                selected ? 'border-pink shadow-[0_10px_40px_-10px_var(--color-pink)]' : 'border-line hover:border-line-strong'
            )}
        >
            <span className="relative block aspect-square w-full overflow-hidden bg-surface-3">
                {image ? (
                    <img src={image} alt="" loading="lazy" className={cn('size-full object-cover transition-all duration-500', selected ? 'scale-105 opacity-100' : 'opacity-70 grayscale-[35%]')} />
                ) : (
                    <span className={cn('flex size-full items-center justify-center font-display text-4xl font-extrabold tracking-tight', selected ? 'text-pink' : 'text-fg-faint')}>
                        {big}
                    </span>
                )}
                {selected && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-pink text-ink"
                    >
                        <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                )}
            </span>
            <span className="flex flex-col gap-0.5 p-3">
                <span className={cn('text-[13px] leading-tight font-semibold', selected ? 'text-fg' : 'text-fg-muted')}>{title}</span>
                {subtitle && <span className="line-clamp-2 text-[11px] leading-snug text-fg-faint">{subtitle}</span>}
            </span>
        </motion.button>
    );
}

function GearRow({ label, icon, children }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1 text-fg-muted">
                {icon}
                <span className="eyebrow">{label}</span>
            </div>
            <div className="no-scrollbar -mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-1 md:-mx-8 md:px-8">{children}</div>
        </section>
    );
}

// The camera rig: tactile cards for body, lens, focal length and aperture, with the
// compiled prompt updating live underneath.
function RigPanel({ open, onClose, rig, setRig, prompt }) {
    const set = (key, value) => setRig(r => ({ ...r, [key]: value }));
    const preview = buildNanoBananaPrompt(prompt.trim() || 'your scene', rig.camera, rig.lens, rig.focal, rig.aperture);

    return (
        <Modal open={open} onClose={onClose} className="flex max-h-[92dvh] max-w-5xl flex-col">
            <div className="flex shrink-0 items-center gap-3 px-6 pt-6 pb-4 md:px-8">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-pink text-ink">
                    <Camera className="size-5" />
                </span>
                <div>
                    <h2 className="font-display text-2xl font-extrabold tracking-tight text-fg">Camera rig</h2>
                    <p className="text-sm text-fg-muted">Pick your gear — it gets written into the prompt.</p>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-6 md:px-8">
                <GearRow label="Camera body" icon={<Camera className="size-3.5" />}>
                    {CAMERAS.map(c => (
                        <GearCard key={c} title={c} image={assetFor(c)} selected={rig.camera === c} onClick={() => set('camera', c)} />
                    ))}
                </GearRow>
                <GearRow label="Lens" icon={<Gem className="size-3.5" />}>
                    {LENSES.map(l => (
                        <GearCard key={l} title={l} image={assetFor(l)} selected={rig.lens === l} onClick={() => set('lens', l)} />
                    ))}
                </GearRow>
                <div className="grid gap-6 lg:grid-cols-2">
                    <GearRow label="Focal length" icon={<Clapperboard className="size-3.5" />}>
                        {FOCALS.map(f => (
                            <GearCard key={f} big={`${f}`} title={`${f}mm`} subtitle={FOCAL_PERSPECTIVE[f]} selected={Number(rig.focal) === f} onClick={() => set('focal', f)} />
                        ))}
                    </GearRow>
                    <GearRow label="Aperture" icon={<Aperture className="size-3.5" />}>
                        {APERTURES.map(a => (
                            <GearCard key={a} title={a} subtitle={APERTURE_EFFECT[a]} image={assetFor(a)} selected={rig.aperture === a} onClick={() => set('aperture', a)} />
                        ))}
                    </GearRow>
                </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-line bg-surface-2/60 px-6 py-4 md:flex-row md:items-center md:px-8">
                <div className="min-w-0 flex-1">
                    <span className="eyebrow">Compiled prompt</span>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-fg-muted md:line-clamp-2">{preview}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setRig(DEFAULT_RIG)}>
                        <RotateCcw className="size-3.5" /> Reset
                    </Button>
                    <Button variant="lime" size="sm" onClick={onClose}>
                        <Check className="size-3.5" /> Lock it in
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export default function CinemaStudio() {
    const { requireAuth, refreshCredits } = useAuth();
    const { items, pending, run, removeItem } = useGenerations({ studio: 'cinema', storageKey: STORAGE_KEY, limit: 50, maxAttempts: 300 });

    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [resolution, setResolution] = useState('2K');
    const [rig, setRig] = useState(DEFAULT_RIG);
    const [rigOpen, setRigOpen] = useState(false);
    const [viewIndex, setViewIndex] = useState(null);

    const shoot = (settings) => {
        const { prompt: basePrompt, aspect_ratio, resolution: res, camera, lens, focal, aperture } = settings;
        if (!basePrompt.trim()) {
            toast('Describe your scene first', { icon: '🎬' });
            return;
        }
        requireAuth(async () => {
            const finalPrompt = buildNanoBananaPrompt(basePrompt.trim(), camera, lens, focal, aperture);
            const stored = { prompt: basePrompt.trim(), camera, lens, focal, aperture, aspect_ratio, resolution: res };
            try {
                await run(
                    { prompt: stored.prompt, model: MODEL, aspect_ratio, settings: stored },
                    ({ onRequestId }) => kie.generateImage({
                        model: MODEL,
                        prompt: finalPrompt,
                        aspect_ratio,
                        resolution: (res || '1k').toLowerCase(),
                        negative_prompt: NEGATIVE_PROMPT,
                        onRequestId,
                    })
                );
                refreshCredits();
                toast.success('Shot’s in the can');
            } catch (e) {
                console.error(e);
                toast.error(`Generation failed: ${e.message}`);
            }
        });
    };

    const generate = () => shoot({ prompt, aspect_ratio: aspectRatio, resolution, ...rig });

    const reuse = (item) => {
        const s = item.settings || {};
        setPrompt(s.prompt ?? item.prompt ?? '');
        if (s.aspect_ratio) setAspectRatio(s.aspect_ratio);
        if (s.resolution) setResolution(s.resolution);
        if (s.camera) setRig({ camera: s.camera, lens: s.lens, focal: Number(s.focal), aperture: s.aperture });
    };

    const rigSummary = useMemo(() => `${rig.lens} · ${rig.focal}mm · ${rig.aperture}`, [rig]);

    const dock = (
        <PromptDock
            value={prompt}
            onChange={setPrompt}
            onSubmit={generate}
            busy={pending.length > 0}
            placeholder="Describe your scene — the rig handles the cinematography"
            leading={
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setRigOpen(true)}
                    title="Camera rig"
                    className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-pink/50"
                >
                    <img src={assetFor(rig.camera)} alt="" className="size-full object-cover" />
                    <span className="absolute right-0.5 bottom-0.5 size-2 rounded-full bg-pink shadow-[0_0_8px_var(--color-pink)]" />
                </motion.button>
            }
            controls={
                <>
                    <Chip
                        icon={<Camera className="size-4" />}
                        label={rig.camera}
                        active={rigOpen}
                        onClick={() => setRigOpen(true)}
                        title={rigSummary}
                    >
                        <span className="hidden text-fg-faint lg:inline">{rig.focal}mm · {rig.aperture}</span>
                    </Chip>
                    <Dropdown
                        width={200}
                        trigger={({ open, toggle }) => (
                            <Chip active={open} onClick={toggle} icon={<RatioGlyph ratio={aspectRatio} />} label={aspectRatio} />
                        )}
                    >
                        {({ close }) => (
                            <>
                                <DropdownLabel>Aspect ratio</DropdownLabel>
                                <OptionList
                                    options={RATIOS}
                                    value={aspectRatio}
                                    onSelect={(v) => { setAspectRatio(v); close(); }}
                                    render={(r) => <><RatioGlyph ratio={r} className="text-fg-faint" />{r}</>}
                                />
                            </>
                        )}
                    </Dropdown>
                    <Dropdown
                        width={180}
                        trigger={({ open, toggle }) => (
                            <Chip active={open} onClick={toggle} icon={<Wand2 className="size-4" />} label={resolution} />
                        )}
                    >
                        {({ close }) => (
                            <>
                                <DropdownLabel>Resolution</DropdownLabel>
                                <OptionList options={RESOLUTIONS} value={resolution} onSelect={(v) => { setResolution(v); close(); }} />
                            </>
                        )}
                    </Dropdown>
                </>
            }
            action={<GenerateButton onClick={generate} busy={pending.length > 0} label="Shoot" busyLabel="Rolling…" />}
        />
    );

    const hero = (
        <StudioHero
            eyebrow="Cinema Studio · Nano Banana Pro"
            title="What would you shoot with"
            words={['infinite budget?', 'a 70mm rig?', 'anamorphic glass?', 'golden hour?']}
            accent="bg-pink"
            subtitle="Describe a scene, then dress it in real camera gear — body, glass, focal length and aperture."
        >
            <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setRigOpen(true)}
                className="glass flex items-center gap-4 rounded-3xl p-2 pr-5 text-left shadow-float"
            >
                <span className="flex -space-x-3">
                    {[rig.camera, rig.lens, rig.aperture].map((g) => (
                        <img key={g} src={assetFor(g)} alt="" className="size-12 rounded-2xl border-2 border-surface object-cover" />
                    ))}
                </span>
                <span>
                    <span className="block text-sm font-semibold text-fg">{rig.camera}</span>
                    <span className="block text-xs text-fg-muted">{rigSummary}</span>
                </span>
                <span className="eyebrow ml-2 text-pink">Change rig</span>
            </motion.button>
        </StudioHero>
    );

    const feed = (
        <>
            <FeedHeader title="Your shots" count={items.length} />
            <MediaFeed items={items} pending={pending} kind="image" onOpen={setViewIndex} />
        </>
    );

    return (
        <>
            <StudioLayout hero={hero} empty={!items.length && !pending.length} feed={feed} dock={dock} />

            <RigPanel open={rigOpen} onClose={() => setRigOpen(false)} rig={rig} setRig={setRig} prompt={prompt} />

            <Lightbox
                items={items}
                index={viewIndex}
                onIndexChange={setViewIndex}
                onClose={() => setViewIndex(null)}
                kind="image"
                details={(item) => {
                    const s = item.settings || {};
                    return [
                        { label: 'Camera', value: s.camera },
                        { label: 'Lens', value: s.lens },
                        { label: 'Focal', value: s.focal ? `${s.focal}mm` : null },
                        { label: 'Aperture', value: s.aperture },
                        { label: 'Ratio', value: s.aspect_ratio || item.aspect_ratio },
                        { label: 'Resolution', value: s.resolution },
                    ];
                }}
                actions={(item, close) => (
                    <>
                        <Button variant="secondary" className="w-full justify-center" onClick={() => { reuse(item); close(); }}>
                            <RotateCcw className="size-4" /> Reuse prompt &amp; rig
                        </Button>
                        <Button
                            variant="secondary"
                            className="w-full justify-center"
                            onClick={() => {
                                const s = item.settings || {};
                                close();
                                shoot({
                                    prompt: s.prompt ?? item.prompt ?? '',
                                    aspect_ratio: s.aspect_ratio || item.aspect_ratio || '16:9',
                                    resolution: s.resolution || '2K',
                                    camera: s.camera || rig.camera,
                                    lens: s.lens || rig.lens,
                                    focal: Number(s.focal) || rig.focal,
                                    aperture: s.aperture || rig.aperture,
                                });
                            }}
                        >
                            <Clapperboard className="size-4" /> Shoot again
                        </Button>
                        <Button
                            variant="danger"
                            className="w-full justify-center"
                            onClick={() => { removeItem(item.id); close(); }}
                        >
                            <Trash2 className="size-4" /> Delete from history
                        </Button>
                    </>
                )}
            />
        </>
    );
}
