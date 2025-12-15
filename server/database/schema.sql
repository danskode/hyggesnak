-- Hyggesnak Database Schema
-- Clean schema without migrations - for fresh installs only

-- ============================================
-- 1. Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    display_name TEXT,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'USER' CHECK(role IN ('USER', 'SUPER_ADMIN')),
    reset_token TEXT DEFAULT NULL,
    reset_token_expires DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. Hyggesnakke Tables
-- ============================================
CREATE TABLE IF NOT EXISTS hyggesnakke (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL COLLATE NOCASE,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hyggesnak_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    hyggesnak_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK(role IN ('OWNER', 'MEMBER')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hyggesnak_id) REFERENCES hyggesnakke(id) ON DELETE CASCADE,
    UNIQUE(user_id, hyggesnak_id)
);

-- ============================================
-- 3. Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hyggesnak_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL CHECK(length(content) <= 2000 AND length(content) > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edited_at DATETIME DEFAULT NULL,
    is_deleted BOOLEAN DEFAULT 0,
    FOREIGN KEY (hyggesnak_id) REFERENCES hyggesnakke(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 4. Network System Tables
-- ============================================

-- Network invite codes (OTP codes for initial connection)
CREATE TABLE IF NOT EXISTS network_invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Network invitations (pending connection requests)
CREATE TABLE IF NOT EXISTS network_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME DEFAULT NULL,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(from_user_id, to_user_id)
);

-- Network connections (accepted bidirectional connections)
CREATE TABLE IF NOT EXISTS network_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id_1 INTEGER NOT NULL,
    user_id_2 INTEGER NOT NULL,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id_1) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id_2) REFERENCES users(id) ON DELETE CASCADE,
    CHECK(user_id_1 < user_id_2),
    UNIQUE(user_id_1, user_id_2)
);

-- ============================================
-- 5. Hyggesnak Invitations Table
-- ============================================
CREATE TABLE IF NOT EXISTS hyggesnak_invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hyggesnak_id INTEGER NOT NULL,
    invited_user_id INTEGER NOT NULL,
    invited_by_user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME DEFAULT NULL,
    FOREIGN KEY (hyggesnak_id) REFERENCES hyggesnakke(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(hyggesnak_id, invited_user_id)
);

-- ============================================
-- 6. Indexes for Performance
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);

-- Hyggesnak indexes
CREATE INDEX IF NOT EXISTS idx_hyggesnakke_name ON hyggesnakke(name);
CREATE INDEX IF NOT EXISTS idx_hyggesnak_memberships_user ON hyggesnak_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_hyggesnak_memberships_hyggesnak ON hyggesnak_memberships(hyggesnak_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_hyggesnak ON messages(hyggesnak_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_hyggesnak ON messages(user_id, hyggesnak_id, is_deleted);

-- Network indexes
CREATE INDEX IF NOT EXISTS idx_network_invite_codes_code ON network_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_network_invite_codes_created_by ON network_invite_codes(created_by, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_network_invitations_from ON network_invitations(from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_network_invitations_to ON network_invitations(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_network_connections_user1 ON network_connections(user_id_1);
CREATE INDEX IF NOT EXISTS idx_network_connections_user2 ON network_connections(user_id_2);

-- Hyggesnak invitations indexes
CREATE INDEX IF NOT EXISTS idx_hyggesnak_invitations_hyggesnak ON hyggesnak_invitations(hyggesnak_id, status);
CREATE INDEX IF NOT EXISTS idx_hyggesnak_invitations_user ON hyggesnak_invitations(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_hyggesnak_invitations_inviter ON hyggesnak_invitations(invited_by_user_id);
