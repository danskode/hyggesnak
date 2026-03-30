import 'dotenv/config';
import db, { dbReady } from './db.js';
import { dbGet, dbRun } from './queryHelpers.js';
import bcrypt from 'bcrypt';
import { config } from '../config/config.js';

//==== Production-safe init script — opretter SUPER_ADMIN hvis ingen brugere eksisterer ====//

const username = process.env.INIT_ADMIN_USERNAME;
const password = process.env.INIT_ADMIN_PASSWORD;
const email = process.env.INIT_ADMIN_EMAIL;
const displayName = process.env.INIT_ADMIN_DISPLAY_NAME || username;

if (!username || !password || !email) {
    console.error('Mangler env-variabler: INIT_ADMIN_USERNAME, INIT_ADMIN_PASSWORD, INIT_ADMIN_EMAIL');
    process.exit(1);
}

await dbReady;

const existing = await dbGet('SELECT id FROM users LIMIT 1');
if (existing) {
    console.log('✓ Database har allerede brugere — init springes over');
    db.close();
    process.exit(0);
}

const hashed = await bcrypt.hash(password, config.saltRounds);
await dbRun(
    'INSERT INTO users (username, display_name, password, email, role) VALUES (?, ?, ?, ?, ?)',
    [username, displayName, hashed, email, 'SUPER_ADMIN']
);

console.log(`✓ Admin-bruger '${username}' oprettet`);

db.close();
