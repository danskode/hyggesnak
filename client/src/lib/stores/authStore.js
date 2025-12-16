import { persistentStore } from './persistentStore.js';
import { hyggesnakke, currentHyggesnak } from './hyggesnakStore.js';

//============== Create persistent auth store ==================//

const authStore = persistentStore('auth', null);

//To use in components and pages
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
        return value?.token || null;
    }
};