import { writable } from 'svelte/store';

// Holds the active chat context so the header drawer can render member management.
// Set by Chat.svelte on mount, cleared on destroy.
export const chatContext = writable(null);
