import { writable } from 'svelte/store';

// Browser check - we don't want SSR to try to access localStorage
const isBrowser = typeof window !== 'undefined';

export function persistentStore(key, initialValue) {
    // Get data from localStorage if it exists
    let storedValue = null;
    try {
        storedValue = isBrowser ? localStorage.getItem(key) : null;
    } catch (e) {
        console.error(`Error reading localStorage key "${key}":`, e);
    }

    let initial = initialValue;
    if (storedValue) {
        try {
            initial = JSON.parse(storedValue);
        } catch (e) {
            console.error(`Error parsing localStorage value for "${key}":`, e);
        }
    }

    // Create the store
    const store = writable(initial);

    // Subscribe to changes and sync to localStorage
    if (isBrowser) {
        store.subscribe(value => {
            try {
                if (value === null || value === undefined) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            } catch (e) {
                console.error(`Error writing to localStorage key "${key}":`, e);
            }
        });
    }

    return store;
}
