import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: './',
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    server: {
        proxy: {
            '/api': {
                target: 'https://api.kie.ai',
                changeOrigin: true,
                secure: false
            },
            '/kie-upload': {
                target: 'https://kieai.redpandaai.co',
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/kie-upload/, '')
            },
            '/.netlify/functions': {
                target: 'https://higgsfield-matu.netlify.app',
                changeOrigin: true,
                secure: true
            },
            '/download-media': {
                target: 'https://higgsfield-matu.netlify.app',
                changeOrigin: true,
                secure: true
            }
        }
    }
});
