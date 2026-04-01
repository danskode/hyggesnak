// Message cache — hyggesnakId → { messages[], newestId, hasMore }
// Messages are stored in chronological order (oldest first, ready for display)
const _cache = new Map();

export const messageCache = {
    get(hyggesnakId) {
        return _cache.get(String(hyggesnakId)) ?? null;
    },

    set(hyggesnakId, messages, hasMore) {
        _cache.set(String(hyggesnakId), {
            messages: [...messages],
            newestId: messages.length > 0 ? messages.at(-1).id : null,
            hasMore
        });
    },

    // Called by Socket.IO new-message event and after optimistic sends
    append(hyggesnakId, newMsg) {
        const entry = _cache.get(String(hyggesnakId));
        if (!entry) return;
        entry.messages = [...entry.messages, newMsg];
        entry.newestId = newMsg.id;
    },

    // Called by Socket.IO message-edited event
    update(hyggesnakId, updatedMsg) {
        const entry = _cache.get(String(hyggesnakId));
        if (!entry) return;
        const idx = entry.messages.findIndex(m => m.id === updatedMsg.id);
        if (idx !== -1) {
            const updated = [...entry.messages];
            updated[idx] = updatedMsg;
            entry.messages = updated;
        }
    },

    // Called by Socket.IO message-deleted event
    softDelete(hyggesnakId, messageId) {
        const entry = _cache.get(String(hyggesnakId));
        if (!entry) return;
        const idx = entry.messages.findIndex(m => m.id === messageId);
        if (idx !== -1) {
            const updated = [...entry.messages];
            updated[idx] = { ...updated[idx], is_deleted: true, content: '(Beskeden er slettet)' };
            entry.messages = updated;
        }
    },

    invalidate(hyggesnakId) {
        _cache.delete(String(hyggesnakId));
    },

    // Called on logout to prevent data leakage between sessions
    clear() {
        _cache.clear();
    }
};
