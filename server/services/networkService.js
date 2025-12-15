//==== Network Service - Barrel Export ====//
// Re-exports all network-related functions from modular services
// This maintains backward compatibility with existing imports

// Code management functions
export {
    generateNetworkCode,
    getUserActiveCode,
    revokeUserCodes,
    validateNetworkCode
} from './network/codeService.js';

// Invitation management functions
export {
    createNetworkInvitation,
    getIncomingInvitations,
    getOutgoingInvitations,
    acceptNetworkInvitation,
    rejectNetworkInvitation,
    cancelNetworkInvitation
} from './network/invitationService.js';

// Connection management functions
export {
    areUsersConnected,
    getNetworkConnections,
    removeNetworkConnection
} from './network/connectionService.js';
