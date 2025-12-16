import { writable } from 'svelte/store';

const onlineUserIds = writable(new Set());

export const onlineUsers = {
    subscribe: onlineUserIds.subscribe,

    add: (userId) => {
        onlineUserIds.update(users => {
            const newUsers = new Set(users);
            newUsers.add(userId);
            return newUsers;
        });
    },

    remove: (userId) => {
        onlineUserIds.update(users => {
            const newUsers = new Set(users);
            newUsers.delete(userId);
            return newUsers;
        });
    },

    set: (userIds) => {
        onlineUserIds.set(new Set(userIds));
    },

    clear: () => {
        onlineUserIds.set(new Set());
    }
};
