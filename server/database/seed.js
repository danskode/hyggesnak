import db, { dbReady } from './db.js';
import { dbRun } from './queryHelpers.js';
import bcrypt from 'bcrypt';
import { config } from '../config/config.js';

// Prevent seeding in production
if (process.env.NODE_ENV === 'production') {
    console.error('CANNOT RUN SEED IN PRODUCTION! Exiting...');
    process.exit(1);
}

// Hyggesnakke to create
const hyggesnakke = [
    { name: 'familien', display_name: 'Familien 👨‍👩‍👧‍👦' },
    { name: 'vennegruppen', display_name: 'Vennegruppen 🎉' },
    { name: 'arbejde', display_name: 'Arbejde 💼' }
];

// Users to create
const users = [
    {
        username: 'john',
        display_name: 'John (Admin)',
        password: process.env.SEED_ADMIN_PASSWORD || 'Familien1!',
        email: 'john@hyggesnakke.dk',
        role: 'SUPER_ADMIN'
    },
    {
        username: 'mor',
        display_name: 'Mor 👩🏼‍🚀',
        password: process.env.SEED_PASSWORD || 'Familien1!',
        email: 'mor@hyggesnakke.dk',
        role: 'USER'
    },
    {
        username: 'far',
        display_name: 'Farmand 👨🏻‍🍼',
        password: process.env.SEED_PASSWORD || 'Familien1!',
        email: 'far@hyggesnakke.dk',
        role: 'USER'
    },
    {
        username: 'lillebror',
        display_name: 'Lillebror 👦🏻',
        password: process.env.SEED_PASSWORD || 'Familien1!',
        email: 'lillebror@hyggesnakke.dk',
        role: 'USER'
    }
];

// Memberships: [userId, hyggesnakId, role]
const memberships = [
    // Mor is owner of all hyggesnakke
    [2, 1, 'OWNER'],  // Mor -> Familien (OWNER)
    [2, 2, 'OWNER'],  // Mor -> Vennegruppen (OWNER)
    [2, 3, 'OWNER'],  // Mor -> Arbejde (OWNER)

    // Far is member of Familien and Vennegruppen
    [3, 1, 'MEMBER'], // Far -> Familien (MEMBER)
    [3, 2, 'MEMBER'], // Far -> Vennegruppen (MEMBER)

    // Lillebror is only in Familien
    [4, 1, 'MEMBER']  // Lillebror -> Familien (MEMBER)
];

// Network connections: [userId1, userId2]
// John (SUPER_ADMIN) is NOT part of the network system
const networkConnections = [
    [2, 3], // Mor <-> Far (both in Familien and Vennegruppen)
    [2, 4], // Mor <-> Lillebror (both in Familien)
    [3, 4]  // Far <-> Lillebror (both in Familien)
];

async function seedDatabase() {
    console.log('SEEDING DATABASE WITH DEVELOPMENT DATA');
    console.log('This should ONLY be run in development!');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('');
    console.log('Waiting for database initialization...');
    await dbReady;
    console.log('Database ready! Starting seed...\n');

    try {
        // 1. Create hyggesnakke
        console.log('Creating hyggesnakke...');
        for (const hyggesnak of hyggesnakke) {
            try {
                await dbRun(
                    'INSERT INTO hyggesnakke (name, display_name) VALUES (?, ?)',
                    [hyggesnak.name, hyggesnak.display_name]
                );
                console.log(`✓ Hyggesnak ${hyggesnak.name} created`);
            } catch (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log(`⚠️  Hyggesnak ${hyggesnak.name} already exists, skipping...`);
                } else {
                    console.error(`❌ Error inserting hyggesnak ${hyggesnak.name}:`, err);
                }
            }
        }

        // 2. Create users
        console.log('\nCreating users...');
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.password, config.saltRounds);

            try {
                await dbRun(
                    'INSERT INTO users (username, display_name, password, email, role) VALUES (?, ?, ?, ?, ?)',
                    [user.username, user.display_name, hashedPassword, user.email, user.role]
                );
                console.log(`✓ User ${user.username} created`);
            } catch (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log(`⚠️  User ${user.username} already exists, skipping...`);
                } else {
                    console.error(`❌ Error inserting user ${user.username}:`, err);
                }
            }
        }

        // 3. Create memberships
        console.log('\nCreating memberships...');
        for (const [userId, hyggesnakId, role] of memberships) {
            try {
                await dbRun(
                    'INSERT INTO hyggesnak_memberships (user_id, hyggesnak_id, role) VALUES (?, ?, ?)',
                    [userId, hyggesnakId, role]
                );
                console.log(`✓ Membership created: user ${userId} -> hyggesnak ${hyggesnakId} (${role})`);
            } catch (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log(`⚠️  Membership (user ${userId}, hyggesnak ${hyggesnakId}) already exists, skipping...`);
                } else {
                    console.error(`❌ Error creating membership:`, err);
                }
            }
        }

        // 4. Create network connections
        console.log('\nCreating network connections...');
        for (const [userId1, userId2] of networkConnections) {
            try {
                await dbRun(
                    'INSERT INTO network_connections (user_id_1, user_id_2) VALUES (?, ?)',
                    [userId1, userId2]
                );
                console.log(`✓ Network connection created: ${userId1} <-> ${userId2}`);
            } catch (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log(`⚠️  Network connection (${userId1} <-> ${userId2}) already exists, skipping...`);
                } else {
                    console.error(`❌ Error creating network connection:`, err);
                }
            }
        }

        console.log('\n✓ Seeding complete!');
        console.log('\nSeed summary:');
        console.log('- Hyggesnakke: Familien, Vennegruppen, Arbejde');
        console.log('- Users: john (SUPER_ADMIN), mor (owner of all 3), far (member of 2), lillebror (member of 1)');
        console.log('- Total memberships: 6');
        console.log('- Network connections: 6 (all seeded users are connected)');

    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        // Close database
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('\n✓ Database closed');
            }
        });
    }
}

seedDatabase();