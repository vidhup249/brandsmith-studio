import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '~/lib/utils';

const GAP = 10;
const MARGIN = 12;

/**
 * Anchored popover rendered in a portal so it is never clipped by scroll containers.
 * Opens above the trigger by default (the prompt docks sit at the bottom of the
 * screen) and flips below when there isn't room.
 *
 *   <Dropdown trigger={({ open, toggle }) => <Chip onClick={toggle} />}>
 *     {({ close }) => ...}
 *   </Dropdown>
 */
export function Dropdown({ trigger, children, width = 280, placement = 'top', align = 'start', className, open: openProp, onOpenChange }) {
    const [openState, setOpenState] = useState(false);
    const open = openProp ?? openState;
    const setOpen = useCallback((v) => {
        if (onOpenChange) onOpenChange(v);
        if (openProp === undefined) setOpenState(v);
    }, [onOpenChange, openProp]);

    const anchorRef = useRef(null);
    const panelRef = useRef(null);
    const [pos, setPos] = useState(null);

    const place = useCallback(() => {
        const anchor = anchorRef.current;
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.min(width, vw - MARGIN * 2);
        let left = align === 'end' ? rect.right - w : rect.left;
        left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));

        const spaceAbove = rect.top - GAP - MARGIN;
        const spaceBelow = vh - rect.bottom - GAP - MARGIN;
        const above = placement === 'top' ? spaceAbove >= 240 || spaceAbove > spaceBelow : spaceBelow < 240 && spaceAbove > spaceBelow;
        setPos(above
            ? { left, width: w, bottom: vh - rect.top + GAP, maxHeight: spaceAbove, origin: 'bottom' }
            : { left, width: w, top: rect.bottom + GAP, maxHeight: spaceBelow, origin: 'top' });
    }, [width, placement, align]);

    useLayoutEffect(() => { if (open) place(); }, [open, place]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (panelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('pointerdown', onDown);
        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open, place, setOpen]);

    const close = useCallback(() => setOpen(false), [setOpen]);
    const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

    return (
        <>
            <span ref={anchorRef} className="inline-flex">{trigger({ open, toggle, close })}</span>
            {createPortal(
                <AnimatePresence>
                    {open && pos && (
                        <motion.div
                            ref={panelRef}
                            initial={{ opacity: 0, scale: 0.96, y: pos.origin === 'bottom' ? 6 : -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: pos.origin === 'bottom' ? 4 : -4 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.6 }}
                            style={{
                                position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom,
                                maxHeight: pos.maxHeight, transformOrigin: `${pos.origin} ${align === 'end' ? 'right' : 'left'}`,
                            }}
                            className={cn('glass z-[300] flex flex-col overflow-hidden rounded-3xl p-2 shadow-float', className)}
                        >
                            {children({ close })}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}

export function DropdownLabel({ children, className }) {
    return <div className={cn('eyebrow px-3 pt-2 pb-1.5', className)}>{children}</div>;
}
