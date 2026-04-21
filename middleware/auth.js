const fs = require('fs');
const path = require('path');
const { db } = require('../database');
const { hasAdminAccess } = require('../utils/roles');

const appDataPath = path.join(__dirname, '..', 'data', 'katsucases.json');

function readState() {
    try {
        return JSON.parse(fs.readFileSync(appDataPath, 'utf8'));
    } catch (error) {
        return { meta: { nextIds: {} }, tables: {} };
    }
}

function writeState(state) {
    fs.writeFileSync(appDataPath, JSON.stringify(state, null, 2));
    if (typeof db.reload === 'function') db.reload();
}

function refreshExpiredAccountStatus(state, userId) {
    const users = Array.isArray(state.tables?.users) ? state.tables.users : [];
    const user = users.find((row) => Number(row.id) === Number(userId));
    if (!user) return false;
    if (user.account_status === undefined) user.account_status = 'active';
    if (user.account_status_reason === undefined) user.account_status_reason = '';
    if (user.account_status_expires_at === undefined) user.account_status_expires_at = null;
    if (String(user.account_status || 'active').toLowerCase() !== 'suspended') return false;
    if (!user.account_status_expires_at) return false;
    const expiresAt = new Date(user.account_status_expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) return false;
    user.account_status = 'active';
    user.account_status_reason = '';
    user.account_status_expires_at = null;
    user.account_status_set_at = null;
    user.account_status_set_by = null;
    return true;
}

// Check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        const state = readState();
        if (refreshExpiredAccountStatus(state, req.session.userId)) {
            writeState(state);
        }
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        if (user) {
            if (String(user.account_status || 'active').toLowerCase() === 'suspended') {
                const acceptsJson = (req.headers.accept || '').includes('application/json');
                const isApiRequest = req.originalUrl.startsWith('/api/') || req.xhr || acceptsJson;
                if (isApiRequest) {
                    return res.status(403).json({ error: 'This account is suspended', reason: user.account_status_reason || '', expires_at: user.account_status_expires_at || null });
                }
                return res.redirect('/signin?suspended=1');
            }
            user.is_admin = hasAdminAccess(user);
            req.user = user;
            return next();
        }
    }

    const acceptsJson = (req.headers.accept || '').includes('application/json');
    const isApiRequest = req.originalUrl.startsWith('/api/') || req.xhr || acceptsJson;

    if (isApiRequest) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    res.redirect('/signin');
}

// Check if user is NOT authenticated (for login/register pages)
function isGuest(req, res, next) {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    next();
}

// Optional auth - attaches user if available but doesn't require it
function optionalAuth(req, res, next) {
    if (req.session && req.session.userId) {
        const state = readState();
        if (refreshExpiredAccountStatus(state, req.session.userId)) {
            writeState(state);
        }
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        if (user) {
            user.is_admin = hasAdminAccess(user);
            req.user = user;
        }
    }
    next();
}

module.exports = { isAuthenticated, isGuest, optionalAuth };
