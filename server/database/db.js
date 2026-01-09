import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path
const dbPath = path.join(__dirname, 'hyggesnak.db');

// Create SQLite database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        process.exit(1);
    }
});

// Configure database for optimal performance
db.serialize(() => {
    // Enable foreign keys (security)
    db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
            console.error('❌ Error enabling foreign keys:', err);
        }
    });

    // Enable WAL mode for better concurrency (multiple readers, one writer)
    db.run('PRAGMA journal_mode = WAL', (err) => {
        if (err) {
            console.error('❌ Error enabling WAL mode:', err);
        } else {
            console.log('✓ WAL mode enabled');
        }
    });

    // Optimize WAL checkpoint behavior
    db.run('PRAGMA wal_autocheckpoint = 1000', (err) => {
        if (err) {
            console.error('❌ Error setting WAL autocheckpoint:', err);
        }
    });

    // Enable busy timeout to handle concurrent access
    db.run('PRAGMA busy_timeout = 5000', (err) => {
        if (err) {
            console.error('❌ Error setting busy timeout:', err);
        }
    });

    // Optimize cache size (in pages, -2000 = ~2MB)
    db.run('PRAGMA cache_size = -2000', (err) => {
        if (err) {
            console.error('❌ Error setting cache size:', err);
        }
    });

    // Use memory-mapped I/O for better performance (30MB)
    db.run('PRAGMA mmap_size = 30000000', (err) => {
        if (err) {
            console.error('❌ Error setting mmap size:', err);
        }
    });

    // Optimize synchronous mode (NORMAL is safe with WAL)
    db.run('PRAGMA synchronous = NORMAL', (err) => {
        if (err) {
            console.error('❌ Error setting synchronous mode:', err);
        }
    });

    // Optimize temp store to use memory
    db.run('PRAGMA temp_store = MEMORY', (err) => {
        if (err) {
            console.error('❌ Error setting temp store:', err);
        }
    });
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