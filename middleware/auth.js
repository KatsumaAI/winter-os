const { db } = require('../database');
const { hasAdminAccess } = require('../utils/roles');

// Check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        if (user) {
            if (String(user.account_status || 'active').toLowerCase() === 'suspended') {
                const acceptsJson = (req.headers.accept || '').includes('application/json');
                const isApiRequest = req.originalUrl.startsWith('/api/') || req.xhr || acceptsJson;
                if (isApiRequest) {
                    return res.status(403).json({ error: 'This account is suspended' });
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
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        if (user) {
            user.is_admin = hasAdminAccess(user);
            req.user = user;
        }
    }
    next();
}

module.exports = { isAuthenticated, isGuest, optionalAuth };
