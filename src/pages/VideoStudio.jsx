import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, MonitorPlay, RotateCcw, Trash2 } from 'lucide-react';
import { kie } from '~/lib/kie.js';
import {
    t2vModels, getAspectRatiosForVideoModel, getDurationsForModel, getResolutionsForVideoModel,
    i2vModels, getAspectRatiosForI2VModel, getDurationsForI2VModel, getResolutionsForI2VModel,
} from '~/lib/models.js';
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
import { Button } from '~/components/kit/Button.jsx';
import { MediaFeed } from '~/components/kit/MediaFeed.jsx';
import { Lightbox } from '~/components/kit/Lightbox.jsx';

// Extend needs the previous job's request_id, which neither the kie client nor
// the backend forwards, so it can't work on its own and stays out of the menu.
const TEXT_MODELS = t2vModels.filter(m => !m.requiresRequestId);
const DEFAULT_MODEL = TEXT_MODELS[0];
const DEFAULT_FRAME_MODEL = 'seedance-v2.0-i2v';

const QUICK_STARTERS = [
    { label: 'Drone shot', prompt: 'Slow cinematic drone shot over misty mountains at sunrise, golden light, volumetric fog' },
    { label: 'Product spin', prompt: 'Sleek product slowly rotating on a glossy pedestal, soft studio lighting, clean background' },
    { label: 'City at night', prompt: 'Neon-lit city street in the rain at night, camera dolly forward, reflections on wet asphalt' },
    { label: 'Ocean waves', prompt: 'Turquoise ocean waves crashing on a sandy beach in slow motion, bright sunny day' },
];

const isFrameModel = (id) => i2vModels.some(m => m.id === id);
const allModels = [...TEXT_MODELS, ...i2vModels];
const modelName = (id) => allModels.find(m => m.id === id)?.name || id;

// Start-frame counterpart of a text model (seedance-v2.0-t2v → seedance-v2.0-i2v, *-text-to-video → *-image-to-video).
function frameModelFor(id) {
    const candidates = [
        id.replace(/-t2v(-fast)?$/, '-i2v$1'),
        id.replace('text-to-video', 'image-to-video'),
        DEFAULT_FRAME_MODEL,
    ];
    return candidates.map(c => i2vModels.find(m => m.id === c)).find(Boolean) || i2vModels[0];
}

function optionsFor(id) {
    const frame = isFrameModel(id);
    return {
        ratios: frame ? getAspectRatiosForI2VModel(id) : getAspectRatiosForVideoModel(id),
        durations: frame ? getDurationsForI2VModel(id) : getDurationsForModel(id),
        resolutions: frame ? getResolutionsForI2VModel(id) : getResolutionsForVideoModel(id),
    };
}

function pick(options, preferred) {
    if (preferred != null && options.includes(preferred)) return preferred;
    return options[0];
}

function settingsFor(id, overrides = {}) {
    const model = allModels.find(m => m.id === id);
    const opts = optionsFor(id);
    return {
        model: id,
        ar: pick(opts.ratios, overrides.ar ?? model?.inputs?.aspect_ratio?.default),
        duration: pick(opts.durations, overrides.duration ?? model?.inputs?.duration?.default),
        resolution: pick(opts.resolutions, overrides.resolution ?? model?.inputs?.resolution?.default),
    };
}

export default function VideoStudio() {
    const { requireAuth, refreshCredits } = useAuth();
    const uploader = useUploader();
    const { items, pending, run, removeItem } = useGenerations({ studio: 'video', storageKey: 'video_history', limit: 30, maxAttempts: 900, interval: 2000 });

    const [prompt, setPrompt] = useState('');
    const [frame, setFrame] = useState([]); // start frame: [{ url, thumbnail }]
    const [settings, setSettings] = useState(() => settingsFor(DEFAULT_MODEL.id));
    const [lastTextModel, setLastTextModel] = useState(null);
    const [viewing, setViewing] = useState(null);

    const { model, ar, duration, resolution } = settings;
    const opts = useMemo(() => optionsFor(model), [model]);
    const hasFrame = frame.length > 0;

    const applyModel = (id, overrides) => setSettings(settingsFor(id, overrides));

    // Attaching a start frame switches to the frame version of the model; clearing restores it.
    const onFrameChange = (next) => {
        if (next.length && !hasFrame) {
            if (!isFrameModel(model)) {
                setLastTextModel(model);
                applyModel(frameModelFor(model).id, { ar, duration, resolution });
            }
        } else if (!next.length && hasFrame) {
            applyModel(lastTextModel || DEFAULT_MODEL.id, { ar, duration, resolution });
            setLastTextModel(null);
        }
        setFrame(next);
    };

    const onDropFiles = (files) => requireAuth(async () => {
        const images = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!images.length) { toast.error('Drop an image to use as the start frame'); return; }
        const [uploaded] = await uploader.upload(images.slice(0, 1));
        if (uploaded) onFrameChange([{ url: uploaded.url, thumbnail: uploaded.thumbnail }]);
    });

    const modelGroups = useMemo(() => hasFrame
        ? [
            { label: 'Start-frame models', models: i2vModels },
            { label: 'Text models (frame as reference)', models: TEXT_MODELS },
        ]
        : [{ label: 'Video models', models: TEXT_MODELS }], [hasFrame]);

    const generate = () => {
        const text = prompt.trim();
        if (!hasFrame && !text) {
            toast.error('Describe the video you want to create');
            return;
        }
        requireAuth(async () => {
            const meta = { prompt: text, model, aspect_ratio: ar, duration };
            const params = { model, aspect_ratio: ar };
            if (text) params.prompt = text;
            if (hasFrame) params.image_url = frame[0].url;
            if (opts.durations.length > 0) params.duration = duration;
            if (opts.resolutions.length > 0) params.resolution = resolution;
            try {
                await run(meta, ({ onRequestId }) => hasFrame
                    ? kie.generateI2V({ ...params, onRequestId })
                    : kie.generateVideo({ ...params, onRequestId }));
                refreshCredits();
                toast.success('Your clip is ready');
            } catch (e) {
                console.error('[VideoStudio]', e);
                toast.error(e.message || 'Generation failed');
            }
        });
    };

    const reuse = (item) => {
        setPrompt(item.prompt || '');
        const id = allModels.some(m => m.id === item.model) ? item.model : DEFAULT_MODEL.id;
        if (isFrameModel(id) && !hasFrame) {
            // Frame models only show up once a start frame is attached; remember it for then.
            toast('Attach a start frame to animate with this model', { icon: '🖼️' });
            setLastTextModel(null);
            applyModel(DEFAULT_MODEL.id, { ar: item.aspect_ratio, duration: item.duration });
            return;
        }
        applyModel(id, { ar: item.aspect_ratio, duration: item.duration });
    };

    const controls = (
        <>
            <ModelPicker groups={modelGroups} value={model} onChange={(id) => applyModel(id, { ar, duration, resolution })} />
            {opts.ratios.length > 0 && (
                <Dropdown width={200} trigger={({ open, toggle }) => (
                    <Chip active={open} onClick={toggle} icon={<RatioGlyph ratio={ar} />} label={ar} />
                )}>
                    {({ close }) => (
                        <>
                            <DropdownLabel>Aspect ratio</DropdownLabel>
                            <OptionList
                                options={opts.ratios}
                                value={ar}
                                onSelect={(v) => { setSettings(s => ({ ...s, ar: v })); close(); }}
                                render={(r) => <><RatioGlyph ratio={r} className="text-fg-faint" />{r}</>}
                            />
                        </>
                    )}
                </Dropdown>
            )}
            {opts.durations.length > 0 && (
                <Dropdown width={180} trigger={({ open, toggle }) => (
                    <Chip active={open} onClick={toggle} icon={<Clock className="size-4" />} label={`${duration}s`} />
                )}>
                    {({ close }) => (
                        <>
                            <DropdownLabel>Duration</DropdownLabel>
                            <OptionList
                                options={opts.durations.map(d => ({ value: d, label: `${d} seconds` }))}
                                value={duration}
                                onSelect={(v) => { setSettings(s => ({ ...s, duration: v })); close(); }}
                            />
                        </>
                    )}
                </Dropdown>
            )}
            {opts.resolutions.length > 0 && (
                <Dropdown width={180} trigger={({ open, toggle }) => (
                    <Chip active={open} onClick={toggle} icon={<MonitorPlay className="size-4" />} label={resolution} />
                )}>
                    {({ close }) => (
                        <>
                            <DropdownLabel>Resolution</DropdownLabel>
                            <OptionList
                                options={opts.resolutions}
                                value={resolution}
                                onSelect={(v) => { setSettings(s => ({ ...s, resolution: v })); close(); }}
                            />
                        </>
                    )}
                </Dropdown>
            )}
        </>
    );

    const dock = (
        <PromptDock
            value={prompt}
            onChange={setPrompt}
            onSubmit={generate}
            busy={pending.length > 0}
            placeholder={hasFrame ? 'Describe the motion or effect (optional)' : 'Describe the video you want to create'}
            onDropFiles={onDropFiles}
            leading={<ReferencePicker uploader={uploader} value={frame} onChange={onFrameChange} max={1} />}
            controls={controls}
            action={<GenerateButton onClick={generate} label={hasFrame ? 'Animate' : 'Generate'} />}
        />
    );

    const hero = (
        <StudioHero
            eyebrow="Video studio"
            title="Make it"
            words={['move', 'dance', 'fly', 'glow']}
            accent="bg-violet"
            subtitle="Type a scene, or drop in a start frame and bring it to life."
        >
            <div className="flex flex-wrap justify-center gap-2">
                {QUICK_STARTERS.map(q => (
                    <Button key={q.label} size="sm" variant="secondary" onClick={() => setPrompt(q.prompt)}>{q.label}</Button>
                ))}
            </div>
        </StudioHero>
    );

    const feed = (
        <>
            <FeedHeader title="Your clips" count={items.length} />
            <MediaFeed items={items} pending={pending} kind="video" onOpen={setViewing} />
        </>
    );

    return (
        <>
            <StudioLayout empty={!items.length && !pending.length} hero={hero} feed={feed} dock={dock} />
            <Lightbox
                items={items}
                index={viewing}
                onIndexChange={setViewing}
                onClose={() => setViewing(null)}
                kind="video"
                details={(item) => [
                    { label: 'Model', value: modelName(item.model) },
                    { label: 'Ratio', value: item.aspect_ratio },
                    { label: 'Duration', value: item.duration ? `${item.duration}s` : null },
                ]}
                actions={(item, close) => (
                    <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1 justify-center" onClick={() => { reuse(item); close(); }}>
                            <RotateCcw className="size-4" /> Reuse
                        </Button>
                        <Button
                            variant="danger"
                            className="justify-center"
                            title="Remove from history"
                            onClick={() => {
                                removeItem(item.id);
                                if (items.length <= 1) close();
                                else if (viewing >= items.length - 1) setViewing(viewing - 1);
                            }}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                )}
            />
        </>
    );
}
