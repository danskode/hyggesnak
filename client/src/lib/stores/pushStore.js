import { auth } from './authStore.js';
import { get } from 'svelte/store';

const API_BASE = '/api';

export function isPushSupported() {
    return 'PushManager' in window && 'serviceWorker' in navigator;
}

// Convert a base64url VAPID public key to a Uint8Array (required by pushManager.subscribe)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getAuthHeaders() {
    const token = get(auth)?.token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

export async function subscribeToPush() {
    if (!isPushSupported()) return { success: false, reason: 'not-supported' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { success: false, reason: 'denied' };

    try {
        const registration = await navigator.serviceWorker.ready;

        // Fetch VAPID public key from server
        const headers = await getAuthHeaders();
        const keyRes = await fetch(`${API_BASE}/push/public-key`, { headers });
        if (!keyRes.ok) return { success: false, reason: 'no-vapid-key' };

        const { data } = await keyRes.json();
        const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

        // Subscribe via browser PushManager
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey
        });

        const { endpoint, keys } = subscription.toJSON();

        // Send subscription to server
        const subRes = await fetch(`${API_BASE}/push/subscribe`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ endpoint, keys })
        });

        if (!subRes.ok) return { success: false, reason: 'server-error' };

        return { success: true };
    } catch (err) {
        console.error('[push] Subscribe failed:', err.message);
        return { success: false, reason: 'error' };
    }
}

export async function unsubscribeFromPush() {
    if (!isPushSupported()) return;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const { endpoint } = subscription.toJSON();

        // Remove from server first, then unsubscribe locally
        const headers = await getAuthHeaders();
        await fetch(`${API_BASE}/push/subscribe`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ endpoint })
        }).catch(() => {});

        await subscription.unsubscribe();
    } catch (err) {
        console.error('[push] Unsubscribe failed:', err.message);
    }
}

// Re-register existing browser subscription under the current logged-in user.
// Called on login so the subscription follows whoever is logged in on this device.
export async function refreshPushSubscription() {
    if (!isPushSupported()) return;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;

        const { endpoint, keys } = subscription.toJSON();
        const headers = await getAuthHeaders();
        await fetch(`${API_BASE}/push/subscribe`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ endpoint, keys })
        }).catch(() => {});
    } catch {
        // Silent — push is non-critical
    }
}

// Check if the browser currently has an active push subscription
export async function isPushSubscribed() {
    if (!isPushSupported()) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        return !!sub;
    } catch {
        return false;
    }
}
