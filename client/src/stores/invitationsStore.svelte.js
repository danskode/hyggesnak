import { writable, derived, get } from 'svelte/store';
import { persistentStore } from '../lib/persistentStore.js';
import { apiGet } from '../lib/api.js';
import { API_ENDPOINTS } from '../lib/constants.js';

/**
 * Store for managing all invitation-related state:
 * - Network invitations (incoming/outgoing)
 * - Hyggesnak invitations
 * - Notification badge counts
 */

// Network invitations
export const networkInvitationsIncoming = writable([]);
export const networkInvitationsOutgoing = writable([]);

// Hyggesnak invitations
export const hyggesnakInvitations = writable([]);

// Derived total count for notification badge
export const totalPendingInvitations = derived(
    [networkInvitationsIncoming, hyggesnakInvitations],
    ([$networkIncoming, $hyggesnakInvites]) => {
        return $networkIncoming.length + $hyggesnakInvites.length;
    }
);

// Loading states
export const invitationsLoading = writable(false);

/**
 * Fetch all invitations from the server
 */
export async function fetchAllInvitations() {
    invitationsLoading.set(true);

    try {
        // Fetch network invitations (incoming)
        const networkIncomingResult = await apiGet(API_ENDPOINTS.NETWORK_INVITATIONS_INCOMING, {
            skipAuthRedirect: true
        });
        networkInvitationsIncoming.set(networkIncomingResult.data || []);

        // Fetch network invitations (outgoing)
        const networkOutgoingResult = await apiGet(API_ENDPOINTS.NETWORK_INVITATIONS_OUTGOING, {
            skipAuthRedirect: true
        });
        networkInvitationsOutgoing.set(networkOutgoingResult.data || []);

        // Fetch hyggesnak invitations
        const hyggesnakResult = await apiGet(API_ENDPOINTS.HYGGESNAK_INVITATIONS, {
            skipAuthRedirect: true
        });
        hyggesnakInvitations.set(hyggesnakResult.data || []);

    } catch (err) {
        console.error('Error fetching invitations:', err);
        // Don't clear stores on error - keep existing data
    } finally {
        invitationsLoading.set(false);
    }
}

/**
 * Add a new network invitation (incoming)
 */
export function addNetworkInvitationIncoming(invitation) {
    const current = get(networkInvitationsIncoming);
    networkInvitationsIncoming.set([...current, invitation]);
}

/**
 * Remove a network invitation (incoming) by ID
 */
export function removeNetworkInvitationIncoming(invitationId) {
    const current = get(networkInvitationsIncoming);
    networkInvitationsIncoming.set(current.filter(inv => inv.id !== invitationId));
}

/**
 * Remove a network invitation (outgoing) by ID
 */
export function removeNetworkInvitationOutgoing(invitationId) {
    const current = get(networkInvitationsOutgoing);
    networkInvitationsOutgoing.set(current.filter(inv => inv.id !== invitationId));
}

/**
 * Add a new hyggesnak invitation
 */
export function addHyggesnakInvitation(invitation) {
    const current = get(hyggesnakInvitations);
    hyggesnakInvitations.set([...current, invitation]);
}

/**
 * Remove a hyggesnak invitation by ID
 */
export function removeHyggesnakInvitation(invitationId) {
    const current = get(hyggesnakInvitations);
    hyggesnakInvitations.set(current.filter(inv => inv.id !== invitationId));
}

/**
 * Clear all invitations (on logout)
 */
export function clearAllInvitations() {
    networkInvitationsIncoming.set([]);
    networkInvitationsOutgoing.set([]);
    hyggesnakInvitations.set([]);
}

/**
 * Helper to check if there are any pending invitations
 */
export function hasPendingInvitations() {
    const count = get(totalPendingInvitations);
    return count > 0;
}
