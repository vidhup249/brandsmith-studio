import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BorderBeam } from '~/components/ui/border-beam.jsx';
import { cn } from '~/lib/utils';

/**
 * Floating prompt composer shared by the studios.
 *   leading   – element left of the textarea (reference picker, ...)
 *   controls  – chips row (model, ratio, ...)
 *   action    – right side of the chips row (generate button)
 *   children  – extra content above the textarea (mode banners, attached files)
 * Enter submits, Shift+Enter adds a new line. Files dropped on the dock go to onDropFiles.
 */
export function PromptDock({
    value, onChange, onSubmit, placeholder, busy, leading, controls, action, children,
    onDropFiles, disabled, className, textareaRef: externalRef, maxLength,
}) {
    const innerRef = useRef(null);
    const ref = externalRef || innerRef;
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, window.innerWidth < 768 ? 140 : 220)}px`;
    }, [value, ref]);

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit?.();
        }
    };

    const dropProps = onDropFiles ? {
        onDragOver: (e) => { e.preventDefault(); setDragging(true); },
        onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); },
        onDrop: (e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files);
        },
    } : {};

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.05 }}
            className={cn('glass relative w-full rounded-[1.75rem] p-2.5 shadow-float md:rounded-[2rem] md:p-3', className)}
            {...dropProps}
        >
            {busy && <BorderBeam size={120} duration={5} colorFrom="#ff6a4d" colorTo="#9b7bff" borderWidth={1.5} />}
            {dragging && (
                <div className="pointer-events-none absolute inset-1.5 z-20 flex items-center justify-center rounded-[1.6rem] border-2 border-dashed border-violet bg-violet/10 text-sm font-medium text-violet">
                    Drop to use as reference
                </div>
            )}

            {children}

            <div className="flex items-start gap-3 px-1 pt-1">
                {leading}
                <textarea
                    ref={ref}
                    rows={1}
                    value={value}
                    maxLength={maxLength}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    className="min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-relaxed text-fg placeholder:text-fg-faint focus:outline-none md:text-[17px]"
                />
            </div>

            <div className="mt-2 flex flex-col gap-2.5 border-t border-line px-1 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1">{controls}</div>
                <div className="flex shrink-0 items-center justify-end gap-2">{action}</div>
            </div>
        </motion.div>
    );
}
