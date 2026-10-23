import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import toast from 'react-hot-toast';
import { AlertTriangle, AudioLines, Clapperboard, ImageIcon, Loader2, Monitor, Music, Pause, Play, RotateCcw, Trash2, Video, X } from 'lucide-react';
import { kie } from '~/lib/kie.js';
import { lipsyncModels, imageLipSyncModels, videoLipSyncModels, getLipSyncModelById, getResolutionsForLipSyncModel } from '~/lib/models.js';
import { useAuth } from '~/app/auth.jsx';
import { useGenerations } from '~/hooks/useGenerations.js';
import { useUploader } from '~/hooks/useUploader.js';
import { StudioLayout, StudioHero, FeedHeader } from '~/components/kit/StudioLayout.jsx';
import { PromptDock } from '~/components/kit/PromptDock.jsx';
import { GenerateButton } from '~/components/kit/GenerateButton.jsx';
import { ModelPicker } from '~/components/kit/ModelPicker.jsx';
import { Chip, OptionList } from '~/components/kit/Chip.jsx';
import { Dropdown, DropdownLabel } from '~/components/kit/Dropdown.jsx';
import { Segmented } from '~/components/kit/Segmented.jsx';
import { Button } from '~/components/kit/Button.jsx';
import { ReferencePicker } from '~/components/kit/ReferencePicker.jsx';
import { MediaFeed } from '~/components/kit/MediaFeed.jsx';
import { Lightbox } from '~/components/kit/Lightbox.jsx';

const MODES = [
    { value: 'image', label: 'Portrait', icon: <ImageIcon className="size-3.5" /> },
    { value: 'video', label: 'Video', icon: <Video className="size-3.5" /> },
];

const modelsFor = (mode) => (mode === 'image' ? imageLipSyncModels : videoLipSyncModels);
const defaultResolution = (model) => {
    const options = getResolutionsForLipSyncModel(model.id);
    return options.length ? (model.inputs?.resolution?.default || options[0]) : null;
};

function formatDuration(sec) {
    if (!Number.isFinite(sec)) return '';
    const s = Math.round(sec);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Reads a local file's duration through a throwaway media element.
function readDuration(file) {
    return new Promise((resolve) => {
        const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
        const src = URL.createObjectURL(file);
        el.preload = 'metadata';
        el.onloadedmetadata = () => { resolve(el.duration); URL.revokeObjectURL(src); };
        el.onerror = () => { resolve(null); URL.revokeObjectURL(src); };
        el.src = src;
    });
}

/**
 * Upload slot for the audio track or the source video: an empty dashed tile that
 * opens the file picker, then a filled card with a preview, name, duration and remove.
 */
function MediaSlot({ kind, value, uploading, onPick, onClear }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const isAudio = kind === 'audio';
    const Icon = isAudio ? Music : Clapperboard;

    if (uploading) {
        return (
            <div className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line bg-white/[0.03] px-3">
                <Loader2 className="size-5 shrink-0 animate-spin text-lime" />
                <span className="truncate text-sm text-fg-muted">Uploading {isAudio ? 'audio' : 'video'}…</span>
            </div>
        );
    }

    if (!value) {
        return (
            <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onPick}
                className="group flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-white/[0.02] px-3 text-left transition-colors hover:border-lime/60 hover:bg-lime/[0.04]"
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-fg-faint transition-colors group-hover:bg-lime group-hover:text-ink">
                    <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{isAudio ? 'Add the voice' : 'Add a source video'}</span>
                    <span className="block truncate text-xs text-fg-faint">{isAudio ? 'mp3, wav, m4a…' : 'the face that should talk'}</span>
                </span>
            </motion.button>
        );
    }

    const toggle = () => {
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) el.play().catch(() => {});
        else el.pause();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-lime/40 bg-lime/[0.06] px-2 pr-1.5"
        >
            {isAudio ? (
                <>
                    <audio ref={audioRef} src={value.url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} preload="metadata" />
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={playing ? 'Pause' : 'Play'}
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime text-ink transition-transform hover:scale-105"
                    >
                        {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                    </button>
                </>
            ) : (
                <video src={value.url} muted playsInline preload="metadata" className="size-10 shrink-0 rounded-xl bg-ink object-cover" />
            )}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg">{value.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                    {isAudio && playing ? <AudioLines className="size-3 animate-pulse text-lime" /> : null}
                    {value.duration ? formatDuration(value.duration) : isAudio ? 'audio' : 'video'}
                </span>
            </span>
            <button
                type="button"
                onClick={onClear}
                aria-label="Remove"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-faint transition-colors hover:bg-white/5 hover:text-fg"
            >
                <X className="size-4" />
            </button>
        </motion.div>
    );
}

export default function LipSyncStudio() {
    const { backend, requireAuth, refreshCredits } = useAuth();
    const uploader = useUploader();
    const generations = useGenerations({ studio: 'lipsync', storageKey: 'lipsync_history', limit: 30, maxAttempts: 900, interval: 2000 });

    const [mode, setMode] = useState('image');
    const [modelId, setModelId] = useState(imageLipSyncModels[0].id);
    const [resolution, setResolution] = useState(() => defaultResolution(imageLipSyncModels[0]));
    const [prompt, setPrompt] = useState('');
    const [portrait, setPortrait] = useState([]); // [{ url, thumbnail }]
    const [video, setVideo] = useState(null); // { url, name, duration }
    const [audio, setAudio] = useState(null); // { url, name, duration }
    const [uploadingKind, setUploadingKind] = useState(null);
    const [busy, setBusy] = useState(0);
    const [viewer, setViewer] = useState(null);

    const audioInput = useRef(null);
    const videoInput = useRef(null);

    const model = getLipSyncModelById(modelId) || modelsFor(mode)[0];
    const resolutions = getResolutionsForLipSyncModel(modelId);
    // The content-factory backend only runs portrait image + audio (omnihuman); video mode needs a kie.ai key with no session.
    const backendBlocksVideo = backend && mode === 'video';

    const modelGroups = useMemo(() => [{
        label: mode === 'image' ? 'Portrait + audio → talking video' : 'Video + audio → lip-synced video',
        models: modelsFor(mode).map(m => ({ ...m, hint: m.description })),
    }], [mode]);

    const selectModel = (id) => {
        const m = getLipSyncModelById(id);
        setModelId(id);
        setResolution(defaultResolution(m));
    };

    const switchMode = (next) => {
        if (next === mode) return;
        setMode(next);
        if (next === 'image') setVideo(null);
        else setPortrait([]);
        selectModel(modelsFor(next)[0].id);
    };

    const uploadMedia = async (file, kind) => {
        if (!file) return;
        setUploadingKind(kind);
        try {
            const [uploaded, duration] = await Promise.all([
                uploader.upload([file], { remember: false }),
                readDuration(file),
            ]);
            if (!uploaded.length) return;
            const entry = { url: uploaded[0].url, name: file.name, duration };
            if (kind === 'audio') setAudio(entry);
            else setVideo(entry);
        } finally {
            setUploadingKind(null);
        }
    };

    // Drops on the dock: audio fills the voice slot, video/images fill the source for the matching mode.
    const onDropFiles = (files) => requireAuth(async () => {
        for (const file of Array.from(files)) {
            if (file.type.startsWith('audio/')) await uploadMedia(file, 'audio');
            else if (file.type.startsWith('video/')) {
                if (mode !== 'video') switchMode('video');
                await uploadMedia(file, 'video');
            } else if (file.type.startsWith('image/')) {
                if (mode !== 'image') switchMode('image');
                const up = await uploader.upload([file]);
                if (up.length) setPortrait([{ url: up[0].url, thumbnail: up[0].thumbnail }]);
            }
        }
    });

    const sourceReady = mode === 'image' ? portrait.length > 0 : !!video;
    const missing = !sourceReady ? (mode === 'image' ? 'Add a portrait image' : 'Add a source video') : !audio ? 'Add the audio' : null;

    const generate = () => {
        if (!audio) { toast.error('Upload an audio file first.'); return; }
        if (mode === 'image' && !portrait.length) { toast.error('Upload a portrait image first.'); return; }
        if (mode === 'video' && !video) { toast.error('Upload a source video first.'); return; }
        if (backendBlocksVideo) {
            toast.error('Video lip sync isn’t available on the content-factory backend. Use a portrait image instead.');
            return;
        }

        requireAuth(async () => {
            const text = prompt.trim();
            const params = { model: modelId, audio_url: audio.url };
            if (mode === 'image') params.image_url = portrait[0].url;
            else params.video_url = video.url;
            if (text && model?.hasPrompt) params.prompt = text;
            if (resolutions.length > 0) params.resolution = resolution;
            if (model?.hasSeed) params.seed = -1;

            const meta = { prompt: text, model: modelId, mode, resolution: resolutions.length ? resolution : undefined };
            setBusy(n => n + 1);
            try {
                await generations.run(meta, ({ onRequestId }) => kie.processLipSync({ ...params, onRequestId }));
                toast.success('Your clip is ready');
                refreshCredits();
            } catch (e) {
                console.error(e);
                toast.error(e.message || 'Lip sync failed');
            } finally {
                setBusy(n => n - 1);
            }
        });
    };

    const reuse = (item) => {
        const m = getLipSyncModelById(item.model);
        const itemMode = item.mode || m?.category || 'image';
        if (itemMode !== mode) switchMode(itemMode);
        if (m) {
            setModelId(m.id);
            const options = getResolutionsForLipSyncModel(m.id);
            setResolution(item.resolution && options.includes(item.resolution) ? item.resolution : defaultResolution(m));
        }
        setPrompt(item.prompt || '');
    };

    const empty = generations.items.length === 0 && generations.pending.length === 0;

    const hero = (
        <StudioHero
            eyebrow="Lip Sync Studio"
            title="Make them"
            words={['talk', 'sing', 'pitch', 'narrate', 'rap']}
            accent="bg-lime"
            subtitle="Drop a portrait or a video, add a voice track, and watch it speak. Works best with a clear, front-facing face."
        >
            <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                    { icon: ImageIcon, title: 'Pick a face', text: 'Portrait photo or a short video clip' },
                    { icon: Music, title: 'Add a voice', text: 'Speech, a song, a voice-over' },
                    { icon: Play, title: 'Hit generate', text: 'Lips move in sync with the audio' },
                ].map((step, i) => (
                    <div key={step.title} className="glass flex items-start gap-3 rounded-3xl p-4 text-left">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime font-display text-sm font-extrabold text-ink">{i + 1}</span>
                        <span>
                            <span className="block text-sm font-semibold text-fg">{step.title}</span>
                            <span className="block text-xs text-fg-muted">{step.text}</span>
                        </span>
                    </div>
                ))}
            </div>
        </StudioHero>
    );

    const feed = (
        <>
            <FeedHeader title="Your clips" count={generations.items.length} />
            <MediaFeed items={generations.items} pending={generations.pending} kind="video" onOpen={setViewer} />
        </>
    );

    const dock = (
        <PromptDock
            value={prompt}
            onChange={setPrompt}
            onSubmit={generate}
            onDropFiles={onDropFiles}
            busy={busy > 0}
            disabled={!model?.hasPrompt}
            placeholder={model?.hasPrompt ? 'Optional: describe the talking style, mood or motion…' : `${model?.name || 'This model'} doesn’t take a prompt — just the video and audio.`}
            leading={mode === 'image' ? (
                <ReferencePicker uploader={uploader} value={portrait} onChange={setPortrait} max={1} />
            ) : null}
            controls={
                <>
                    <Segmented options={MODES} value={mode} onChange={switchMode} size="sm" />
                    <ModelPicker groups={modelGroups} value={modelId} onChange={selectModel} width={360} />
                    {resolutions.length > 0 && (
                        <Dropdown
                            width={200}
                            trigger={({ open, toggle }) => (
                                <Chip active={open} onClick={toggle} icon={<Monitor className="size-3.5" />} label={resolution} />
                            )}
                        >
                            {({ close }) => (
                                <>
                                    <DropdownLabel>Resolution</DropdownLabel>
                                    <OptionList options={resolutions} value={resolution} onSelect={(r) => { setResolution(r); close(); }} />
                                </>
                            )}
                        </Dropdown>
                    )}
                </>
            }
            action={
                <GenerateButton
                    busy={busy > 0}
                    busyLabel="Syncing…"
                    disabled={!!missing || backendBlocksVideo}
                    onClick={generate}
                    label={missing || 'Generate'}
                />
            }
        >
            <input ref={audioInput} type="file" accept="audio/*" className="hidden"
                onChange={(e) => { uploadMedia(e.target.files?.[0], 'audio'); e.target.value = ''; }} />
            <input ref={videoInput} type="file" accept="video/*" className="hidden"
                onChange={(e) => { uploadMedia(e.target.files?.[0], 'video'); e.target.value = ''; }} />

            <AnimatePresence>
                {backendBlocksVideo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mx-1 mb-2 flex items-start gap-2.5 rounded-2xl border border-coral/30 bg-coral/10 px-3.5 py-2.5 text-xs text-fg">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" />
                            <span className="flex-1">
                                Your content-factory account only supports <b>portrait image + audio</b>. Video lip sync needs a kie.ai key with no account signed in.
                            </span>
                            <button type="button" onClick={() => switchMode('image')} className="shrink-0 font-semibold text-coral hover:underline">
                                Use a portrait
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mb-2 flex flex-col gap-2 px-1 sm:flex-row">
                {mode === 'video' && (
                    <MediaSlot
                        kind="video"
                        value={video}
                        uploading={uploadingKind === 'video'}
                        onPick={() => requireAuth(() => videoInput.current?.click())}
                        onClear={() => setVideo(null)}
                    />
                )}
                <MediaSlot
                    kind="audio"
                    value={audio}
                    uploading={uploadingKind === 'audio'}
                    onPick={() => requireAuth(() => audioInput.current?.click())}
                    onClear={() => setAudio(null)}
                />
            </div>
        </PromptDock>
    );

    return (
        <>
            <StudioLayout empty={empty} hero={hero} feed={feed} dock={dock} />
            <Lightbox
                items={generations.items}
                index={viewer}
                onIndexChange={setViewer}
                onClose={() => setViewer(null)}
                kind="video"
                details={(item) => [
                    { label: 'Model', value: lipsyncModels.find(m => m.id === item.model)?.name || item.model },
                    { label: 'Source', value: item.mode === 'video' ? 'Video' : item.mode === 'image' ? 'Portrait' : null },
                    { label: 'Resolution', value: item.resolution },
                ]}
                actions={(item, close) => (
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" className="justify-center" onClick={() => { reuse(item); close(); }}>
                            <RotateCcw className="size-4" /> Reuse
                        </Button>
                        <Button
                            variant="danger"
                            className="justify-center"
                            onClick={() => {
                                const idx = generations.items.findIndex(i => i.id === item.id);
                                generations.removeItem(item.id);
                                const remaining = generations.items.length - 1;
                                if (remaining <= 0) close();
                                else setViewer(Math.min(idx, remaining - 1));
                            }}
                        >
                            <Trash2 className="size-4" /> Delete
                        </Button>
                    </div>
                )}
            />
        </>
    );
}
