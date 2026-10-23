import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { kie } from '~/lib/kie.js';
import { getUploadHistory, saveUpload, removeUpload, generateThumbnail } from '~/lib/uploadHistory.js';

/**
 * Uploads reference files (kie.ai or the backend, whichever is active) and keeps
 * the per-browser upload history in sync. Returns entries shaped { url, thumbnail, name }.
 */
export function useUploader() {
    const [history, setHistory] = useState(() => getUploadHistory());
    const [uploading, setUploading] = useState(0);

    const upload = useCallback(async (files, { remember = true } = {}) => {
        const list = Array.from(files || []);
        if (!list.length) return [];
        setUploading(n => n + list.length);
        try {
            const results = await Promise.all(list.map(async (file) => {
                const isImage = file.type.startsWith('image/');
                const [url, thumbnail] = await Promise.all([
                    kie.uploadFile(file),
                    isImage ? generateThumbnail(file) : Promise.resolve(null),
                ]);
                const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, uploadedUrl: url, thumbnail: thumbnail || url, timestamp: new Date().toISOString() };
                if (remember && isImage) saveUpload(entry);
                return { url, thumbnail: entry.thumbnail, name: file.name, type: file.type };
            }));
            setHistory(getUploadHistory());
            return results;
        } catch (err) {
            console.error('[upload] failed:', err);
            toast.error(`Upload failed: ${err.message}`);
            return [];
        } finally {
            setUploading(n => Math.max(0, n - list.length));
        }
    }, []);

    const forget = useCallback((id) => {
        removeUpload(id);
        setHistory(getUploadHistory());
    }, []);

    return { history, uploading: uploading > 0, upload, forget };
}
