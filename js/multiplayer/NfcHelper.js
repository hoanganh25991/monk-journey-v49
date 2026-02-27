/**
 * NFC helper for one-touch multiplayer: exchange connection ID via Web NFC.
 * When two devices touch, Host writes the room ID; Joiner scans and receives it.
 * Requires HTTPS and Chrome for Android 89+ (Web NFC).
 */

const MONK_JOURNEY_PREFIX = 'monkjourney:';

/**
 * Check if Web NFC is available (secure context + NDEFReader).
 * @returns {boolean}
 */
export function isNfcSupported() {
    if (typeof window === 'undefined' || !window.isSecureContext) return false;
    return typeof NDEFReader === 'function';
}

/**
 * Start scanning for an NFC message containing a Monk Journey connection ID.
 * When a tag/peer with our payload is read, calls onConnectionId(connectionId).
 * @param { (connectionId: string) => void } onConnectionId
 * @returns {Promise<{ stop: () => void }>} Resolves with an object that has stop() to cancel scanning.
 */
export function startNfcScan(onConnectionId) {
    if (!isNfcSupported()) {
        return Promise.reject(new Error('NFC not supported'));
    }
    const ndef = new NDEFReader();
    const handleReading = (event) => {
        const message = event.message;
        if (!message || !message.records || !message.records.length) return;
        for (const record of message.records) {
            try {
                if (record.recordType === 'text' && record.data) {
                    const decoder = new TextDecoder();
                    const text = decoder.decode(record.data);
                    if (text.startsWith(MONK_JOURNEY_PREFIX)) {
                        const connectionId = text.slice(MONK_JOURNEY_PREFIX.length).trim();
                        if (connectionId) {
                            ndef.removeEventListener('reading', handleReading);
                            onConnectionId(connectionId);
                            return;
                        }
                    }
                }
            } catch (_) { /* ignore */ }
        }
    };
    ndef.addEventListener('reading', handleReading);
    return ndef.scan().then(() => ({
        stop() {
            ndef.removeEventListener('reading', handleReading);
        }
    }));
}

/**
 * Write the connection ID to an NFC tag or peer device (when the other device is in range).
 * Call this after hosting; when the other phone touches, they receive the ID.
 * @param {string} connectionId - Host's peer/room ID
 * @returns {Promise<void>}
 */
export function writeNfcInvite(connectionId) {
    if (!isNfcSupported()) {
        return Promise.reject(new Error('NFC not supported'));
    }
    const ndef = new NDEFReader();
    const text = MONK_JOURNEY_PREFIX + connectionId;
    const encoder = new TextEncoder();
    const record = {
        recordType: 'text',
        data: encoder.encode(text)
    };
    return ndef.write({ records: [record] });
}
