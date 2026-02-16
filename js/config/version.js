/**
 * Source code version for display in Game settings.
 * Format: YYYYMMDDTHHMMSS (e.g. 20250216T143052)
 *
 * Set SOURCE_VERSION at build/deploy time, or leave null to use runtime date.
 * Run `node scripts/update-version.js` before deploy to stamp the version.
 */

/** @type {string|null} Override with build-time value, or null for runtime */
export const SOURCE_VERSION = '20260216T181456';

/**
 * Get the current source code version in YYYYMMDDTHHMMSS format.
 * @returns {string} Version string (e.g. 20250216T143052)
 */
export function getSourceVersion() {
    if (SOURCE_VERSION) {
        return SOURCE_VERSION;
    }
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const h = pad(d.getHours());
    const min = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    return `${y}${m}${day}T${h}${min}${s}`;
}
