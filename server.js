const express = require('express');
const session = require('express-session');
const JsonFileSessionStore = require('./session-store');
const path = require('path');
const fs = require('fs');

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const { initializeDatabase } = require('./database');
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    store: new JsonFileSessionStore({
        filePath: path.join(dataDir, 'sessions.json')
    }),
    secret: 'katsucases-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: false // Set to true in production with HTTPS
    }
}));

// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pages');

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/', pageRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.status(404).sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`KatsuCases server running on http://localhost:${PORT}`);
});
