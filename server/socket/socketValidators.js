//==== Socket.IO Input Validation Helpers ====//

export function validateHyggesnakId(hyggesnakId) {
    const parsed = parseInt(hyggesnakId, 10);
    if (isNaN(parsed) || parsed <= 0) {
        return { valid: false, error: 'Ugyldigt hyggesnak ID' };
    }
    return { valid: true, value: parsed };
}

export function validateTypingEvent(payload) {
    if (!payload || typeof payload !== 'object') {
        return { valid: false, error: 'Ugyldig event data' };
    }

    const { hyggesnakId } = payload;
    if (!hyggesnakId) {
        return { valid: false, error: 'Manglende hyggesnak ID' };
    }

    return validateHyggesnakId(hyggesnakId);
}
