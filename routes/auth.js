const express = require('express');
const { hashPassword, verifyPassword } = require('../password');
const router = express.Router();
const { db } = require('../database');
const { isAdminUserId } = require('../utils/roles');

// Registration
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
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

        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const result = db.prepare('INSERT INTO users (username, email, password_hash, balance) VALUES (?, ?, ?, ?)').run(username, email, passwordHash, 100.00);

        // Log in automatically
        req.session.userId = result.lastInsertRowid;

        // Log transaction
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            result.lastInsertRowid,
            'bonus',
            100.00,
            'Welcome bonus'
        );

        res.json({
            success: true,
            user: {
                id: result.lastInsertRowid,
                username,
                email,
                balance: 100.00,
                is_admin: isAdminUserId(result.lastInsertRowid)
            }
        });
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

        // Find user
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const validPassword = await verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create session
        req.session.userId = user.id;

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                is_admin: isAdminUserId(user.id)
            }
        });
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

    const user = db.prepare('SELECT id, username, email, balance, total_spent, total_earned, cases_opened, created_at FROM users WHERE id = ?').get(req.session.userId);
    
    if (!user) {
        return res.json({ user: null });
    }

    user.is_admin = isAdminUserId(user.id);
    res.json({ user });
});

module.exports = router;
