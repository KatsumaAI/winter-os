const express = require('express');
const router = express.Router();
const path = require('path');
const { isAuthenticated, isGuest, optionalAuth } = require('../middleware/auth');

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

router.get('/inventory', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'inventory.html'));
});

router.get('/profile', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'profile.html'));
});


router.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
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

module.exports = router;
