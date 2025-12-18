import { writable, derived } from 'svelte/store';
import { apiGet } from '../api/api.js';
import { API_ENDPOINTS } from '../utils/constants.js';

// Store for unread message counts
// Structure: { byHyggesnak: { hyggesnakId: count }, total: number }
function createUnreadStore() {
    const { subscribe, set, update } = writable({
        byHyggesnak: {},
        total: 0
    });

    return {
        subscribe,

        // Load unread counts from server
        async load() {
            try {
                const result = await apiGet(API_ENDPOINTS.UNREAD_COUNTS);
                set(result.data);
            } catch (err) {
                console.error('Error loading unread counts:', err);
            }
        },

        // Increment count for a specific hyggesnak
        increment(hyggesnakId) {
            update(state => {
                const newByHyggesnak = { ...state.byHyggesnak };
                newByHyggesnak[hyggesnakId] = (newByHyggesnak[hyggesnakId] || 0) + 1;

                return {
                    byHyggesnak: newByHyggesnak,
                    total: state.total + 1
                };
            });
        },

        // Reset count for a specific hyggesnak (when user views it)
        reset(hyggesnakId) {
            update(state => {
                const currentCount = state.byHyggesnak[hyggesnakId] || 0;
                const newByHyggesnak = { ...state.byHyggesnak };
                newByHyggesnak[hyggesnakId] = 0;

                return {
                    byHyggesnak: newByHyggesnak,
                    total: Math.max(0, state.total - currentCount)
                };
            });
        },

        // Clear all counts
        clear() {
            set({
                byHyggesnak: {},
                total: 0
            });
        }
    };
}

export const unreadCounts = createUnreadStore();

// Derived store for total unread count (convenience)
export const totalUnread = derived(
    unreadCounts,
    $unreadCounts => $unreadCounts.total
);
