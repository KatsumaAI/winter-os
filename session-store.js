const fs = require('fs');
const path = require('path');
const session = require('express-session');

class JsonFileSessionStore extends session.Store {
    constructor(options = {}) {
        super();
        this.filePath = options.filePath || path.join(process.cwd(), 'data', 'sessions.json');
        this.sessions = {};
        this._load();
    }

    _ensureDir() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    _load() {
        this._ensureDir();
        if (!fs.existsSync(this.filePath)) {
            this.sessions = {};
            return;
        }

        try {
            this.sessions = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) || {};
        } catch (error) {
            console.warn('Failed to load sessions file. Starting with an empty session store.', error.message);
            this.sessions = {};
        }
    }

    _save() {
        this._ensureDir();
        fs.writeFileSync(this.filePath, JSON.stringify(this.sessions, null, 2));
    }

    _cleanupExpired() {
        const now = Date.now();
        let changed = false;

        for (const [sid, sess] of Object.entries(this.sessions)) {
            const expiresAt = sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : null;
            if (expiresAt && expiresAt <= now) {
                delete this.sessions[sid];
                changed = true;
            }
        }

        if (changed) {
            this._save();
        }
    }

    get(sid, callback) {
        try {
            this._cleanupExpired();
            callback(null, this.sessions[sid] || null);
        } catch (error) {
            callback(error);
        }
    }

    set(sid, sessionData, callback = () => {}) {
        try {
            this.sessions[sid] = sessionData;
            this._save();
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    destroy(sid, callback = () => {}) {
        try {
            delete this.sessions[sid];
            this._save();
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    touch(sid, sessionData, callback = () => {}) {
        try {
            this.sessions[sid] = sessionData;
            this._save();
            callback(null);
        } catch (error) {
            callback(error);
        }
    }
}

module.exports = JsonFileSessionStore;
