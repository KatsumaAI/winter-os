const express = require('express');
const router = express.Router();
const path = require('path');
const { isAuthenticated, isGuest, optionalAuth } = require('../middleware/auth');
const { hasAdminAccess } = require('../utils/roles');

function requireAdminPage(req, res, next) {
    if (!req.user || !hasAdminAccess(req.user)) {
        return res.redirect('/?admin=1');
    }
    next();
}

// Serve static HTML pages
router.get('/', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

router.get('/cases', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'cases.html'));
});

router.get('/marketplace', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'marketplace.html'));
});

router.get('/trading', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'trading.html'));
});

router.get('/livepulls', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'livepulls.html'));
});

router.get('/casevs', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'casevs.html'));
});

router.get('/claims/:code', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'claim.html'));
});

router.get('/inventory', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'inventory.html'));
});

router.get('/profile', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'profile.html'));
});


router.get('/admin', isAuthenticated, requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});


router.get('/settings', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'settings.html'));
});

router.get('/support', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'support.html'));
});

router.get('/admin/support', isAuthenticated, requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin-support.html'));
});

router.get('/admin/rollbacks', isAuthenticated, requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin-rollbacks.html'));
});


router.get('/guide', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'guide.html'));
});

router.get('/faq', optionalAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'faq.html'));
});

router.get('/signin', isGuest, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'signin.html'));
});

router.get('/signup', isGuest, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'signup.html'));
});


router.get('/forgot-password', isGuest, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'forgot-password.html'));
});

router.get('/reset-password', isGuest, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'reset-password.html'));
});

router.get('/admin/security', isAuthenticated, requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin-security.html'));
});


module.exports = router;
