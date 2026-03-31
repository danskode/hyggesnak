#!/usr/bin/env node
// cli.js — Hyggesnak user management CLI
// Usage: node cli.js <command> [args]

import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'database/hyggesnak.db');
const BCRYPT_ROUNDS = 10;

//==== Database ====//

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Could not open database:', DB_PATH);
        console.error('Make sure the server has been started at least once to create the database.');
        process.exit(1);
    }
});

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function closeDb() {
    return new Promise((resolve) => db.close(() => resolve()));
}

//==== Helpers ====//

function generatePassword(length = 14) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    return Array.from(crypto.randomBytes(length))
        .map((b) => chars[b % chars.length])
        .join('');
}

function prompt(question, hidden = false) {
    return new Promise((resolve) => {
        if (hidden && process.stdin.isTTY) {
            process.stdout.write(question);
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            let input = '';
            const onData = (ch) => {
                if (ch === '\n' || ch === '\r') {
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(input);
                } else if (ch === '\u0003') {
                    process.exit();
                } else if (ch === '\u007f' || ch === '\b') {
                    input = input.slice(0, -1);
                } else {
                    input += ch;
                }
            };
            process.stdin.on('data', onData);
        } else {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
        }
    });
}

function confirm(question) {
    return prompt(`${question} [y/N] `).then((a) => a.toLowerCase() === 'y');
}

function parseArgs(args) {
    const flags = {};
    const positional = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
        } else {
            positional.push(args[i]);
        }
    }
    return { flags, positional };
}

//==== Commands ====//

async function userCreate(args) {
    const { flags, positional } = parseArgs(args);
    let username = positional[0];

    if (!username) {
        username = await prompt('Username: ');
    }
    if (!username) { console.error('Username is required.'); process.exit(1); }

    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) { console.error(`User "${username}" already exists.`); process.exit(1); }

    const displayName = flags.name || username;
    const email = flags.email || `${username.toLowerCase()}@hyggesnak.local`;

    let role;
    if (flags.admin || flags.role === 'admin') {
        role = 'SUPER_ADMIN';
    } else if (flags.role === 'user') {
        role = 'USER';
    } else {
        const roleInput = await prompt('Role [user/admin] (default: user): ');
        role = roleInput.toLowerCase() === 'admin' ? 'SUPER_ADMIN' : 'USER';
    }

    let password;
    if (flags.generate) {
        password = generatePassword();
        console.log(`Generated password: ${password}`);
    } else if (flags.password) {
        password = flags.password;
    } else {
        password = await prompt('Password (leave blank to generate): ', true);
        if (!password) {
            password = generatePassword();
            console.log(`Generated password: ${password}`);
        }
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { lastID } = await dbRun(
        'INSERT INTO users (username, display_name, password, email, role) VALUES (?, ?, ?, ?, ?)',
        [username, displayName, hash, email, role]
    );

    console.log(`\nUser created:`);
    console.log(`  ID:           ${lastID}`);
    console.log(`  Username:     ${username}`);
    console.log(`  Display name: ${displayName}`);
    console.log(`  Role:         ${role}`);
}

async function userList() {
    const users = await dbAll(
        'SELECT id, username, display_name, email, role, created_at FROM users ORDER BY created_at ASC'
    );

    if (users.length === 0) { console.log('No users found.'); return; }

    const col = (s, w) => String(s ?? '').padEnd(w);
    const header = `${col('ID', 4)} ${col('Username', 20)} ${col('Display name', 20)} ${col('Role', 12)} Created`;
    const divider = '-'.repeat(header.length);

    console.log('\n' + header);
    console.log(divider);
    for (const u of users) {
        const created = new Date(u.created_at).toLocaleDateString('da-DK');
        console.log(`${col(u.id, 4)} ${col(u.username, 20)} ${col(u.display_name, 20)} ${col(u.role, 12)} ${created}`);
    }
    console.log(`\nTotal: ${users.length} user(s)`);
}

async function userPassword(args) {
    const { flags, positional } = parseArgs(args);
    let username = positional[0];

    if (!username) {
        username = await prompt('Username: ');
    }

    const user = await dbGet('SELECT id, username FROM users WHERE username = ?', [username]);
    if (!user) { console.error(`User "${username}" not found.`); process.exit(1); }

    let password;
    if (flags.generate) {
        password = generatePassword();
        console.log(`Generated password: ${password}`);
    } else if (flags.password) {
        password = flags.password;
    } else {
        password = await prompt('New password (leave blank to generate): ', true);
        if (!password) {
            password = generatePassword();
            console.log(`Generated password: ${password}`);
        }
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await dbRun('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, user.id]);

    console.log(`Password updated for "${username}".`);
}

async function userDelete(args) {
    const { positional } = parseArgs(args);
    let username = positional[0];

    if (!username) {
        username = await prompt('Username: ');
    }

    const user = await dbGet('SELECT id, username, role FROM users WHERE username = ?', [username]);
    if (!user) { console.error(`User "${username}" not found.`); process.exit(1); }

    if (user.role === 'SUPER_ADMIN') {
        const adminCount = await dbGet('SELECT COUNT(*) as count FROM users WHERE role = "SUPER_ADMIN"');
        if (adminCount.count <= 1) {
            console.error('Cannot delete the last admin user.');
            process.exit(1);
        }
    }

    const ok = await confirm(`Delete user "${username}"? This removes all their messages, memberships and connections.`);
    if (!ok) { console.log('Cancelled.'); return; }

    await dbRun('DELETE FROM users WHERE id = ?', [user.id]);
    console.log(`User "${username}" deleted.`);
}

//==== Help ====//

function printHelp() {
    console.log(`
Hyggesnak CLI — user management

Usage:
  node cli.js user create [username] [options]
  node cli.js user list
  node cli.js user password [username] [options]
  node cli.js user delete [username]

Commands:
  user create   Create a new user. Prompts for password if not provided.
  user list     List all users.
  user password Reset a user's password.
  user delete   Delete a user and all associated data.

Options for create / password:
  --name "Display Name"   Display name (default: username)
  --email user@example.com   Email (default: username@hyggesnak.local)
  --password <pwd>        Set password directly (skip prompt)
  --generate              Auto-generate a secure password
  --role user|admin       Set role directly (skips prompt)
  --admin                 Shorthand for --role admin

Examples:
  node cli.js user create lars
  node cli.js user create lars --name "Lars Hansen" --admin
  node cli.js user create lars --generate
  node cli.js user list
  node cli.js user password lars
  node cli.js user password lars --generate
  node cli.js user delete lars
`);
}

//==== Entry point ====//

async function main() {
    const [, , noun, verb, ...rest] = process.argv;

    if (!noun || noun === '--help' || noun === '-h') {
        printHelp();
        process.exit(0);
    }

    try {
        if (noun === 'user') {
            if (verb === 'create')   await userCreate(rest);
            else if (verb === 'list')     await userList();
            else if (verb === 'password') await userPassword(rest);
            else if (verb === 'delete')   await userDelete(rest);
            else { console.error(`Unknown command: user ${verb}\n`); printHelp(); process.exit(1); }
        } else {
            console.error(`Unknown command: ${noun}\n`);
            printHelp();
            process.exit(1);
        }
    } catch (err) {
        console.error('Error:', err.message || err);
        process.exit(1);
    } finally {
        await closeDb();
    }
}

main();
