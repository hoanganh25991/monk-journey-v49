/**
 * Ultrasound helper: send/receive connection ID via inaudible sound (data-over-sound).
 * Uses ~19 kHz so most adults won't hear it. Requires mic permission to receive.
 */

const PREFIX = 'monkjourney:';
const CARRIER_HZ = 19000;
const SAMPLE_RATE = 48000;
const BIT_MS = 60;
const SYNC_MS = 250;
const SYNC_BITS = 0x55; // alternating for sync

/**
 * @returns {boolean} True if audio context and (for receive) mic are likely supported.
 */
export function isUltrasoundSupported() {
    if (typeof window === 'undefined' || !window.AudioContext && !window.webkitAudioContext) return false;
    return true;
}

/**
 * Encode and play connection ID as inaudible sound.
 * @param {string} connectionId
 * @returns {Promise<void>}
 */
export function playUltrasoundInvite(connectionId) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    const payload = PREFIX + connectionId;
    const bytes = new TextEncoder().encode(payload);
    const bits = [];
    for (let i = 0; i < bytes.length; i++) {
        let b = bytes[i];
        for (let j = 0; j < 8; j++) {
            bits.push(b & 1);
            b >>= 1;
        }
    }
    const syncBits = 16;
    for (let i = 0; i < syncBits; i++) bits.unshift((SYNC_BITS >> (i % 8)) & 1);
    const durationSec = (SYNC_MS / 1000) + (bits.length * BIT_MS / 1000);
    const numSamples = Math.ceil(durationSec * SAMPLE_RATE);
    const buf = ctx.createBuffer(1, numSamples, SAMPLE_RATE);
    const data = buf.getChannelData(0);
    const samplesPerBit = Math.round((BIT_MS / 1000) * SAMPLE_RATE);
    let t = 0;
    for (let i = 0; i < bits.length; i++) {
        const on = bits[i] === 1;
        const end = Math.min(t + samplesPerBit, numSamples);
        for (let s = t; s < end; s++) {
            const phase = (2 * Math.PI * CARRIER_HZ * s) / SAMPLE_RATE;
            data[s] = on ? 0.3 * Math.sin(phase) : 0;
        }
        t = end;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    return ctx.resume().then(() => {
        return new Promise(resolve => setTimeout(resolve, durationSec * 1000 + 100));
    });
}

/**
 * Listen for ultrasound invite and call onConnectionId when detected.
 * @param {(connectionId: string) => void} onConnectionId
 * @returns {Promise<{ stop: () => void }>}
 */
export function startUltrasoundListen(onConnectionId) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const src = ctx.createMediaStreamSource(stream);
        const bufferSize = 4096;
        const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);
        const samplesPerBit = Math.round((BIT_MS / 1000) * SAMPLE_RATE);
        let buffer = [];
        const maxBuf = samplesPerBit * 200;
        let lastDecode = 0;

        const detectCarrier = (samples) => {
            let energy = 0;
            for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
            const rms = Math.sqrt(energy / samples.length);
            return rms > 0.01;
        };

        const decodeBits = (samples) => {
            const bits = [];
            for (let off = 0; off + samplesPerBit <= samples.length; off += samplesPerBit) {
                let e = 0;
                for (let i = 0; i < samplesPerBit; i++) e += samples[off + i] * samples[off + i];
                bits.push(Math.sqrt(e / samplesPerBit) > 0.005 ? 1 : 0);
            }
            return bits;
        };

        const bitsToBytes = (bits) => {
            const bytes = [];
            for (let i = 0; i + 8 <= bits.length; i += 8) {
                let b = 0;
                for (let j = 0; j < 8; j++) b |= bits[i + j] << j;
                bytes.push(b);
            }
            return bytes;
        };

        const tryDecode = () => {
            if (buffer.length < samplesPerBit * 20) return;
            const bits = decodeBits(buffer);
            if (bits.length < 24) return;
            for (let start = 0; start + 24 <= bits.length; start++) {
                const chunk = bits.slice(start, start + 8 * 200);
                const bytes = bitsToBytes(chunk);
                const str = new TextDecoder().decode(new Uint8Array(bytes));
                const idx = str.indexOf(PREFIX);
                if (idx >= 0) {
                    const rest = str.slice(idx + PREFIX.length);
                    const end = rest.indexOf('\0');
                    const id = (end >= 0 ? rest.slice(0, end) : rest).replace(/[^\x20-\x7E]/g, '').trim();
                    if (id.length > 0 && id.length < 100) {
                        if (Date.now() - lastDecode > 2000) {
                            lastDecode = Date.now();
                            onConnectionId(id);
                        }
                        buffer = [];
                        return;
                    }
                }
            }
            buffer = buffer.slice(-maxBuf);
        };

        scriptNode.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            for (let i = 0; i < input.length; i++) buffer.push(input[i]);
            if (buffer.length > maxBuf) buffer = buffer.slice(-maxBuf);
            tryDecode();
        };
        const destination = ctx.createMediaStreamDestination();
        src.connect(scriptNode);
        scriptNode.connect(destination);
        return {
            stop() {
                try { scriptNode.disconnect(); } catch (_) {}
                try { src.disconnect(); } catch (_) {}
                stream.getTracks().forEach(t => t.stop());
                ctx.close().catch(() => {});
            }
        };
    });
}
