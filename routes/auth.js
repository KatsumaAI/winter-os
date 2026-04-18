const express = require('express');
const { hashPassword, verifyPassword } = require('../password');
const router = express.Router();
const { db } = require('../database');
const { isAdminUserId } = require('../utils/roles');

function getDayKey(date = new Date()) {
    return new Date(date).toISOString().slice(0, 10);
}

function xpForLevel(level) {
    return 100 + Math.max(0, Number(level || 1) - 1) * 75;
}

function buildProgressionPayload(user = {}) {
    const totalXp = Math.max(0, Number(user.total_xp || 0));
    let level = 1;
    let spent = 0;
    while (spent + xpForLevel(level) <= totalXp) {
        spent += xpForLevel(level);
        level += 1;
        if (level > 500) break;
    }
    return {
        total_xp: totalXp,
        level,
        xp_into_level: totalXp - spent,
        xp_for_next_level: xpForLevel(level),
        progress_percent: Math.max(0, Math.min(100, Math.round(((totalXp - spent) / Math.max(1, xpForLevel(level))) * 100)))
    };
}

function buildPityPayload(user) {
    const safe = user || {};
    const meters = [
        { key: 'rare', label: 'Rare+', progress: Math.max(0, Number(safe.pity_rare_streak || 0)), threshold: 5 },
        { key: 'epic', label: 'Epic+', progress: Math.max(0, Number(safe.pity_epic_streak || 0)), threshold: 12 },
        { key: 'legendary', label: 'Legendary+', progress: Math.max(0, Number(safe.pity_legendary_streak || 0)), threshold: 35 },
        { key: 'mythical', label: 'Mythical', progress: Math.max(0, Number(safe.pity_mythical_streak || 0)), threshold: 90 }
    ];
    return {
        enabled: true,
        meters: meters.map((meter) => ({
            ...meter,
            remaining: Math.max(0, meter.threshold - meter.progress),
            status: meter.progress >= meter.threshold - 1 ? 'primed' : 'tracking'
        }))
    };
}

function buildUserPayload(user = {}) {
    return {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        email: user.email,
        balance: Number(user.balance || 0),
        total_spent: Number(user.total_spent || 0),
        total_earned: Number(user.total_earned || 0),
        cases_opened: Number(user.cases_opened || 0),
        created_at: user.created_at,
        avatar_url: user.avatar_url || null,
        pronouns: user.pronouns || '',
        region: user.region || '',
        custom_role: user.custom_role || '',
        free_rolls: Number(user.free_rolls || 0),
        favorite_case_ids: Array.isArray(user.favorite_case_ids) ? user.favorite_case_ids : [],
        daily_claim_streak: Number(user.daily_claim_streak || 0),
        daily_last_claim_at: user.daily_last_claim_at || null,
        daily_cycle_day: user.daily_cycle_day || getDayKey(),
        daily_claim_total: Number(user.daily_claim_total || 0),
        total_xp: Number(user.total_xp || 0),
        is_admin: isAdminUserId(user.id),
        progression: buildProgressionPayload(user),
        pity: buildPityPayload(user)
    };
}

// Registration
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ error: 'Username must be 3-20 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const passwordHash = await hashPassword(password);
        const result = db.prepare('INSERT INTO users (username, email, password_hash, balance) VALUES (?, ?, ?, ?)').run(username, email, passwordHash, 100.00);

        req.session.userId = result.lastInsertRowid;

        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            result.lastInsertRowid,
            'bonus',
            100.00,
            'Welcome bonus'
        );

        const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, user: buildUserPayload(createdUser) });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const validPassword = await verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.session.userId = user.id;
        res.json({ success: true, user: buildUserPayload(user) });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// Get current user
router.get('/me', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.json({ user: null });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
        return res.json({ user: null });
    }

    res.json({ user: buildUserPayload(user) });
});

module.exports = router;
