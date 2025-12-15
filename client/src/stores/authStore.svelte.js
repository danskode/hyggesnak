import { get } from 'svelte/store';
import { persistentStore } from '../lib/persistentStore.js';
import { hyggesnakke, currentHyggesnak } from './hyggesnakStore.svelte.js';

// Create persistent auth store
const authStore = persistentStore('auth', null);

// Helper functions to use in components and pages
export const auth = {
    subscribe: authStore.subscribe,

    login: (userData) => {
        authStore.set(userData);
    },

    logout: () => {
        authStore.set(null);
        // Clear hyggesnak data on logout
        hyggesnakke.clear();
        currentHyggesnak.clear();
    },

    getToken: () => {
        const value = get(authStore);
        return value?.token || null;
    }
};