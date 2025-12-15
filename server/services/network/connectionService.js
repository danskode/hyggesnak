import { dbGet, dbAll, dbRun } from '../../database/queryHelpers.js';

//==== Network Connection Management ====//

// Check to see if two users are connected
export async function areUsersConnected(userId1, userId2) {
    const user1 = Math.min(userId1, userId2);
    const user2 = Math.max(userId1, userId2);

    const connection = await dbGet(
        'SELECT id FROM network_connections WHERE user_id_1 = ? AND user_id_2 = ?',
        [user1, user2]
    );

    return !!connection;
}

// Get all network connections for a user
export async function getNetworkConnections(userId) {
    return await dbAll(
        `SELECT
            CASE
                WHEN nc.user_id_1 = ? THEN nc.user_id_2
                ELSE nc.user_id_1
            END as user_id,
            nc.connected_at,
            u.username,
            u.display_name
         FROM network_connections nc
         JOIN users u ON u.id = (
            CASE
                WHEN nc.user_id_1 = ? THEN nc.user_id_2
                ELSE nc.user_id_1
            END
         )
         WHERE nc.user_id_1 = ? OR nc.user_id_2 = ?
         ORDER BY nc.connected_at DESC`,
        [userId, userId, userId, userId]
    );
}

// Remove a network connection
export async function removeNetworkConnection(userId1, userId2) {
    if (userId1 === userId2) {
        throw new Error('Du kan altså ikke fjerne forbindelse til dig selv');
    }

    const user1 = Math.min(userId1, userId2);
    const user2 = Math.max(userId1, userId2);

    const { changes } = await dbRun(
        'DELETE FROM network_connections WHERE user_id_1 = ? AND user_id_2 = ?',
        [user1, user2]
    );

    if (changes === 0) {
        throw new Error('Forbindelse ikke fundet');
    }

    await dbRun(
        `DELETE FROM network_invitations
         WHERE (from_user_id = ? AND to_user_id = ?)
            OR (from_user_id = ? AND to_user_id = ?)`,
        [userId1, userId2, userId2, userId1]
    );

    await dbRun(
        `DELETE FROM hyggesnak_invitations
         WHERE invited_user_id IN (?, ?)
           AND invited_by_user_id IN (?, ?)
           AND status = 'PENDING'`,
        [userId1, userId2, userId1, userId2]
    );
}