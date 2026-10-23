import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Dices, ImagePlus, Loader2, RotateCcw, SlidersHorizontal, Trash2, Wand2, X, Gem } from 'lucide-react';
import { kie } from '~/lib/kie.js';
import { buildPrompt } from '~/lib/api.js';
import { ENHANCE_TAGS, QUICK_PROMPTS } from '~/lib/promptUtils.js';
import {
    t2iModels, i2iModels, editModelFor, isEditModelId, findImageModel,
    aspectRatiosFor, resolutionsFor, qualityFieldFor, maxImagesFor,
} from '~/lib/imageModels.js';
import { useAuth } from '~/app/auth.jsx';
import { useGenerations } from '~/hooks/useGenerations.js';
import { useUploader } from '~/hooks/useUploader.js';
import { StudioLayout, StudioHero, FeedHeader } from '~/components/kit/StudioLayout.jsx';
import { PromptDock } from '~/components/kit/PromptDock.jsx';
import { GenerateButton } from '~/components/kit/GenerateButton.jsx';
import { ModelPicker } from '~/components/kit/ModelPicker.jsx';
import { ReferencePicker } from '~/components/kit/ReferencePicker.jsx';
import { Chip, OptionList, RatioGlyph } from '~/components/kit/Chip.jsx';
import { Dropdown, DropdownLabel } from '~/components/kit/Dropdown.jsx';
import { Segmented } from '~/components/kit/Segmented.jsx';
import { Button } from '~/components/kit/Button.jsx';
import { MediaFeed } from '~/components/kit/MediaFeed.jsx';
import { Lightbox } from '~/components/kit/Lightbox.jsx';
import { cn } from '~/lib/utils';

const STYLE_PRESETS = ['None', 'Photorealistic', 'Anime', 'Cinematic', 'Oil Painting', 'Watercolor', 'Digital Art', 'Concept Art', 'Cyberpunk'];
const TAG_GROUPS = { quality: 'Quality', lighting: 'Lighting', mood: 'Mood', style: 'Style' };

// Adds or removes a comma-separated tag at the end of the prompt.
function toggleTag(prompt, tag) {
    const parts = prompt.split(',').map(p => p.trim()).filter(Boolean);
    const i = parts.findIndex(p => p.toLowerCase() === tag.toLowerCase());
    if (i === -1) parts.push(tag);
    else parts.splice(i, 1);
    return parts.join(', ');
}

export default function ImageStudio() {
    const { requireAuth, refreshCredits, backend } = useAuth();
    const uploader = useUploader();
    const { items, pending, run, removeItem } = useGenerations({ studio: 'image', storageKey: 'kie_history', limit: 50 });

    const [prompt, setPrompt] = useState('');
    const [refs, setRefs] = useState([]);
    const [modelId, setModelId] = useState(t2iModels[0].id);
    const [lastGenerator, setLastGenerator] = useState(null);
    const [ar, setAr] = useState(() => aspectRatiosFor(t2iModels[0].id, false)[0]);
    const [quality, setQuality] = useState(() => resolutionsFor(t2iModels[0].id, false)[0] || null);
    const [style, setStyle] = useState('None');
    const [seed, setSeed] = useState('');
    const [batch, setBatch] = useState(1);
    const [enhancing, setEnhancing] = useState(false);
    const [viewer, setViewer] = useState(null);
    const textareaRef = useRef(null);

    const imageMode = refs.length > 0;
    const edit = imageMode && isEditModelId(modelId);
    const ratios = aspectRatiosFor(modelId, edit);
    const resolutions = resolutionsFor(modelId, edit);
    const maxRefs = maxImagesFor(modelId, edit);
    const model = findImageModel(modelId);

    // Picks a model and snaps ratio/quality to what it supports.
    const applyModel = useCallback((id, editMode) => {
        setModelId(id);
        const nextRatios = aspectRatiosFor(id, editMode);
        setAr(prev => (nextRatios.includes(prev) ? prev : nextRatios[0]));
        const nextRes = resolutionsFor(id, editMode);
        setQuality(prev => (nextRes.includes(prev) ? prev : nextRes[0] || null));
        setRefs(prev => prev.slice(0, Math.max(1, maxImagesFor(id, editMode))));
    }, []);

    // Attaching a reference switches to the current generator's edit model;
    // clearing them restores the generator that was picked before.
    const changeRefs = useCallback((next) => {
        if (next.length && !refs.length) {
            const editModel = isEditModelId(modelId) ? findImageModel(modelId) : editModelFor(modelId);
            setLastGenerator(modelId);
            setRefs(next.slice(0, maxImagesFor(editModel.id, true)));
            applyModel(editModel.id, true);
            return;
        }
        if (!next.length && refs.length) {
            setRefs([]);
            const back = lastGenerator && t2iModels.some(m => m.id === lastGenerator) ? lastGenerator : t2iModels[0].id;
            setLastGenerator(null);
            applyModel(back, false);
            return;
        }
        setRefs(next.slice(0, maxRefs));
    }, [refs.length, modelId, lastGenerator, maxRefs, applyModel]);

    const onDropFiles = (files) => requireAuth(async () => {
        const images = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!images.length) { toast.error('Drop an image file to use it as a reference.'); return; }
        const room = imageMode ? Math.max(0, maxRefs - refs.length) : maxImagesFor(editModelFor(modelId).id, true);
        if (room <= 0) { toast.error(`This model takes up to ${maxRefs} reference image${maxRefs > 1 ? 's' : ''}.`); return; }
        const uploaded = await uploader.upload(images.slice(0, room));
        if (uploaded.length) changeRefs([...refs, ...uploaded.map(u => ({ url: u.url, thumbnail: u.thumbnail }))]);
    });

    const modelGroups = useMemo(() => (imageMode
        ? [
            { label: 'Edit models', models: i2iModels },
            { label: 'Generators · image as reference', models: t2iModels.filter(m => !isEditModelId(m.id)) },
        ]
        : [{ models: t2iModels }]), [imageMode]);

    const generate = () => {
        const text = prompt.trim();
        if (!imageMode && !text) {
            toast('Describe what you want to see first ✍️');
            textareaRef.current?.focus();
            return;
        }
        requireAuth(() => {
            const finalPrompt = [text, style !== 'None' ? `${style.toLowerCase()} style` : null].filter(Boolean).join(', ');
            const qualityField = qualityFieldFor(modelId, edit);
            const meta = { prompt: text, model: modelId, aspect_ratio: ar, style: style !== 'None' ? style : undefined };
            const seedNum = seed === '' ? null : Number(seed);

            for (let i = 0; i < batch; i++) {
                const params = { model: modelId, aspect_ratio: ar };
                if (finalPrompt) params.prompt = finalPrompt;
                if (qualityField && quality) params[qualityField] = quality;
                if (Number.isFinite(seedNum) && seedNum >= 0) params.seed = seedNum + i;
                if (imageMode) {
                    params.images_list = refs.map(r => r.url);
                    params.image_url = refs[0].url; // single-image models
                }
                run(meta, ({ onRequestId }) => (imageMode
                    ? kie.generateI2I({ ...params, onRequestId })
                    : kie.generateImage({ ...params, onRequestId })))
                    .then(() => refreshCredits())
                    .catch((e) => {
                        console.error('[ImageStudio]', e);
                        toast.error(e.message || 'Generation failed');
                    });
            }
        });
    };

    const magicPrompt = async () => {
        if (!prompt.trim()) { toast('Type a quick idea first, then let the wand expand it.'); return; }
        setEnhancing(true);
        try {
            const better = await buildPrompt(prompt.trim(), 'image');
            if (better) setPrompt(better);
        } catch (e) {
            toast.error(e.message || 'Prompt builder failed');
        } finally {
            setEnhancing(false);
        }
    };

    const reuse = (item) => {
        setPrompt(item.prompt || '');
        if (item.style) setStyle(item.style);
        const known = findImageModel(item.model);
        if (known) {
            const itemIsEdit = isEditModelId(item.model) && !t2iModels.some(m => m.id === item.model);
            if (!itemIsEdit || imageMode) applyModel(item.model, imageMode && isEditModelId(item.model));
        }
        if (item.aspect_ratio) setAr(item.aspect_ratio);
        textareaRef.current?.focus();
    };

    const useAsReference = (item) => {
        changeRefs(imageMode ? [...refs, { url: item.url, thumbnail: item.url }].slice(-maxRefs) : [{ url: item.url, thumbnail: item.url }]);
    };

    const empty = items.length === 0 && pending.length === 0;
    const extrasActive = style !== 'None' || seed !== '' || batch > 1;

    const dock = (
        <PromptDock
            value={prompt}
            onChange={setPrompt}
            onSubmit={generate}
            textareaRef={textareaRef}
            busy={pending.length > 0}
            onDropFiles={onDropFiles}
            placeholder={imageMode
                ? (refs.length > 1 ? `Describe how to blend these ${refs.length} images (optional)` : 'Describe how to change this image (optional)')
                : 'Describe the image you want to create…'}
            leading={<ReferencePicker uploader={uploader} value={refs} onChange={changeRefs} max={imageMode ? maxRefs : maxImagesFor(editModelFor(modelId).id, true)} />}
            controls={
                <>
                    <ModelPicker groups={modelGroups} value={modelId} onChange={(id) => applyModel(id, imageMode && isEditModelId(id))} />

                    <Dropdown width={210} trigger={({ open, toggle }) => (
                        <Chip active={open} onClick={toggle} icon={<RatioGlyph ratio={ar} />} label={ar} />
                    )}>
                        {({ close }) => (
                            <>
                                <DropdownLabel>Aspect ratio</DropdownLabel>
                                <OptionList options={ratios} value={ar} onSelect={(v) => { setAr(v); close(); }}
                                    render={(r) => <><RatioGlyph ratio={r} className="text-fg-faint" /><span>{r}</span></>} />
                            </>
                        )}
                    </Dropdown>

                    {resolutions.length > 0 && (
                        <Dropdown width={190} trigger={({ open, toggle }) => (
                            <Chip active={open} onClick={toggle} icon={<Gem className="size-3.5" />} label={quality} />
                        )}>
                            {({ close }) => (
                                <>
                                    <DropdownLabel>Quality</DropdownLabel>
                                    <OptionList options={resolutions} value={quality} onSelect={(v) => { setQuality(v); close(); }} />
                                </>
                            )}
                        </Dropdown>
                    )}

                    <Dropdown width={380} trigger={({ open, toggle }) => (
                        <Chip active={open} onClick={toggle} icon={<Wand2 className="size-3.5" />} label="Enhance" caret={false} />
                    )}>
                        {() => (
                            <div className="flex flex-col gap-3 overflow-y-auto p-2">
                                {backend && (
                                    <button type="button" onClick={magicPrompt} disabled={enhancing}
                                        className="flex items-center gap-3 rounded-2xl border border-violet/30 bg-violet/10 p-3 text-left transition-colors hover:bg-violet/15 disabled:opacity-60">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet text-ink">
                                            {enhancing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold text-fg">Magic prompt</span>
                                            <span className="block text-xs text-fg-muted">Turn a rough idea into a detailed prompt</span>
                                        </span>
                                    </button>
                                )}
                                {Object.entries(ENHANCE_TAGS).map(([group, tags]) => (
                                    <div key={group}>
                                        <p className="eyebrow mb-2 px-1">{TAG_GROUPS[group] || group}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {tags.map(tag => {
                                                const on = prompt.toLowerCase().split(',').map(s => s.trim()).includes(tag.toLowerCase());
                                                return (
                                                    <button key={tag} type="button" onClick={() => setPrompt(p => toggleTag(p, tag))}
                                                        className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors',
                                                            on ? 'border-lime/60 bg-lime text-ink' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg')}>
                                                        {tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Dropdown>

                    <Dropdown width={340} trigger={({ open, toggle }) => (
                        <Chip active={open || extrasActive} onClick={toggle} icon={<SlidersHorizontal className="size-3.5" />}
                            label={extrasActive ? 'Tuned' : 'More'} caret={false} />
                    )}>
                        {() => (
                            <div className="flex flex-col gap-4 overflow-y-auto p-2">
                                <div>
                                    <p className="eyebrow mb-2 px-1">Style</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {STYLE_PRESETS.map(s => (
                                            <button key={s} type="button" onClick={() => setStyle(s)}
                                                className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors',
                                                    style === s ? 'border-coral/60 bg-coral text-ink' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg')}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="eyebrow mb-2 px-1">Images per run</p>
                                    <Segmented size="sm" value={batch} onChange={setBatch} options={[1, 2, 3, 4].map(n => ({ value: n, label: `${n}` }))} />
                                </div>
                                <div>
                                    <p className="eyebrow mb-2 px-1">Seed</p>
                                    <div className="flex gap-2">
                                        <input type="number" min="0" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Random"
                                            className="h-9 min-w-0 flex-1 rounded-full border border-line bg-ink/50 px-4 text-sm text-fg placeholder:text-fg-faint focus:border-violet/60 focus:outline-none" />
                                        <Button size="icon" variant="secondary" title="Random seed" onClick={() => setSeed(String(Math.floor(Math.random() * 999999999)))}>
                                            <Dices className="size-4" />
                                        </Button>
                                        {seed !== '' && <Button size="icon" variant="ghost" title="Clear seed" onClick={() => setSeed('')}><X className="size-4" /></Button>}
                                    </div>
                                    <p className="mt-1.5 px-1 text-xs text-fg-faint">Same seed + prompt = similar result. Used with your own kie.ai key.</p>
                                </div>
                            </div>
                        )}
                    </Dropdown>
                </>
            }
            action={<GenerateButton onClick={generate} count={batch} />}
        >
            {imageMode && (
                <div className="mb-2 flex items-center gap-2 px-1">
                    <div className="flex -space-x-2">
                        {refs.map((r, i) => (
                            <motion.span key={r.url} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                className="group/ref relative block size-8 overflow-hidden rounded-xl border-2 border-surface" style={{ zIndex: refs.length - i }}>
                                <img src={r.thumbnail} alt="" className="size-full object-cover" />
                                <button type="button" title="Remove" onClick={() => changeRefs(refs.filter(x => x.url !== r.url))}
                                    className="absolute inset-0 hidden items-center justify-center bg-ink/70 text-fg group-hover/ref:flex">
                                    <X className="size-3.5" />
                                </button>
                            </motion.span>
                        ))}
                    </div>
                    <span className="text-xs text-fg-muted">
                        Editing with {refs.length} reference{refs.length > 1 ? 's' : ''}
                        {maxRefs > refs.length && <span className="text-fg-faint"> · room for {maxRefs - refs.length} more</span>}
                    </span>
                </div>
            )}
        </PromptDock>
    );

    return (
        <>
            <StudioLayout
                empty={empty}
                dock={dock}
                hero={
                    <StudioHero
                        eyebrow="Image studio"
                        title="Make it"
                        words={['pop', 'glow', 'dreamy', 'weird', 'real']}
                        accent="bg-coral"
                        subtitle="Type an idea, drop in a reference, or start from one of these."
                    >
                        <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                            {QUICK_PROMPTS.map((q, i) => (
                                <motion.button
                                    key={q.label}
                                    type="button"
                                    whileHover={{ y: -2, rotate: i % 2 ? 1.5 : -1.5 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { setPrompt(q.prompt); textareaRef.current?.focus(); }}
                                    className="rounded-full border border-line bg-white/[0.03] px-4 py-2 text-sm text-fg-muted backdrop-blur transition-colors hover:border-coral/50 hover:text-fg"
                                >
                                    {q.label}
                                </motion.button>
                            ))}
                        </div>
                        <p className="mt-8 flex items-center gap-2 text-xs text-fg-faint">
                            <ImagePlus className="size-3.5" /> Tip: drop an image onto the prompt to edit it
                        </p>
                    </StudioHero>
                }
                feed={
                    <>
                        <FeedHeader title="Your images" count={items.length} />
                        <MediaFeed items={items} pending={pending} onOpen={setViewer} />
                    </>
                }
            />
            <Lightbox
                items={items}
                index={viewer}
                onIndexChange={setViewer}
                onClose={() => setViewer(null)}
                details={(item) => [
                    { label: 'Model', value: findImageModel(item.model)?.name || item.model },
                    { label: 'Ratio', value: item.aspect_ratio },
                    { label: 'Style', value: item.style },
                ]}
                actions={(item, close) => (
                    <>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="secondary" className="justify-center" onClick={() => { reuse(item); close(); }}>
                                <RotateCcw className="size-4" /> Reuse
                            </Button>
                            <Button variant="secondary" className="justify-center" onClick={() => { useAsReference(item); close(); }}>
                                <ImagePlus className="size-4" /> Edit this
                            </Button>
                        </div>
                        <Button variant="ghost" className="justify-center text-danger hover:bg-danger/10 hover:text-danger" onClick={() => {
                            removeItem(item.id);
                            setViewer(v => (items.length <= 1 ? null : Math.min(v, items.length - 2)));
                        }}>
                            <Trash2 className="size-4" /> Remove from history
                        </Button>
                    </>
                )}
            />
        </>
    );
}
