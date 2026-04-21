const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('../password');
const router = express.Router();
const { db, notifications } = require('../database');
const { hasAdminAccess, isOwnerUserId, getUserSiteRole, getOwnerUserId } = require('../utils/roles');

const appDataPath = path.join(__dirname, '..', 'data', 'katsucases.json');

function nowIso() {
    return new Date().toISOString();
}

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

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function ensureAuthMeta(state) {
    if (!state.meta || typeof state.meta !== 'object') state.meta = {};
    if (!Array.isArray(state.meta.password_reset_tokens)) state.meta.password_reset_tokens = [];
    if (!Array.isArray(state.meta.password_reset_challenges)) state.meta.password_reset_challenges = [];
    if (!Array.isArray(state.meta.security_flags)) state.meta.security_flags = [];
    return state.meta;
}

function pruneAuthMeta(meta) {
    const now = Date.now();
    meta.password_reset_tokens = safeArray(meta.password_reset_tokens).filter((entry) => !entry.used_at && new Date(entry.expires_at).getTime() > now);
    meta.password_reset_challenges = safeArray(meta.password_reset_challenges).filter((entry) => new Date(entry.expires_at).getTime() > now);
    meta.security_flags = safeArray(meta.security_flags).slice(-250);
}

function markSessionAuthenticated(req) {
    if (!req || !req.session) return;
    req.session.auth_issued_at = nowIso();
}

function createSecurityFlag(state, payload = {}) {
    const meta = ensureAuthMeta(state);
    pruneAuthMeta(meta);
    const nextId = meta.security_flags.reduce((best, entry) => Math.max(best, Number(entry.id) || 0), 0) + 1;
    const row = {
        id: nextId,
        type: payload.type || 'security_event',
        severity: payload.severity || 'warning',
        user_id: Number(payload.user_id || 0) || null,
        username: payload.username || '',
        message: payload.message || '',
        ip: payload.ip || '',
        related_user_ids: safeArray(payload.related_user_ids).map((value) => Number(value)).filter(Boolean),
        created_at: nowIso(),
        meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : {}
    };
    meta.security_flags.unshift(row);
    meta.security_flags = meta.security_flags.slice(0, 250);
    return row;
}

function detectBanEvasion(state, user, req, context = 'login') {
    if (!user) return null;
    const ip = getClientIp(req);
    if (!ip || ip === '0.0.0.0') return null;
    const users = safeArray(state.tables?.users);
    const matches = users.filter((entry) => {
        if (Number(entry.id) === Number(user.id)) return false;
        if (String(entry.account_status || 'active').toLowerCase() !== 'suspended') return false;
        const ips = new Set([
            entry.signup_ip,
            entry.created_ip,
            entry.last_login_ip,
            ...safeArray(entry.known_ips)
        ].map((value) => normalizeText(value)).filter(Boolean));
        return ips.has(ip);
    });
    if (!matches.length) return null;

    const flag = createSecurityFlag(state, {
        type: 'ban_evasion',
        severity: 'high',
        user_id: user.id,
        username: user.username,
        ip,
        related_user_ids: matches.map((entry) => entry.id),
        message: `${user.username} matched a suspended account IP during ${context}.`,
        meta: {
            context,
            related_users: matches.map((entry) => ({ id: entry.id, username: entry.username, site_role: entry.site_role || 'player' }))
        }
    });
    user.suspected_ban_evasion = 1;
    user.suspected_ban_evasion_at = nowIso();
    user.suspected_ban_evasion_ip = ip;
    try {
        notifications.create(getOwnerUserId(), {
            type: 'security_flag',
            title: 'Ban evasion flagged',
            message: `${user.username} matched the IP of a suspended account during ${context}.`,
            link: '/admin/security',
            meta: { security_flag_id: flag.id, type: 'ban_evasion', user_id: user.id, ip }
        });
    } catch (error) {
        console.error('Security notification error:', error);
    }
    return flag;
}

function getClientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const raw = forwarded || req.ip || req.socket?.remoteAddress || '';
    return String(raw).replace(/^::ffff:/, '').slice(0, 64) || '0.0.0.0';
}

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
        hide_inventory: Boolean(Number(user.hide_inventory || 0)),
        offline_roll_enabled: Boolean(Number(user.offline_roll_enabled || 0)),
        offline_roll_last_at: user.offline_roll_last_at || null,
        offline_roll_total_earned: Number(user.offline_roll_total_earned || 0),
        account_status: user.account_status || 'active',
        signup_ip: user.signup_ip || null,
        site_role: getUserSiteRole(user),
        is_owner: isOwnerUserId(user.id),
        is_co_owner: getUserSiteRole(user) === 'co_owner',
        is_admin: hasAdminAccess(user),
        progression: buildProgressionPayload(user),
        pity: buildPityPayload(user)
    };
}

function attachUserSecurityMeta(user, req) {
    if (!user) return;
    const ip = getClientIp(req);
    if (!user.signup_ip) user.signup_ip = ip;
    if (!user.created_ip) user.created_ip = user.signup_ip;
    user.last_login_ip = ip;
    user.last_login_at = nowIso();
    user.known_ips = safeArray(user.known_ips);
    if (ip && !user.known_ips.includes(ip)) {
        user.known_ips.push(ip);
        user.known_ips = user.known_ips.slice(-12);
    }
}

function findUserByIdentifier(identifier) {
    const value = normalizeText(identifier);
    if (!value) return null;
    const byId = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(value, value);
    return byId ? db.prepare('SELECT * FROM users WHERE id = ?').get(byId.id) : null;
}

function getLastRollAnswer(userId) {
    const state = readState();
    const openings = safeArray(state.tables?.openings)
        .filter((row) => Number(row.user_id) === Number(userId))
        .sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || '')));
    const last = openings[0];
    return last ? normalizeText(last.pokemon_name).toLowerCase() : '';
}

function createRecoveryChallenge(state, user, req) {
    const meta = ensureAuthMeta(state);
    pruneAuthMeta(meta);
    const currentIp = getClientIp(req);
    const knownIps = safeArray(user.known_ips);
    const isNewLocation = currentIp && !knownIps.includes(currentIp);
    const a = Math.floor(Math.random() * 7) + 2;
    const b = Math.floor(Math.random() * 7) + 2;
    const requestId = crypto.randomBytes(12).toString('hex');
    const lastRollAnswer = getLastRollAnswer(user.id);
    const challenge = {
        request_id: requestId,
        user_id: user.id,
        identifier: normalizeText(req.body?.identifier || req.query?.identifier || user.username),
        created_at: nowIso(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        ip: currentIp,
        is_new_location: isNewLocation,
        captcha_prompt: isNewLocation ? `${a} + ${b}` : '',
        captcha_answer: isNewLocation ? String(a + b) : '',
        requires_last_roll: Boolean(lastRollAnswer),
        last_roll_answer: lastRollAnswer
    };
    meta.password_reset_challenges.push(challenge);
    return challenge;
}

function createResetToken(state, userId, { actor = 'self-service', kind = 'recovery', otp = '' } = {}) {
    const meta = ensureAuthMeta(state);
    pruneAuthMeta(meta);
    const token = crypto.randomBytes(24).toString('hex');
    const entry = {
        token,
        otp: otp || crypto.randomBytes(4).toString('hex').toUpperCase(),
        user_id: Number(userId),
        actor,
        kind,
        created_at: nowIso(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        used_at: null
    };
    meta.password_reset_tokens.push(entry);
    return entry;
}

router.get('/availability/username', (req, res) => {
    try {
        const username = normalizeText(req.query.username || '');
        if (!username) {
            return res.json({ available: false, valid: false, message: 'Enter a username' });
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.json({ available: false, valid: false, message: 'Use 3–20 letters, numbers, or underscores' });
        }
        const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('', username);
        res.json({
            available: !existing,
            valid: true,
            message: existing ? 'That username is already taken' : 'Username is available'
        });
    } catch (error) {
        console.error('Username availability error:', error);
        res.status(500).json({ error: 'Could not check username right now' });
    }
});

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
        markSessionAuthenticated(req);

        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            result.lastInsertRowid,
            'bonus',
            100.00,
            'Welcome bonus'
        );

        const state = readState();
        const users = safeArray(state.tables?.users);
        const createdUserRow = users.find((row) => Number(row.id) === Number(result.lastInsertRowid));
        if (createdUserRow) {
            attachUserSecurityMeta(createdUserRow, req);
            detectBanEvasion(state, createdUserRow, req, 'register');
            writeState(state);
        }

        const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        res.json({ success: true, user: buildUserPayload(createdUser) });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const password = req.body?.password;
        const loginMethod = String(req.body?.loginMethod || '').toLowerCase() === 'username' ? 'username' : 'email';
        const rawIdentifier = String(
            req.body?.identifier
            || (loginMethod === 'username' ? req.body?.username : req.body?.email)
            || req.body?.email
            || req.body?.username
            || ''
        ).trim();

        if (!rawIdentifier || !password) {
            return res.status(400).json({ error: `${loginMethod === 'username' ? 'Username' : 'Email'} and password are required` });
        }

        let user = null;
        if (loginMethod === 'username') {
            const usernameId = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get('', rawIdentifier);
            user = usernameId ? db.prepare('SELECT * FROM users WHERE id = ?').get(usernameId.id) : null;
        } else {
            user = db.prepare('SELECT * FROM users WHERE email = ?').get(rawIdentifier);
        }

        if (!user) {
            return res.status(401).json({ error: `Invalid ${loginMethod === 'username' ? 'username' : 'email'} or password` });
        }
        if (String(user.account_status || 'active').toLowerCase() === 'suspended') {
            return res.status(403).json({ error: 'This account is suspended' });
        }

        const validPassword = await verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: `Invalid ${loginMethod === 'username' ? 'username' : 'email'} or password` });
        }

        req.session.userId = user.id;
        markSessionAuthenticated(req);
        const state = readState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(user.id));
        if (userRow) {
            attachUserSecurityMeta(userRow, req);
            detectBanEvasion(state, userRow, req, 'login');
            writeState(state);
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) || user;
        }
        res.json({ success: true, user: buildUserPayload(user) });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/forgot-password/start', (req, res) => {
    try {
        const identifier = normalizeText(req.body.identifier || '');
        if (!identifier) return res.status(400).json({ error: 'Enter your username or email' });
        const user = findUserByIdentifier(identifier);
        if (!user) return res.status(404).json({ error: 'Account not found' });

        const state = readState();
        const challenge = createRecoveryChallenge(state, user, req);
        writeState(state);
        res.json({
            success: true,
            request_id: challenge.request_id,
            requires_captcha: Boolean(challenge.captcha_prompt),
            captcha_prompt: challenge.captcha_prompt || '',
            requires_last_roll: Boolean(challenge.requires_last_roll),
            question: challenge.requires_last_roll ? 'What was your most recent roll? Enter the Pokémon name exactly.' : '',
            is_new_location: Boolean(challenge.is_new_location)
        });
    } catch (error) {
        console.error('Forgot password start error:', error);
        res.status(500).json({ error: 'Could not start recovery right now' });
    }
});

router.post('/forgot-password/verify', (req, res) => {
    try {
        const requestId = normalizeText(req.body.request_id || '');
        const captchaAnswer = normalizeText(req.body.captcha_answer || '');
        const securityAnswer = normalizeText(req.body.security_answer || '').toLowerCase();
        const state = readState();
        const meta = ensureAuthMeta(state);
        pruneAuthMeta(meta);
        const challenge = safeArray(meta.password_reset_challenges).find((entry) => entry.request_id === requestId);
        if (!challenge) return res.status(404).json({ error: 'Recovery session expired. Start again.' });

        if (challenge.captcha_prompt && captchaAnswer !== String(challenge.captcha_answer)) {
            return res.status(400).json({ error: 'Captcha answer was incorrect' });
        }
        if (challenge.requires_last_roll && securityAnswer !== String(challenge.last_roll_answer || '').toLowerCase()) {
            return res.status(400).json({ error: 'Security answer did not match your latest roll' });
        }

        const token = createResetToken(state, challenge.user_id, { actor: 'self-service', kind: 'forgot-password' });
        meta.password_reset_challenges = safeArray(meta.password_reset_challenges).filter((entry) => entry.request_id !== requestId);
        writeState(state);
        res.json({
            success: true,
            token: token.token,
            reset_url: `/reset-password?token=${encodeURIComponent(token.token)}`,
            expires_at: token.expires_at
        });
    } catch (error) {
        console.error('Forgot password verify error:', error);
        res.status(500).json({ error: 'Could not verify recovery right now' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const tokenInput = normalizeText(req.body.token || '');
        const otpInput = normalizeText(req.body.otp || '').toUpperCase();
        const identifier = normalizeText(req.body.identifier || '');
        const password = String(req.body.password || '');
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const state = readState();
        const meta = ensureAuthMeta(state);
        pruneAuthMeta(meta);
        let tokenRow = null;
        if (tokenInput) {
            tokenRow = safeArray(meta.password_reset_tokens).find((entry) => entry.token === tokenInput);
        }
        if (!tokenRow && otpInput && identifier) {
            const user = findUserByIdentifier(identifier);
            tokenRow = user
                ? safeArray(meta.password_reset_tokens).find((entry) => Number(entry.user_id) === Number(user.id) && String(entry.otp || '').toUpperCase() === otpInput)
                : null;
        }
        if (!tokenRow) return res.status(404).json({ error: 'Reset token or OTP is invalid or expired' });

        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(tokenRow.user_id));
        if (!userRow) return res.status(404).json({ error: 'User not found' });

        userRow.password_hash = await hashPassword(password);
        attachUserSecurityMeta(userRow, req);
        tokenRow.used_at = nowIso();
        meta.password_reset_tokens = safeArray(meta.password_reset_tokens).filter((entry) => entry.token !== tokenRow.token);
        writeState(state);
        res.json({ success: true });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Could not reset your password' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

router.get('/me', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.json({ user: null });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
        return res.json({ user: null });
    }

    const accountStatus = String(user.account_status || 'active').toLowerCase();
    const forceLogoutAt = user.force_logout_at ? new Date(user.force_logout_at).getTime() : NaN;
    const sessionIssuedAt = req.session.auth_issued_at ? new Date(req.session.auth_issued_at).getTime() : NaN;
    const shouldForceLogout = Number.isFinite(forceLogoutAt) && (!Number.isFinite(sessionIssuedAt) || forceLogoutAt >= sessionIssuedAt);

    if (accountStatus === 'suspended' || shouldForceLogout) {
        return req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.status(403).json({
                error: accountStatus === 'suspended' ? 'This account is suspended' : 'Your session was ended by staff',
                reason: accountStatus === 'suspended' ? 'suspended' : 'forced_logout'
            });
        });
    }

    res.json({ user: buildUserPayload(user) });
});

module.exports = router;
