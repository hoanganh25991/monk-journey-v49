/**
 * PWA: service worker is currently disabled.
 * On load we unregister any existing SW and clear caches so the app always runs with latest code.
 * To re-enable PWA: remove the unregister call and the early return, then use the register path below.
 */
(function () {
    window.addEventListener('load', async () => {
        if (!('serviceWorker' in navigator)) return;
        if (window.location.protocol === 'file:' || window.location.hostname === 'localhost') return;

        // Unregister so we don't serve stale cached content
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
        }
    });
})();
