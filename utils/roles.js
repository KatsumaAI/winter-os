function getOwnerUserId() {
    const parsed = Number(process.env.KATSU_OWNER_USER_ID || 1);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function isAdminUserId(userId) {
    return Number(userId) === getOwnerUserId();
}

module.exports = {
    getOwnerUserId,
    isAdminUserId
};
