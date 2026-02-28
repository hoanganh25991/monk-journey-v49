/**
 * Discovery and ultrasound config.
 * Same-WiFi discovery: set DISCOVERY_SERVER_OVERRIDE to your discovery server URL.
 * - Local: run `node scripts/discovery-server.js` then set to 'http://localhost:3765'
 * - Production: deploy scripts/discovery-server.js (e.g. VPS, Railway, Render) and set this to that URL.
 */
export const DISCOVERY_SERVER_OVERRIDE = null;

export function getDiscoveryBaseUrl() {
    if (DISCOVERY_SERVER_OVERRIDE) return String(DISCOVERY_SERVER_OVERRIDE).replace(/\/$/, '');
    return null;
}
