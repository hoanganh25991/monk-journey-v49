/**
 * PWA Service Worker registration.
 * - localhost / file: = development → skip cache (no SW registration, clear any existing SW/caches).
 * - Production = register SW for offline cache. Update via Menu > Settings > Update to Latest, or auto when version changes.
 */
(function () {
    function isDevelopment() {
        return window.location.protocol === 'file:' ||
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';
    }

    window.addEventListener('load', async () => {
        if (!('serviceWorker' in navigator)) return;

        if (isDevelopment()) {
            // Development: no cache – unregister SW and clear caches so we always get fresh files
            try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
                if ('caches' in window) {
                    const names = await caches.keys();
                    await Promise.all(names.map((n) => caches.delete(n)));
                }
            } catch (e) {
                console.warn('Dev: could not clear SW/caches', e);
            }
            return;
        }

        // Production: register service worker for offline cache
        try {
            const reg = await navigator.serviceWorker.register('service-worker.js', { scope: './' });
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content available; app can show "Update available" or rely on version check
                        window.dispatchEvent(new CustomEvent('serviceworker-update-available'));
                    }
                });
            });
        } catch (e) {
            console.warn('Service worker registration failed:', e);
        }
    });

    window.isPwaDevelopment = isDevelopment;
})();
