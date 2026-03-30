import { writable } from 'svelte/store';

// Pages populate this with context-specific actions for the header drawer.
// Each action: { label: string, path: string }
export const pageActions = writable([]);
