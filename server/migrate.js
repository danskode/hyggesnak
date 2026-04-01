import db, { dbReady } from './database/db.js';

async function migrate() {
    await dbReady;

    await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(hyggesnakke)', [], (err, cols) => {
            if (err) return reject(err);
            if (cols.some(c => c.name === 'gif_enabled')) {
                console.log('✓ hyggesnakke.gif_enabled already exists, skipping');
                return resolve();
            }
            db.run('ALTER TABLE hyggesnakke ADD COLUMN gif_enabled BOOLEAN DEFAULT 0', err => {
                if (err) return reject(err);
                console.log('✓ Added hyggesnakke.gif_enabled');
                resolve();
            });
        });
    });

    await new Promise((resolve, reject) => {
        db.all('PRAGMA table_info(messages)', [], (err, cols) => {
            if (err) return reject(err);
            if (cols.some(c => c.name === 'message_type')) {
                console.log('✓ messages.message_type already exists, skipping');
                return resolve();
            }
            db.run(
                "ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text' CHECK(message_type IN ('text', 'gif'))",
                err => {
                    if (err) return reject(err);
                    console.log('✓ Added messages.message_type');
                    resolve();
                }
            );
        });
    });

    console.log('Migration complete');
    db.close();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
