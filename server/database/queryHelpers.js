import db from './db.js';

//==== Database Query Helpers to avoid manual promise wrapping throughoug ====//

// Execute a SELECT query that returns a single row
export function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Execute a SELECT query that returns multiple rows
export function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// Execute an INSERT, UPDATE, or DELETE query
export function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// Execute multiple queries in a transaction
export async function transaction(callback) {
    await dbRun('BEGIN TRANSACTION');
    try {
        const result = await callback({ dbGet, dbAll, dbRun });
        await dbRun('COMMIT');
        return result;
    } catch (error) {
        await dbRun('ROLLBACK');
        throw error;
    }
}
