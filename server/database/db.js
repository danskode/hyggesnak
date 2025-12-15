import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dbPath = path.join(__dirname, 'users.db');

// Create SQLite database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        process.exit(1);
    }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) {
        console.error('Error enabling foreign keys:', err);
    }
});

// Promise wrapper for database ready state
export const dbReady = new Promise((resolve, reject) => {
    initializeDatabase(resolve, reject);
});

function initializeDatabase(resolveCallback, rejectCallback) {

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        const error = new Error(`Schema file not found at: ${schemaPath}`);
        console.error('❌', error.message);
        rejectCallback(error);
        return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    db.exec(schema, (err) => {
        if (err) {
            console.error('❌ Error executing schema:', err);
            rejectCallback(err);
            return;
        }
        if (resolveCallback) resolveCallback();
    });
}

// Close database on process termination
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err);
        } else {
            console.log('✓ Database closed');
        }
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 SIGTERM received, closing database...');
    db.close((err) => {
        if (err) {
            console.error('❌ Error closing database:', err);
        } else {
            console.log('✓ Database closed');
        }
        process.exit(0);
    });
});

export default db;