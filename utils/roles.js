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
    isAdminUserId
};
