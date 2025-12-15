import db from './db.js';

//==== Database Query Helpers ====//
// Wrapper functions to promisify SQLite callback-based queries
// This eliminates the need for manual Promise wrapping throughout the codebase

/**
 * Execute a SELECT query that returns a single row
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Object|undefined>} Single row or undefined if not found
 */
export function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Execute a SELECT query that returns multiple rows
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Array>} Array of rows (empty array if no results)
 */
export function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Object>} Object with lastID and changes properties
 */
export function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

/**
 * Execute multiple queries in a transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 * @param {Function} callback - Async function that receives db helpers object
 * @returns {Promise<*>} Result from callback function
 */
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
