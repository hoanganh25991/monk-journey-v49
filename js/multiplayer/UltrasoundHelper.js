/**
 * Ultrasound helper: send/receive connection ID via inaudible sound (data-over-sound).
 * Uses ~19 kHz so most adults won't hear it. Requires mic permission to receive.
 * Uses AudioWorklet (no deprecated ScriptProcessor). 2026-ready.
 */

const PREFIX = 'monkjourney:';
const CARRIER_HZ = 19000;
const SAMPLE_RATE = 48000;
const BIT_MS = 60;
const SYNC_BITS = 0x55;

const SAMPLES_PER_BIT = Math.round((BIT_MS / 1000) * SAMPLE_RATE);
const BIT_THRESHOLD = 0.002;
const MAX_BUF_SAMPLES = SAMPLES_PER_BIT * 200;
const PHASE_STEPS = 8;

/** Inline AudioWorklet processor: decodes OOK bits and posts connectionId when PREFIX is found. */
const WORKLET_CODE = `
const decodeBits = (samples, samplesPerBit, startOffset, bitThreshold) => {
  const bits = [];
  for (let off = startOffset; off + samplesPerBit <= samples.length; off += samplesPerBit) {
    let e = 0;
    for (let i = 0; i < samplesPerBit; i++) e += samples[off + i] * samples[off + i];
    bits.push(Math.sqrt(e / samplesPerBit) > bitThreshold ? 1 : 0);
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
class UltrasoundReceiveProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = options.processorOptions || {};
    this.samplesPerBit = o.samplesPerBit || 2880;
    this.bitThreshold = o.bitThreshold || 0.002;
    this.prefix = o.prefix || 'monkjourney:';
    this.maxBuf = o.maxBuf || 576000;
    this.phaseSteps = o.phaseSteps || 8;
    this.buffer = [];
    this.lastDecode = 0;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;
    for (let i = 0; i < input.length; i++) this.buffer.push(input[i]);
    if (this.buffer.length > this.maxBuf) this.buffer = this.buffer.slice(-this.maxBuf);
    if (this.buffer.length < this.samplesPerBit * 20) return true;
    const step = Math.max(1, Math.floor(this.samplesPerBit / this.phaseSteps));
    for (let phase = 0; phase < this.samplesPerBit && phase < step * this.phaseSteps; phase += step) {
      const bits = decodeBits(this.buffer, this.samplesPerBit, phase, this.bitThreshold);
      if (bits.length < 24) continue;
      for (let start = 0; start + 24 <= bits.length; start++) {
        const chunk = bits.slice(start, start + 8 * 200);
        const bytes = bitsToBytes(chunk);
        const str = new TextDecoder().decode(new Uint8Array(bytes));
        const idx = str.indexOf(this.prefix);
        if (idx >= 0) {
          const rest = str.slice(idx + this.prefix.length);
          const nul = String.fromCharCode(0);
          const end = rest.indexOf(nul);
          const id = (end >= 0 ? rest.slice(0, end) : rest).replace(/[^\u0020-\u007E]/g, '').trim();
          if (id.length > 0 && id.length < 100) {
            const now = currentTime * 1000;
            if (now - this.lastDecode > 2000) {
              this.lastDecode = now;
              this.port.postMessage({ type: 'connectionId', connectionId: id });
            }
            this.buffer = [];
            return true;
          }
        }
      }
    }
    this.buffer = this.buffer.slice(-this.maxBuf);
    return true;
  }
}
registerProcessor('ultrasound-receive', UltrasoundReceiveProcessor);
`;

/**
 * @returns {boolean} True if audio context and mic API are supported (receive needs getUserMedia).
 */
export function isUltrasoundSupported() {
    if (typeof window === 'undefined') return false;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return false;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') return false;
    try {
        if (!AudioContextCtor?.prototype?.audioWorklet) return false;
    } catch (_) {
        return false;
    }
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
    const durationSec = (syncBits * BIT_MS / 1000) + (bits.length * BIT_MS / 1000);
    const numSamples = Math.ceil(durationSec * SAMPLE_RATE);
    const buf = ctx.createBuffer(1, numSamples, SAMPLE_RATE);
    const data = buf.getChannelData(0);
    let t = 0;
    for (let i = 0; i < bits.length; i++) {
        const on = bits[i] === 1;
        const end = Math.min(t + SAMPLES_PER_BIT, numSamples);
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
 * Play ultrasound invite in a loop until stopped. For host/player to broadcast to multiple joiners.
 * @param {string} connectionId
 * @returns {{ stop: () => void }} Controller with stop() to end the loop.
 */
export function playUltrasoundInviteLoop(connectionId) {
    const ac = new AbortController();
    const signal = ac.signal;
    let running = true;
    (async () => {
        while (running && !signal.aborted) {
            try {
                await playUltrasoundInvite(connectionId);
            } catch (_) {
                break;
            }
        }
    })();
    return {
        stop() {
            running = false;
            ac.abort();
        },
    };
}

/**
 * Listen for ultrasound invite and call onConnectionId when detected. Uses AudioWorklet.
 * @param {(connectionId: string) => void} onConnectionId
 * @returns {Promise<{ stop: () => void }>}
 */
export function startUltrasoundListen(onConnectionId) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    return Promise.resolve()
        .then(() => {
            const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            return ctx.audioWorklet.addModule(url).then(() => {
                URL.revokeObjectURL(url);
            });
        })
        .then(() => navigator.mediaDevices.getUserMedia({ audio: true }))
        .then(stream => {
            const src = ctx.createMediaStreamSource(stream);
            const node = new AudioWorkletNode(ctx, 'ultrasound-receive', {
                processorOptions: {
                    samplesPerBit: SAMPLES_PER_BIT,
                    bitThreshold: BIT_THRESHOLD,
                    prefix: PREFIX,
                    maxBuf: MAX_BUF_SAMPLES,
                    phaseSteps: PHASE_STEPS,
                },
            });
            node.port.onmessage = (e) => {
                if (e.data?.type === 'connectionId' && typeof e.data.connectionId === 'string') {
                    onConnectionId(e.data.connectionId);
                }
            };
            src.connect(node);
            node.connect(ctx.destination);
            return {
                stop() {
                    try { node.port.close(); } catch (_) {}
                    try { node.disconnect(); } catch (_) {}
                    try { src.disconnect(); } catch (_) {}
                    stream.getTracks().forEach(t => t.stop());
                    ctx.close().catch(() => {});
                },
            };
        });
}
