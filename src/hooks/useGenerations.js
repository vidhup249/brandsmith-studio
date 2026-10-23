import { useCallback, useEffect, useState } from 'react';
import { kie } from '~/lib/kie.js';
import { savePendingJob, removePendingJob, getPendingJobs } from '~/lib/pendingJobs.js';
import { readJSON, resultUrl } from '~/lib/media.js';

// Jobs already being resumed in this tab (guards against effects running twice).
const resuming = new Set();

/**
 * Generation history for one studio: persisted results, in-flight jobs, and
 * resuming jobs that were still running when the page was closed.
 *
 * `run(meta, task)` calls `task({ onRequestId })`, which must resolve to an
 * object with a result URL. `meta` is stored alongside the result (prompt, model, ...).
 */
export function useGenerations({ studio, storageKey, limit = 50, maxAttempts = 60, interval = 2000 }) {
    const [items, setItems] = useState(() => readJSON(storageKey, []));
    const [pending, setPending] = useState([]);

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(items.slice(0, limit)));
        } catch { /* storage full or blocked */ }
    }, [items, storageKey, limit]);

    const addItem = useCallback((entry) => {
        setItems(prev => [entry, ...prev.filter(i => i.id !== entry.id)].slice(0, limit));
    }, [limit]);

    const removeItem = useCallback((id) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const run = useCallback(async (meta, task) => {
        const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setPending(prev => [{ id: localId, meta, startedAt: Date.now() }, ...prev]);
        let requestId = null;
        try {
            const res = await task({
                onRequestId: (rid) => {
                    requestId = rid;
                    savePendingJob({ requestId: rid, studioType: studio, historyMeta: meta, maxAttempts, interval, submittedAt: Date.now() });
                }
            });
            const url = resultUrl(res);
            if (!url) throw new Error('No result URL returned by the API');
            const entry = { id: res.id || requestId || localId, url, ...meta, timestamp: new Date().toISOString() };
            addItem(entry);
            return entry;
        } finally {
            if (requestId) removePendingJob(requestId);
            setPending(prev => prev.filter(p => p.id !== localId));
        }
    }, [studio, maxAttempts, interval, addItem]);

    useEffect(() => {
        const jobs = getPendingJobs(studio).filter(job => !resuming.has(job.requestId));
        if (!jobs.length) return;
        const apiKey = localStorage.getItem('kie_key');
        if (!apiKey && !localStorage.getItem('cf_backend')) return; // keep the jobs for when auth is back

        jobs.forEach(async (job) => {
            resuming.add(job.requestId);
            const pid = `resume-${job.requestId}`;
            setPending(prev => [{ id: pid, meta: job.historyMeta || {}, startedAt: job.submittedAt, resumed: true }, ...prev]);
            const elapsedAttempts = Math.floor((Date.now() - job.submittedAt) / job.interval);
            const attemptsLeft = Math.max(1, job.maxAttempts - elapsedAttempts);
            try {
                const result = await kie.pollForResult(job.requestId, apiKey, attemptsLeft, job.interval);
                const url = resultUrl(result) || kie._extractUrl(result);
                if (url) addItem({ id: job.requestId, url, ...job.historyMeta, timestamp: new Date().toISOString() });
            } catch (e) {
                console.warn(`[${studio}] Pending job failed on resume:`, job.requestId, e.message);
            } finally {
                removePendingJob(job.requestId);
                resuming.delete(job.requestId);
                setPending(prev => prev.filter(p => p.id !== pid));
            }
        });
    }, [studio, addItem]);

    return { items, pending, run, addItem, removeItem };
}
