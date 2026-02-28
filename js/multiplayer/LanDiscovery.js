/**
 * LAN discovery: get local IP and discover hosts on same WiFi via a discovery server.
 * Same-machine discovery: host advertises via BroadcastChannel so another tab on the same device sees it without a server.
 */

import { getDiscoveryBaseUrl } from './discovery-config.js';

const DISCOVERY_TTL_MS = 120000; // 2 min — host re-registers periodically
const SAME_SUBNET_PREFIX_LEN = 24; // /24 for 192.168.x.x, 10.x.x.x

const LOCAL_DISCOVERY_CHANNEL = 'monk-journey-lan-discovery';
const LOCAL_BROADCAST_INTERVAL_MS = 1500;
const LOCAL_DISCOVERY_WAIT_MS = 2500;

/** @type {ReturnType<typeof setInterval> | null} */
let _localHostInterval = null;

/**
 * Get local IP via WebRTC (ICE candidate). Returns first private IPv4 or null.
 * @returns {Promise<string|null>}
 */
export function getLocalIP() {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection({ iceServers: [] });
        const done = (ip) => {
            pc.close();
            resolve(ip);
        };
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => done(null));
        pc.onicecandidate = (e) => {
            const c = e.candidate;
            if (!c || !c.candidate) return;
            const m = c.candidate.match(/candidate:\d+ \d+ udp \d+ (\d+\.\d+\.\d+\.\d+)/);
            if (m) {
                const ip = m[1];
                if (isPrivateIP(ip)) done(ip);
            }
        };
        setTimeout(() => done(null), 3000);
    });
}

function isPrivateIP(ip) {
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) return true;
    if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1], 10);
        if (second >= 16 && second <= 31) return true;
    }
    return false;
}

/**
 * Same subnet (e.g. /24): 192.168.1.x and 192.168.1.y are same network.
 */
function sameSubnet(ipA, ipB, prefixLen = SAME_SUBNET_PREFIX_LEN) {
    const toBits = (ip) => ip.split('.').map(n => parseInt(n, 10)).reduce((acc, n) => acc * 256 + n, 0);
    const mask = (prefixLen >= 32) ? -1 : (~0 << (32 - prefixLen)) >>> 0;
    return (toBits(ipA) & mask) === (toBits(ipB) & mask);
}

/**
 * Register host on discovery server. Call when hosting starts; optional heartbeat.
 * @param {string} roomId - Peer/room ID
 * @param {string} [localIP] - Optional; if not provided, will try to get via getLocalIP()
 * @returns {Promise<boolean>}
 */
export async function registerHost(roomId, localIP) {
    const base = getDiscoveryBaseUrl();
    if (!base) return false;
    const ip = localIP != null ? localIP : await getLocalIP();
    if (!ip) return false;
    try {
        const r = await fetch(`${base}/api/discovery/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, localIP: ip })
        });
        return r.ok;
    } catch (e) {
        console.debug('[LanDiscovery] register failed', e);
        return false;
    }
}

/**
 * Unregister host (optional, when host leaves).
 * @param {string} roomId
 * @returns {Promise<boolean>}
 */
export async function unregisterHost(roomId) {
    const base = getDiscoveryBaseUrl();
    if (!base) return false;
    try {
        const r = await fetch(`${base}/api/discovery/unregister`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId })
        });
        return r.ok;
    } catch (e) {
        return false;
    }
}

/**
 * Discover hosts on same network. Returns list of { roomId, localIP }.
 * @returns {Promise<Array<{ roomId: string, localIP?: string }>>}
 */
export async function discoverHosts() {
    const base = getDiscoveryBaseUrl();
    if (!base) return [];
    const myIP = await getLocalIP();
    if (!myIP) return [];
    try {
        const r = await fetch(`${base}/api/discovery/discover?localIP=${encodeURIComponent(myIP)}`);
        if (!r.ok) return [];
        const data = await r.json();
        const list = Array.isArray(data.rooms) ? data.rooms : (data.roomIds ? data.roomIds.map(id => ({ roomId: id })) : []);
        return list.filter(entry => entry.roomId && (entry.localIP == null || sameSubnet(myIP, entry.localIP)));
    } catch (e) {
        console.debug('[LanDiscovery] discover failed', e);
        return [];
    }
}

export function isDiscoveryAvailable() {
    return !!getDiscoveryBaseUrl();
}

// --- Same-machine discovery (BroadcastChannel, no server) ---

/**
 * Start advertising this tab as host on the same machine (other tabs can discover).
 * Call when hosting starts.
 * @param {string} roomId
 */
export function registerHostLocal(roomId) {
    try {
        const channel = new BroadcastChannel(LOCAL_DISCOVERY_CHANNEL);
        if (_localHostInterval) clearInterval(_localHostInterval);
        _localHostInterval = setInterval(() => {
            try {
                channel.postMessage({ type: 'host', roomId });
            } catch (_) {}
        }, LOCAL_BROADCAST_INTERVAL_MS);
        channel.postMessage({ type: 'host', roomId });
    } catch (e) {
        console.debug('[LanDiscovery] registerHostLocal failed', e);
    }
}

/**
 * Stop advertising as host. Call when host leaves.
 */
export function unregisterHostLocal() {
    if (_localHostInterval) {
        clearInterval(_localHostInterval);
        _localHostInterval = null;
    }
}

/**
 * Discover hosts on the same machine (other tabs). No server required.
 * @returns {Promise<Array<{ roomId: string }>>}
 */
export function discoverHostsLocal() {
    return new Promise((resolve) => {
        const seen = new Set();
        const list = [];
        try {
            const channel = new BroadcastChannel(LOCAL_DISCOVERY_CHANNEL);
            const onMessage = (e) => {
                const d = e?.data;
                if (d?.type === 'host' && d?.roomId && !seen.has(d.roomId)) {
                    seen.add(d.roomId);
                    list.push({ roomId: d.roomId });
                }
            };
            channel.addEventListener('message', onMessage);
            setTimeout(() => {
                channel.removeEventListener('message', onMessage);
                channel.close();
                resolve(list);
            }, LOCAL_DISCOVERY_WAIT_MS);
        } catch (e) {
            console.debug('[LanDiscovery] discoverHostsLocal failed', e);
            resolve([]);
        }
    });
}
