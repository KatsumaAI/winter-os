const fs = require('fs');
const path = require('path');

let loaded = false;

function parseEnvValue(value = '') {
    const trimmed = String(value).trim();
    if (!trimmed) return '';
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).replace(/\\n/g, '\n');
    }
    return trimmed;
}

function loadEnv(filePath = path.join(__dirname, '..', '.env')) {
    if (loaded) return process.env;
    loaded = true;
    try {
        if (!fs.existsSync(filePath)) return process.env;
        const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        for (const rawLine of lines) {
            const line = String(rawLine || '').trim();
            if (!line || line.startsWith('#')) continue;
            const cleaned = line.startsWith('export ') ? line.slice(7) : line;
            const match = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
            if (!match) continue;
            const key = match[1];
            if (process.env[key] !== undefined && process.env[key] !== '') continue;
            process.env[key] = parseEnvValue(match[2]);
        }
    } catch (error) {
        console.warn('Failed to load .env file:', error.message || error);
    }
    return process.env;
}


function getOwnerUserId() {
    const parsed = Number(process.env.KATSU_OWNER_USER_ID || 1);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeSiteRole(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
    if (normalized === 'coowner') return 'co_owner';
    if (['owner', 'co_owner', 'admin'].includes(normalized)) return normalized;
    return 'player';
}

function isOwnerUserId(userId) {
    return Number(userId) === getOwnerUserId();
}

function getUserSiteRole(user) {
    if (!user) return 'player';
    if (isOwnerUserId(user.id)) return 'owner';
    return normalizeSiteRole(user.site_role || user.staff_role || 'player');
}

function hasAdminAccess(user) {
    const role = getUserSiteRole(user);
    return role === 'owner' || role === 'co_owner' || role === 'admin';
}

function isAdminUserId(userId) {
    return isOwnerUserId(userId);
}

module.exports = {
    getOwnerUserId,
    normalizeSiteRole,
    isOwnerUserId,
    getUserSiteRole,
    hasAdminAccess,
    isAdminUserId,
    loadEnv 
};
