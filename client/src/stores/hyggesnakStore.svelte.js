import { get } from 'svelte/store';
import { persistentStore } from '../lib/persistentStore.js';

// Create persistent stores for hyggesnakke
const hyggesnakkeListStore = persistentStore('hyggesnakke', []);
const currentHyggesnakStore = persistentStore('currentHyggesnak', null);

// Helper functions for hyggesnakke list
export const hyggesnakke = {
    subscribe: hyggesnakkeListStore.subscribe,

    set: (hyggesnakkeList) => {
        hyggesnakkeListStore.set(hyggesnakkeList);
    },

    add: (hyggesnak) => {
        const current = get(hyggesnakkeListStore) || [];
        hyggesnakkeListStore.set([...current, hyggesnak]);
    },

    remove: (hyggesnakId) => {
        const current = get(hyggesnakkeListStore) || [];
        hyggesnakkeListStore.set(current.filter(h => h.id !== hyggesnakId));
    },

    update: (hyggesnakId, updatedData) => {
        const current = get(hyggesnakkeListStore) || [];
        hyggesnakkeListStore.set(
            current.map(h => h.id === hyggesnakId ? { ...h, ...updatedData } : h)
        );
    },

    clear: () => {
        hyggesnakkeListStore.set([]);
    }
};

// Helper functions for current hyggesnak
export const currentHyggesnak = {
    subscribe: currentHyggesnakStore.subscribe,

    select: (hyggesnak) => {
        currentHyggesnakStore.set(hyggesnak);
    },

    clear: () => {
        currentHyggesnakStore.set(null);
    },

    getId: () => {
        const value = get(currentHyggesnakStore);
        return value?.id || null;
    }
};
