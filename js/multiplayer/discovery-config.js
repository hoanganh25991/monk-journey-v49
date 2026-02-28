/**
 * Discovery and ultrasound config.
 * Same-WiFi discovery: phones need a discovery server they can both reach (no local setup).
 *
 * Set DISCOVERY_SERVER_URL to the public URL of your deployed discovery server.
 * Deploy once: node scripts/discovery-server.js on Railway, Render, Fly.io, or your VPS,
 * then put that URL here. Both phones on "Smile" (or any WiFi) will use it to see each other.
 *
 * Leave null to disable LAN discovery (users can still join via code or ultrasound).
 */
export const DISCOVERY_SERVER_URL = null;

export function getDiscoveryBaseUrl() {
    const url = DISCOVERY_SERVER_URL;
    if (url) return String(url).replace(/\/$/, '');
    return null;
}
