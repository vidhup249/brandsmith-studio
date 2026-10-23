// Small helpers shared by the studios and the library.

export function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(then).toLocaleDateString('en-CA');
}

export function isVideoUrl(url = '') {
    return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

// Downloads through a blob so the browser saves instead of navigating;
// falls back to opening the file when the host blocks cross-origin reads.
export async function downloadMedia(url, filename) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch {
        window.open(url, '_blank', 'noopener');
    }
}

export function readJSON(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || 'null');
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

// Pulls the first result URL out of any of the response shapes kie.ai and the backend return.
export function resultUrl(result) {
    if (!result) return null;
    if (result.url) return result.url;
    if (Array.isArray(result.resultUrls) && result.resultUrls.length) return result.resultUrls[0];
    if (result.response?.resultUrls?.length) return result.response.resultUrls[0];
    if (Array.isArray(result.outputs) && result.outputs.length) return result.outputs[0];
    if (result.output?.url) return result.output.url;
    if (typeof result.resultJson === 'string') {
        try {
            const parsed = JSON.parse(result.resultJson);
            if (parsed.resultUrls?.length) return parsed.resultUrls[0];
        } catch { /* not JSON */ }
    }
    return null;
}
