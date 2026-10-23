import { lazy } from 'react';
import { Aperture, Clapperboard, ImageIcon, LayoutGrid, MicVocal } from 'lucide-react';

// Tab order, labels and the accent each tab's active pill uses.
export const ROUTES = [
    { id: 'library', label: 'Library', icon: LayoutGrid, accent: 'bg-fg', page: lazy(() => import('~/pages/LibraryPage.jsx')) },
    { id: 'image', label: 'Image', icon: ImageIcon, accent: 'bg-coral', page: lazy(() => import('~/pages/ImageStudio.jsx')) },
    { id: 'video', label: 'Video', icon: Clapperboard, accent: 'bg-violet', page: lazy(() => import('~/pages/VideoStudio.jsx')) },
    { id: 'lipsync', label: 'Lip Sync', icon: MicVocal, accent: 'bg-lime', page: lazy(() => import('~/pages/LipSyncStudio.jsx')) },
    { id: 'cinema', label: 'Cinema', icon: Aperture, accent: 'bg-pink', page: lazy(() => import('~/pages/CinemaStudio.jsx')) },
];

export const DEFAULT_ROUTE = 'library';

export function routeFromHash() {
    const id = window.location.hash.replace(/^#\/?/, '');
    return ROUTES.some(r => r.id === id) ? id : DEFAULT_ROUTE;
}
