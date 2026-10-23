import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload, X, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Dropdown } from './Dropdown.jsx';
import { Button } from './Button.jsx';
import { useAuth } from '~/app/auth.jsx';
import { cn } from '~/lib/utils';

/**
 * Reference image picker: a thumbnail trigger plus a panel with this browser's
 * upload history. Single mode replaces the selection; multi mode toggles up to `max`.
 *
 * `uploader` comes from useUploader() so the dock's drag-and-drop shares it.
 * `value`: [{ url, thumbnail }]
 */
export function ReferencePicker({ uploader, value, onChange, max = 1, size = 'md' }) {
    const { requireAuth } = useAuth();
    const fileRef = useRef(null);
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);
    const multi = max > 1;
    const first = value[0];

    const pickFiles = () => requireAuth(() => fileRef.current?.click());

    const onFiles = async (files) => {
        const room = multi ? Math.max(1, max - value.length) : 1;
        const uploaded = await uploader.upload(Array.from(files).slice(0, room));
        if (!uploaded.length) return;
        const entries = uploaded.map(u => ({ url: u.url, thumbnail: u.thumbnail }));
        onChange(multi ? [...value, ...entries].slice(0, max) : entries.slice(0, 1));
        if (!multi) close();
    };

    const toggle = (entry) => {
        const idx = value.findIndex(v => v.url === entry.uploadedUrl);
        if (!multi) {
            onChange([{ url: entry.uploadedUrl, thumbnail: entry.thumbnail }]);
            close();
            return;
        }
        if (idx !== -1) onChange(value.filter((_, i) => i !== idx));
        else if (value.length < max) onChange([...value, { url: entry.uploadedUrl, thumbnail: entry.thumbnail }]);
    };

    const box = size === 'lg' ? 'size-14 rounded-2xl' : 'size-11 rounded-2xl';

    return (
        <>
        <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple={multi}
            className="hidden"
            onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }}
        />
        <Dropdown
            width={320}
            open={open}
            onOpenChange={setOpen}
            trigger={({ toggle: openPanel }) => (
                <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={openPanel}
                    title={multi ? `Reference images (up to ${max})` : 'Reference image'}
                    className={cn(
                        'relative flex shrink-0 items-center justify-center overflow-hidden border transition-colors',
                        box,
                        first ? 'border-violet/60' : 'border-dashed border-line-strong bg-white/[0.03] text-fg-faint hover:border-violet/60 hover:text-violet'
                    )}
                >
                    {uploader.uploading ? (
                        <Loader2 className="size-5 animate-spin text-violet" />
                    ) : first ? (
                        <>
                            <img src={first.thumbnail} alt="" className="size-full object-cover" />
                            {value.length > 1 && (
                                <span className="absolute right-1 bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet px-1 font-mono text-[10px] font-semibold text-ink">
                                    {value.length}
                                </span>
                            )}
                        </>
                    ) : (
                        <ImagePlus className="size-5" />
                    )}
                </motion.button>
            )}
        >
            {() => (
                <div className="flex flex-col gap-2 p-1">
                    <div className="flex items-center justify-between gap-2 px-1.5 pt-1">
                        <div>
                            <p className="text-sm font-semibold text-fg">Reference images</p>
                            <p className="text-xs text-fg-faint">{multi ? `Pick up to ${max}` : 'Pick one, or upload'}</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={pickFiles}>
                            <Upload className="size-3.5" /> Upload
                        </Button>
                    </div>

                    {uploader.history.length === 0 ? (
                        <button
                            type="button"
                            onClick={pickFiles}
                            className="m-1 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong py-8 text-fg-faint transition-colors hover:border-violet/60 hover:text-violet"
                        >
                            <ImagePlus className="size-6" />
                            <span className="text-xs">Drop an image on the prompt, or click to upload</span>
                        </button>
                    ) : (
                        <div className="grid max-h-60 grid-cols-4 gap-1.5 overflow-y-auto p-1">
                            {uploader.history.map((entry) => {
                                const selIdx = value.findIndex(v => v.url === entry.uploadedUrl);
                                const selected = selIdx !== -1;
                                const atMax = multi && !selected && value.length >= max;
                                return (
                                    <div
                                        key={entry.id}
                                        role="button"
                                        tabIndex={0}
                                        title={entry.name}
                                        onClick={() => !atMax && toggle(entry)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !atMax) toggle(entry); }}
                                        className={cn(
                                            'group/cell relative aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition-all',
                                            selected ? 'border-violet' : 'border-transparent hover:border-line-strong',
                                            atMax && 'cursor-not-allowed opacity-35'
                                        )}
                                    >
                                        <img src={entry.thumbnail} alt="" className="size-full object-cover" />
                                        {selected && (
                                            <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-violet font-mono text-[10px] font-semibold text-ink">
                                                {multi ? selIdx + 1 : <Check className="size-3" strokeWidth={3} />}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            title="Remove from history"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                uploader.forget(entry.id);
                                                if (selected) onChange(value.filter(v => v.url !== entry.uploadedUrl));
                                            }}
                                            className="absolute top-1 right-1 hidden size-5 items-center justify-center rounded-full bg-ink/80 text-fg-muted group-hover/cell:flex hover:text-danger"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {value.length > 0 && (
                        <div className="flex items-center justify-between border-t border-line px-1.5 pt-2">
                            <span className="text-xs text-fg-faint">{multi ? `${value.length} of ${max} selected` : '1 selected'}</span>
                            <div className="flex gap-1.5">
                                <Button size="xs" variant="ghost" onClick={() => { onChange([]); close(); }}>Clear</Button>
                                {multi && <Button size="xs" variant="lime" onClick={close}>Done</Button>}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Dropdown>
        </>
    );
}
