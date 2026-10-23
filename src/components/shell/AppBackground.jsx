import { useEffect, useState } from 'react';
import Aurora from '~/components/reactbits/Aurora.jsx';
import Noise from '~/components/reactbits/Noise.jsx';

// React Bits Aurora shader across the top of the app, with film grain on top.
// The shader pauses while the tab is hidden.
export function AppBackground() {
    const [hidden, setHidden] = useState(document.visibilityState !== 'visible');
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    useEffect(() => {
        const onVis = () => setHidden(document.visibilityState !== 'visible');
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
            <div className="absolute inset-x-0 top-0 h-[70vh] opacity-55">
                <Aurora
                    colorStops={['#ff6a4d', '#9b7bff', '#d4f25a']}
                    amplitude={0.9}
                    blend={0.55}
                    speed={0.6}
                    height={0.5}
                    glow={0.5}
                    mouseInteraction={false}
                    paused={hidden || reduceMotion}
                />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_0%,var(--color-ink)_75%)]" />
            <Noise opacity={0.06} fps={12} blendMode="soft-light" contrast={0.5} />
        </div>
    );
}
