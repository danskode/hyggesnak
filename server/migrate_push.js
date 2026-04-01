// Idempotent migration: creates push_subscriptions table if it does not exist.
// Run on production with: docker compose exec server node migrate_push.js

import db, { dbReady } from './database/db.js';

async function migrate() {
    await dbReady;

    // Check if table already exists
    const exists = await new Promise((resolve, reject) => {
        db.get(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='push_subscriptions'",
            [],
            (err, row) => err ? reject(err) : resolve(!!row)
        );
    });

    if (exists) {
        console.log('push_subscriptions already exists — nothing to do.');
        db.close();
        return;
    }

    await new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(endpoint)
            )
        `, (err) => err ? reject(err) : resolve());
    });

    await new Promise((resolve, reject) => {
        db.run(
            'CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id)',
            (err) => err ? reject(err) : resolve()
        );
    });

    console.log('push_subscriptions table created successfully.');
    db.close();
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
