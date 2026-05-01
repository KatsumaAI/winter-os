const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const router = express.Router();
const { db, notifications } = require('../database');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { isAdminUserId, getOwnerUserId, hasAdminAccess, isOwnerUserId, getUserSiteRole, normalizeSiteRole } = require('../utils/roles');
const { loadConfig: loadGistBackupConfig, saveConfig: saveGistBackupConfig, getStatus: getGistBackupStatus, listVersions: listGistBackupVersions, backupNow: runGistBackupNow, restoreNow: runGistRestoreNow } = require('../utils/gitBackup');

const dataDir = path.join(__dirname, '..', 'data');
const appDataPath = path.join(dataDir, 'katsucases.json');
const replayDataPath = path.join(dataDir, 'replays.json');
const caseVsDataPath = path.join(dataDir, 'casevs.json');
const communityDataPath = path.join(dataDir, 'community.json');
const claimPagePath = path.join(__dirname, '..', 'views', 'claim.html');

const activeCaseVsJobs = new Set();

const RARITY_SCORE = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    mythical: 6
};

const RARITY_VALUE_MULTIPLIER = {
    common: 0.65,
    uncommon: 0.95,
    rare: 1.8,
    epic: 3.2,
    legendary: 6.8,
    mythical: 15
};

const BADGE_META = {
    owner: { label: 'OWNER', className: 'badge-legendary badge-animated-glow' },
    vip: { label: 'VIP', className: 'badge-epic' },
    beta: { label: 'BETA', className: 'badge-rare' },
    'beta tester': { label: 'BETA', className: 'badge-rare' },
    moderator: { label: 'MOD', className: 'badge-uncommon' },
    creator: { label: 'CREATOR', className: 'badge-mythical badge-animated-glow' },
    verified: { label: 'VERIFIED', className: 'badge-verified badge-animated-sheen' },
    staff: { label: 'STAFF', className: 'badge-staff badge-animated-glow' },
    partner: { label: 'PARTNER', className: 'badge-partner badge-animated-sheen' },
    helper: { label: 'HELPER', className: 'badge-helper' },
    artist: { label: 'ARTIST', className: 'badge-artist' }
};

const SYSTEM_IDENTITY = {
    username: 'KatsuCases',
    display_name: 'System',
    avatar_url: 'https://i.pinimg.com/736x/80/6c/2b/806c2b66dcd1c9a559a40083ef301fa6.jpg',
    region: '',
    pronouns: '',
    custom_role: '',
    badges: []
};

const POKEMON_CACHE = { fetchedAt: 0, names: [] };
const POKEMON_CACHE_TTL = 1000 * 60 * 60 * 12;


const PITY_RULES = [
    { key: 'rare', label: 'Rare+', score: 3, threshold: 5, softStart: 3, icon: 'ri-vip-diamond-line' },
    { key: 'epic', label: 'Epic+', score: 4, threshold: 12, softStart: 8, icon: 'ri-flashlight-line' },
    { key: 'legendary', label: 'Legendary+', score: 5, threshold: 35, softStart: 24, icon: 'ri-fire-line' },
    { key: 'mythical', label: 'Mythical', score: 6, threshold: 90, softStart: 60, icon: 'ri-sparkling-2-line' }
];

const PITY_RULE_MAP = Object.fromEntries(PITY_RULES.map((rule) => [rule.key, rule]));


const DAILY_MISSIONS = [
    { key: 'open_three', label: 'Open 3 Cases', icon: 'ri-box-3-line', metric: 'daily_case_opens', goal: 3, credits: 18, free_rolls: 1, xp: 35, description: 'Keep your streak hot by opening three cases today.' },
    { key: 'chat_five', label: 'Send 5 Chat Messages', icon: 'ri-chat-3-line', metric: 'daily_chat_messages', goal: 5, credits: 10, free_rolls: 0, xp: 20, description: 'Stay active in the community channel.' },
    { key: 'trade_one', label: 'Send 1 Trade Request', icon: 'ri-exchange-dollar-line', metric: 'daily_trades_sent', goal: 1, credits: 14, free_rolls: 0, xp: 25, description: 'Make at least one trade offer today.' }
];

function getDayKey(value = Date.now()) {
    return new Date(value).toISOString().slice(0, 10);
}

function getYesterdayDayKey() {
    return getDayKey(Date.now() - 24 * 60 * 60 * 1000);
}

function xpRequiredForLevel(level) {
    return 100 + Math.max(0, Number(level || 1) - 1) * 75;
}

function getProgressionSummary(user) {
    const totalXp = Math.max(0, Number(user?.total_xp || 0));
    let level = 1;
    let spent = 0;
    while (spent + xpRequiredForLevel(level) <= totalXp) {
        spent += xpRequiredForLevel(level);
        level += 1;
        if (level > 500) break;
    }
    const xpIntoLevel = totalXp - spent;
    const xpForNextLevel = xpRequiredForLevel(level);
    return {
        total_xp: totalXp,
        level,
        xp_into_level: xpIntoLevel,
        xp_for_next_level: xpForNextLevel,
        progress_percent: Math.max(0, Math.min(100, Math.round((xpIntoLevel / Math.max(1, xpForNextLevel)) * 100)))
    };
}

function ensureUserFeatureDefaults(user) {
    if (!user) return user;
    if (user.total_xp === undefined) user.total_xp = 0;
    if (user.daily_claim_streak === undefined) user.daily_claim_streak = 0;
    if (user.daily_last_claim_at === undefined) user.daily_last_claim_at = null;
    if (user.daily_cycle_day === undefined) user.daily_cycle_day = null;
    if (user.daily_case_opens === undefined) user.daily_case_opens = 0;
    if (user.daily_chat_messages === undefined) user.daily_chat_messages = 0;
    if (user.daily_trades_sent === undefined) user.daily_trades_sent = 0;
    if (!user.daily_mission_claims || typeof user.daily_mission_claims !== 'object' || Array.isArray(user.daily_mission_claims)) user.daily_mission_claims = {};
    if (!Array.isArray(user.favorite_case_ids)) user.favorite_case_ids = [];
    if (user.daily_claim_total === undefined) user.daily_claim_total = 0;
    return user;
}

function syncUserDailyState(user, targetDay = getDayKey()) {
    if (!user) return false;
    ensureUserFeatureDefaults(user);
    const currentDay = String(user.daily_cycle_day || '');
    if (currentDay === targetDay) return false;
    user.daily_cycle_day = targetDay;
    user.daily_case_opens = 0;
    user.daily_chat_messages = 0;
    user.daily_trades_sent = 0;
    user.daily_mission_claims = {};
    return true;
}

function awardUserBonuses(user, { credits = 0, freeRolls = 0, xp = 0 } = {}) {
    if (!user) return;
    ensureUserFeatureDefaults(user);
    const creditAmount = Number(credits || 0);
    const freeRollAmount = Math.max(0, parseInt(freeRolls, 10) || 0);
    const xpAmount = Math.max(0, parseInt(xp, 10) || 0);
    if (creditAmount) {
        user.balance = Number(user.balance || 0) + creditAmount;
        user.total_earned = Number(user.total_earned || 0) + creditAmount;
    }
    if (freeRollAmount) {
        user.free_rolls = Number(user.free_rolls || 0) + freeRollAmount;
    }
    if (xpAmount) {
        user.total_xp = Number(user.total_xp || 0) + xpAmount;
    }
}

function getMissionProgress(user, mission) {
    const progress = Math.max(0, Number(user?.[mission.metric] || 0));
    const claimed = Boolean(user?.daily_mission_claims?.[mission.key]);
    return {
        key: mission.key,
        label: mission.label,
        icon: mission.icon,
        description: mission.description,
        metric: mission.metric,
        goal: mission.goal,
        progress,
        remaining: Math.max(0, mission.goal - progress),
        claimed,
        status: claimed ? 'claimed' : (progress >= mission.goal ? 'ready' : 'tracking'),
        progress_percent: Math.max(0, Math.min(100, Math.round((Math.min(progress, mission.goal) / Math.max(1, mission.goal)) * 100))),
        rewards: {
            credits: Number(mission.credits || 0),
            free_rolls: Number(mission.free_rolls || 0),
            xp: Number(mission.xp || 0)
        }
    };
}

function getDailyRewardSummary(user) {
    ensureUserFeatureDefaults(user);
    const today = getDayKey();
    const yesterday = getYesterdayDayKey();
    const lastClaimDay = user?.daily_last_claim_at ? getDayKey(user.daily_last_claim_at) : null;
    const claimedToday = lastClaimDay === today;
    const currentStreak = claimedToday
        ? Math.max(1, Number(user.daily_claim_streak || 0))
        : (lastClaimDay === yesterday ? Math.max(0, Number(user.daily_claim_streak || 0)) : 0);
    const previewStreak = claimedToday ? currentStreak : Math.max(1, currentStreak + 1);
    const rewardCredits = 12 + Math.min(previewStreak - 1, 6) * 3;
    const rewardFreeRolls = previewStreak % 3 === 0 ? 1 : 0;
    return {
        claimed_today: claimedToday,
        streak: currentStreak,
        next_claim_streak: previewStreak,
        reward_preview: {
            credits: rewardCredits,
            free_rolls: rewardFreeRolls,
            xp: 20
        },
        total_claims: Number(user?.daily_claim_total || 0),
        last_claim_at: user?.daily_last_claim_at || null
    };
}

function buildFeatureBundleForUser(user) {
    ensureUserFeatureDefaults(user);
    syncUserDailyState(user);
    return {
        progression: getProgressionSummary(user),
        daily: getDailyRewardSummary(user),
        missions: DAILY_MISSIONS.map((mission) => getMissionProgress(user, mission)),
        favorite_case_ids: safeArray(user.favorite_case_ids).map((value) => Number(value)).filter(Boolean)
    };
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function wantsHtmlResponse(req) {
    const accept = String(req.headers.accept || '').toLowerCase();
    return accept.includes('text/html') && !accept.includes('application/json');
}

function ensureSecurityFlags(state) {
    if (!state.meta || typeof state.meta !== 'object') state.meta = {};
    if (!Array.isArray(state.meta.security_flags)) state.meta.security_flags = [];
    return state.meta.security_flags;
}

function listBanEvasionFlags(state, limit = 30) {
    return ensureSecurityFlags(state)
        .filter((entry) => String(entry.type || '').toLowerCase() === 'ban_evasion')
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, limit)
        .map((entry) => ({
            ...entry,
            user: entry.user_id ? getUserById(entry.user_id) : null,
            related_users: safeArray(entry.related_user_ids).map((userId) => getUserById(userId)).filter(Boolean).map((user) => ({
                id: user.id,
                username: user.username,
                display_name: getUserDisplayName(user),
                site_role: getUserSiteRole(user),
                account_status: user.account_status || 'active'
            }))
        }));
}

function normalizeBadgeKey(value) {
    return normalizeText(value).toLowerCase();
}

function slugifyPokemonName(value) {
    return String(value || 'pokemon')
        .toLowerCase()
        .replace(/['’.]/g, '')
        .replace(/♀/g, 'f')
        .replace(/♂/g, 'm')
        .replace(/[^a-z0-9]+/g, '');
}

function getBasePokemonName(value) {
    return String(value || 'pokemon').toLowerCase().split('-')[0].replace(/[^a-z0-9]+/g, '') || 'pokemon';
}


function getPityFieldName(key) {
    return `pity_${String(key || '').toLowerCase()}_streak`;
}

function normalizePityState(source = {}) {
    const state = {};
    PITY_RULES.forEach((rule) => {
        const field = getPityFieldName(rule.key);
        state[rule.key] = Math.max(0, parseInt(source[rule.key] ?? source[field] ?? 0, 10) || 0);
    });
    return state;
}

function getUserPityState(user) {
    return normalizePityState(user || {});
}

function saveUserPityState(userRow, pityState) {
    if (!userRow) return;
    const nextState = normalizePityState(pityState);
    PITY_RULES.forEach((rule) => {
        userRow[getPityFieldName(rule.key)] = nextState[rule.key];
    });
}

function persistUserPityState(userId, pityState) {
    const state = readAppState();
    const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(userId));
    if (!userRow) return null;
    saveUserPityState(userRow, pityState);
    writeJson(appDataPath, state);
    return userRow;
}

function getAvailablePityRules(contents) {
    const maxScore = safeArray(contents).reduce((best, item) => Math.max(best, Number(RARITY_SCORE[item?.rarity] || 0)), 0);
    return PITY_RULES.filter((rule) => maxScore >= rule.score);
}

function getPityCandidates(contents, targetKey) {
    const enriched = safeArray(contents).map((item) => enrichCaseContent(item));
    if (!enriched.length) return { candidates: [], resolvedRule: null };
    const requestedRule = PITY_RULE_MAP[targetKey] || null;
    if (!requestedRule) return { candidates: enriched, resolvedRule: null };
    const exact = enriched.filter((item) => Number(RARITY_SCORE[item.rarity] || 0) >= requestedRule.score);
    if (exact.length) {
        return { candidates: exact, resolvedRule: requestedRule };
    }
    const bestScore = enriched.reduce((best, item) => Math.max(best, Number(RARITY_SCORE[item.rarity] || 0)), 0);
    const fallbackRule = PITY_RULES.filter((rule) => bestScore >= rule.score).slice(-1)[0] || null;
    return {
        candidates: enriched.filter((item) => Number(RARITY_SCORE[item.rarity] || 0) >= bestScore),
        resolvedRule: fallbackRule
    };
}

function getPityRollPlan(pityState, contents) {
    const normalized = normalizePityState(pityState);
    const availableRules = getAvailablePityRules(contents);
    let hardRule = null;
    let softRule = null;
    let softMultiplier = 1;

    for (const rule of availableRules) {
        const progress = normalized[rule.key] || 0;
        if (progress >= rule.threshold - 1) {
            hardRule = rule;
        } else if (progress >= rule.softStart) {
            softRule = rule;
        }
    }

    if (softRule && !hardRule) {
        const span = Math.max(1, softRule.threshold - softRule.softStart);
        const phase = Math.min(1, Math.max(0, ((normalized[softRule.key] || 0) - softRule.softStart + 1) / span));
        softMultiplier = Number((1 + phase * (softRule.key === 'mythical' ? 10 : softRule.key === 'legendary' ? 6 : softRule.key === 'epic' ? 4 : 2.4)).toFixed(3));
    }

    const hardPool = hardRule ? getPityCandidates(contents, hardRule.key) : { candidates: [], resolvedRule: null };
    const resolvedHardRule = hardRule ? (hardPool.resolvedRule || hardRule) : null;

    return {
        hardRule: resolvedHardRule,
        hardCandidates: hardPool.candidates,
        softRule,
        softMultiplier,
        availableRules,
        state: normalized
    };
}

function buildPitySnapshot(pityState, contents) {
    const state = normalizePityState(pityState);
    const availableRules = getAvailablePityRules(contents);
    const meters = availableRules.map((rule) => {
        const progress = state[rule.key] || 0;
        const remaining = Math.max(0, rule.threshold - progress);
        const isPrimed = progress >= rule.threshold - 1;
        const isSoft = progress >= rule.softStart && !isPrimed;
        return {
            key: rule.key,
            label: rule.label,
            icon: rule.icon,
            threshold: rule.threshold,
            soft_start: rule.softStart,
            progress,
            remaining,
            progress_percent: Math.max(0, Math.min(100, Math.round((Math.min(progress, rule.threshold - 1) / Math.max(1, rule.threshold - 1)) * 100))),
            status: isPrimed ? 'primed' : (isSoft ? 'soft' : 'tracking')
        };
    });
    const nextPrimed = meters.filter((meter) => meter.status === 'primed').slice(-1)[0] || null;
    const nextClosest = meters.slice().sort((a, b) => a.remaining - b.remaining || b.progress - a.progress)[0] || null;
    return {
        enabled: meters.length > 0,
        meters,
        spotlight: nextPrimed || nextClosest || null
    };
}

function applyPityStateResult(pityState, rarity) {
    const nextState = normalizePityState(pityState);
    const rarityScore = Number(RARITY_SCORE[rarity] || 0);
    PITY_RULES.forEach((rule) => {
        if (rarityScore >= rule.score) {
            nextState[rule.key] = 0;
        } else {
            nextState[rule.key] = Math.max(0, Number(nextState[rule.key] || 0)) + 1;
        }
    });
    return nextState;
}

function getPitySummaryForUser(user, contents = null) {
    const state = getUserPityState(user);
    if (contents) {
        return buildPitySnapshot(state, contents);
    }
    return {
        enabled: true,
        meters: PITY_RULES.map((rule) => ({
            key: rule.key,
            label: rule.label,
            icon: rule.icon,
            threshold: rule.threshold,
            soft_start: rule.softStart,
            progress: state[rule.key] || 0,
            remaining: Math.max(0, rule.threshold - (state[rule.key] || 0)),
            progress_percent: Math.max(0, Math.min(100, Math.round((Math.min(state[rule.key] || 0, rule.threshold - 1) / Math.max(1, rule.threshold - 1)) * 100))),
            status: (state[rule.key] || 0) >= rule.threshold - 1 ? 'primed' : ((state[rule.key] || 0) >= rule.softStart ? 'soft' : 'tracking')
        })),
        spotlight: null
    };
}

function buildSpriteUrl(pokemonName, spriteUrl = '') {
    if (spriteUrl && typeof spriteUrl === 'string') {
        let normalized = spriteUrl.replace('/sprites/ani-shiny/', '/sprites/ani/');
        normalized = normalized.replace(/-shiny(?=\.gif(?:\?|$))/, '');
        if (normalized.includes('/sprites/ani/')) {
            return normalized;
        }
    }
    const slug = slugifyPokemonName(pokemonName);
    const base = getBasePokemonName(pokemonName);
    return `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif#fallback=${base}`;
}

function getCaseContentIdentity(item = {}) {
    return `${normalizeText(item.pokemon_name).toLowerCase()}::${normalizeText(item.pokemon_form || '').toLowerCase()}::${Number(item.is_shiny || 0)}`;
}

function dedupeCaseContents(contents = []) {
    const seen = new Set();
    return safeArray(contents).filter((item) => {
        const key = getCaseContentIdentity(item);
        if (!normalizeText(item?.pokemon_name) || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getItemWeight(item) {
    const odds = Math.max(Number(item?.odds || 1), 1);
    return 1 / odds;
}

function getCasePrice(caseId, fallback = 4.99) {
    const row = getTable('cases').find((entry) => Number(entry.id) === Number(caseId));
    return Number(row?.price || fallback || 4.99);
}

function computeEstimatedValue({ odds = 100, rarity = 'common', is_shiny = 0, casePrice = 4.99 }) {
    const rarityMultiplier = Number(RARITY_VALUE_MULTIPLIER[rarity] || 1);
    const logFactor = Math.pow(Math.log10(Math.max(Number(odds || 1), 1)) + 1.15, 2);
    const shinyMultiplier = Number(is_shiny) ? 1.18 : 1;
    const value = Number(casePrice) * rarityMultiplier * logFactor * shinyMultiplier;
    return Number(Math.max(0.1, value).toFixed(2));
}

function enrichCaseContent(item, caseInfo = null) {
    if (!item) return item;
    const odds = Math.max(Number(item.odds || 1), 1);
    const price = Number(caseInfo?.price || getCasePrice(item.case_id, 4.99));
    const weight = getItemWeight(item);
    return {
        ...item,
        odds,
        weight,
        chance: weight,
        estimated_value: Number(item.estimated_value || computeEstimatedValue({ odds, rarity: item.rarity, is_shiny: item.is_shiny, casePrice: price })),
        sprite_url: buildSpriteUrl(item.pokemon_name, item.sprite_url)
    };
}

function findClosestCaseContentMeta(item, caseId = null) {
    const contents = getTable('case_contents').filter((entry) => {
        if (caseId && Number(entry.case_id) !== Number(caseId)) return false;
        return String(entry.pokemon_name || '').toLowerCase() === String(item.pokemon_name || '').toLowerCase()
            && String(entry.rarity || '').toLowerCase() === String(item.rarity || '').toLowerCase()
            && Number(entry.is_shiny || 0) === Number(item.is_shiny || 0);
    });
    if (!contents.length) return null;
    return contents.slice().sort((a, b) => Number(a.odds || 999999999) - Number(b.odds || 999999999))[0];
}

function resolveOriginalOwnerMeta(item, extra = {}) {
    const inventoryId = Number(extra.inventory_id || item.item_id || item.id || 0);
    const inventoryRow = inventoryId ? getTable('inventory').find((row) => Number(row.id) === inventoryId) : null;
    const openingRow = inventoryId ? getTable('openings').find((row) => Number(row.item_id) === inventoryId) : null;
    const originalOwnerId = Number(item.original_owner_id || inventoryRow?.original_owner_id || openingRow?.user_id || 0) || null;
    const originalOwnerUsername = item.original_owner_username
        || inventoryRow?.original_owner_username
        || openingRow?.username
        || (originalOwnerId ? getUserById(originalOwnerId)?.username : '')
        || null;
    return {
        original_owner_id: originalOwnerId,
        original_owner_username: originalOwnerUsername
    };
}

function enrichInventoryLikeItem(item, extra = {}) {
    if (!item) return item;
    const meta = findClosestCaseContentMeta(item, extra.case_id || item.case_id);
    const odds = Math.max(Number(extra.odds || item.odds || meta?.odds || 100), 1);
    const casePrice = Number(extra.case_price || getCasePrice(extra.case_id || item.case_id, 4.99));
    const ownerMeta = resolveOriginalOwnerMeta(item, extra);
    return {
        ...item,
        ...ownerMeta,
        odds,
        estimated_value: Number(item.estimated_value || computeEstimatedValue({ odds, rarity: item.rarity, is_shiny: item.is_shiny, casePrice })),
        sprite_url: buildSpriteUrl(item.pokemon_name, item.sprite_url)
    };
}

function getAllUsers() {
    return getTable('users');
}

function getUserById(userId) {
    return getAllUsers().find((row) => Number(row.id) === Number(userId)) || null;
}

function getUserByUsernameLike(identifier) {
    const needle = normalizeText(identifier).toLowerCase();
    return getAllUsers().find((row) => {
        const matchesCurrent = String(row.username || '').toLowerCase() === needle || String(row.display_name || '').toLowerCase() === needle;
        const matchesHistory = safeArray(row.username_history).some((entry) => String(entry || '').toLowerCase() === needle);
        return matchesCurrent || matchesHistory;
    }) || null;
}


const OFFLINE_ROLL_DEFAULTS = {
    interval_minutes: 120,
    cap: 24
};

const PROFILE_MEDIA_LIMITS = {
    inline_data_chars: 2_800_000,
    history_count: 12
};

const AVATAR_DECORATION_KEYS = new Set(['none', 'glow', 'crown', 'cosmic', 'verified', 'flora', 'shadow', 'crystal']);
const PROFILE_THEME_KEYS = new Set(['default', 'royal', 'ember', 'mint', 'midnight']);

function ensureUserProfileMediaDefaults(user) {
    if (!user) return user;
    if (user.banner_url === undefined) user.banner_url = null;
    if (user.profile_background_url === undefined) user.profile_background_url = null;
    if (user.avatar_decoration === undefined) user.avatar_decoration = 'none';
    if (!Array.isArray(user.avatar_history)) user.avatar_history = [];
    if (!Array.isArray(user.banner_history)) user.banner_history = [];
    if (!Array.isArray(user.profile_background_history)) user.profile_background_history = [];
    if (user.profile_status === undefined) user.profile_status = '';
    if (user.profile_bio === undefined) user.profile_bio = '';
    if (user.profile_theme === undefined) user.profile_theme = 'default';
    if (!Array.isArray(user.featured_item_ids)) user.featured_item_ids = [];
    return user;
}

function normalizeMediaValue(value, fallback = null) {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(raw)) {
        return raw.length <= PROFILE_MEDIA_LIMITS.inline_data_chars ? raw : fallback;
    }
    if (/^https?:\/\//i.test(raw)) return raw.slice(0, 3000);
    return fallback;
}

function updateMediaHistoryList(list, nextValue) {
    const current = safeArray(list).filter((entry) => typeof entry === 'string' && entry.trim());
    if (!nextValue) return current.slice(0, PROFILE_MEDIA_LIMITS.history_count);
    return [nextValue, ...current.filter((entry) => entry !== nextValue)].slice(0, PROFILE_MEDIA_LIMITS.history_count);
}

function applyUserMediaField(user, fieldKey, historyKey, nextValue) {
    ensureUserProfileMediaDefaults(user);
    const previous = normalizeMediaValue(user[fieldKey] || null, null);
    const normalizedNext = normalizeMediaValue(nextValue, previous);
    if (previous && previous !== normalizedNext) {
        user[historyKey] = updateMediaHistoryList(user[historyKey], previous);
    }
    user[fieldKey] = normalizedNext || null;
    if (user[fieldKey]) {
        user[historyKey] = updateMediaHistoryList(user[historyKey], user[fieldKey]);
    }
    return user[fieldKey];
}

function normalizeAvatarDecoration(value, fallback = 'none') {
    const key = normalizeText(value || fallback).toLowerCase();
    return AVATAR_DECORATION_KEYS.has(key) ? key : fallback;
}

function normalizeProfileTheme(value, fallback = 'default') {
    const key = normalizeText(value || fallback).toLowerCase();
    return PROFILE_THEME_KEYS.has(key) ? key : fallback;
}

function mediaHistoryPayload(user) {
    ensureUserProfileMediaDefaults(user);
    return {
        avatars: updateMediaHistoryList(user.avatar_history, user.avatar_url || null),
        banners: updateMediaHistoryList(user.banner_history, user.banner_url || null),
        backgrounds: updateMediaHistoryList(user.profile_background_history, user.profile_background_url || null)
    };
}

function ensureStateMeta(state) {
    if (!state.meta || typeof state.meta !== 'object') state.meta = {};
    if (!state.meta.nextIds || typeof state.meta.nextIds !== 'object') state.meta.nextIds = {};
    if (!state.meta.platform_config || typeof state.meta.platform_config !== 'object') state.meta.platform_config = {};
    const config = state.meta.platform_config;
    if (!Number.isFinite(Number(config.offline_roll_interval_minutes))) config.offline_roll_interval_minutes = OFFLINE_ROLL_DEFAULTS.interval_minutes;
    if (!Number.isFinite(Number(config.offline_roll_cap))) config.offline_roll_cap = OFFLINE_ROLL_DEFAULTS.cap;
    if (!Number.isFinite(Number(config.gist_backup_max_versions))) config.gist_backup_max_versions = Number(process.env.GIST_BACKUP_MAX_VERSIONS || 8) || 8;
    return config;
}

function ensureUserAccountDefaults(user) {
    if (!user) return user;
    if (user.offline_roll_enabled === undefined) user.offline_roll_enabled = 0;
    if (user.offline_roll_last_at === undefined) user.offline_roll_last_at = null;
    if (user.offline_roll_total_earned === undefined) user.offline_roll_total_earned = 0;
    if (user.account_status === undefined) user.account_status = 'active';
    if (user.account_status_reason === undefined) user.account_status_reason = '';
    if (user.account_status_expires_at === undefined) user.account_status_expires_at = null;
    if (user.account_status_set_at === undefined) user.account_status_set_at = null;
    if (user.account_status_set_by === undefined) user.account_status_set_by = null;
    if (user.hide_inventory === undefined) user.hide_inventory = 0;
    ensureUserProfileMediaDefaults(user);
    ensureUserNotificationDefaults(user);
    if (!Array.isArray(user.wishlist)) user.wishlist = [];
    if (!Array.isArray(user.market_watchlist)) user.market_watchlist = [];
    return user;
}

function ensureUserNotificationDefaults(user) {
    if (!user) return user;
    if (user.notification_trade === undefined) user.notification_trade = 1;
    if (user.notification_market === undefined) user.notification_market = 1;
    if (user.notification_support === undefined) user.notification_support = 1;
    if (user.notification_system === undefined) user.notification_system = 1;
    if (user.notification_quiet_mode === undefined) user.notification_quiet_mode = 0;
    if (!Array.isArray(user.login_history)) user.login_history = [];
    return user;
}


function ensureEngagementCollections(state) {
    if (!state.tables || typeof state.tables !== 'object') state.tables = {};
    if (!Array.isArray(state.tables.profile_guestbook)) state.tables.profile_guestbook = [];
    if (!Array.isArray(state.tables.case_reviews)) state.tables.case_reviews = [];
    return state;
}

function normalizeWishlistEntries(list = []) {
    return safeArray(list).map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const pokemonName = normalizeText(entry.pokemon_name || entry.name).toLowerCase();
        if (!pokemonName) return null;
        return {
            pokemon_name: pokemonName,
            note: normalizeText(entry.note || '').slice(0, 120),
            priority: ['low', 'medium', 'high'].includes(String(entry.priority || '').toLowerCase()) ? String(entry.priority).toLowerCase() : 'medium',
            is_public: entry.is_public === undefined ? true : Boolean(entry.is_public),
            created_at: entry.created_at || new Date().toISOString()
        };
    }).filter(Boolean).slice(0, 50);
}

function normalizeMarketWatchlist(list = []) {
    return safeArray(list).map((entry) => normalizeText(entry).toLowerCase()).filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).slice(0, 60);
}

function getAchievementCatalog() {
    return [
        { key: 'first_case', label: 'First Spark', description: 'Open your first case.', icon: 'ri-flashlight-line', test: (user, ctx) => Number(user.cases_opened || 0) >= 1 },
        { key: 'hundred_cases', label: 'Case Grinder', description: 'Open 100 cases.', icon: 'ri-box-3-line', test: (user, ctx) => Number(user.cases_opened || 0) >= 100 },
        { key: 'millionaire', label: 'High Roller', description: 'Reach a 1M balance.', icon: 'ri-coins-line', test: (user, ctx) => Number(user.balance || 0) >= 1_000_000 },
        { key: 'social_circle', label: 'Circle Link', description: 'Reach 5 friends.', icon: 'ri-group-line', test: (user, ctx) => Number(ctx.friendCount || 0) >= 5 },
        { key: 'collector', label: 'Box Keeper', description: 'Own 25 unique Pokémon.', icon: 'ri-archive-drawer-line', test: (user, ctx) => Number(ctx.collection?.totals?.unique_owned || 0) >= 25 },
        { key: 'legend_finder', label: 'Legend Hunter', description: 'Own a legendary or mythical drop.', icon: 'ri-vip-diamond-line', test: (user, ctx) => Number(ctx.bestRarityScore || 0) >= 5 },
        { key: 'trader', label: 'Link Trader', description: 'Complete 5 accepted trades.', icon: 'ri-exchange-line', test: (user, ctx) => Number(ctx.completedTrades || 0) >= 5 },
        { key: 'market_maker', label: 'Market Maker', description: 'Sell 10 marketplace listings.', icon: 'ri-store-2-line', test: (user, ctx) => Number(ctx.marketSales || 0) >= 10 },
        { key: 'mission_runner', label: 'Routine Runner', description: 'Claim 10 daily rewards.', icon: 'ri-calendar-check-line', test: (user, ctx) => Number(user.daily_claim_total || 0) >= 10 },
        { key: 'supporter', label: 'Community Voice', description: 'Post 5 guestbook messages.', icon: 'ri-chat-heart-line', test: (user, ctx) => Number(ctx.guestbookCount || 0) >= 5 }
    ];
}

function getUserAchievementSummary(userId) {
    const user = getUserById(userId);
    if (!user) return { unlocked: [], locked: [], progress: { unlocked_count: 0, total: 0, percent: 0 } };
    const state = readAppState();
    ensureEngagementCollections(state);
    ensureSocialCollections(state);
    const collection = buildCollectionSummary(userId);
    const inventory = getTable('inventory').filter((row) => Number(row.user_id) === Number(userId));
    const bestRarityScore = inventory.reduce((best, row) => Math.max(best, Number(RARITY_SCORE[String(row.rarity || '').toLowerCase()] || 0)), 0);
    const completedTrades = getTable('trades').filter((row) => String(row.status || '').toLowerCase() === 'accepted' && (Number(row.sender_id) === Number(userId) || Number(row.receiver_id) === Number(userId))).length;
    const marketSales = getTable('marketplace').filter((row) => Number(row.seller_id) === Number(userId) && String(row.status || '').toLowerCase() === 'sold').length;
    const friendCount = safeArray(state.tables?.friendships).filter((row) => String(row.status || '').toLowerCase() === 'friends' && (Number(row.user_id) === Number(userId) || Number(row.friend_id) === Number(userId))).length;
    const guestbookCount = safeArray(state.tables?.profile_guestbook).filter((row) => Number(row.author_id) === Number(userId)).length;
    const context = { collection, bestRarityScore, completedTrades, marketSales, friendCount, guestbookCount };
    const catalog = getAchievementCatalog().map((item) => ({ key: item.key, label: item.label, description: item.description, icon: item.icon, unlocked: Boolean(item.test(user, context)) }));
    const unlocked = catalog.filter((item) => item.unlocked);
    const locked = catalog.filter((item) => !item.unlocked);
    return {
        unlocked,
        locked,
        progress: {
            unlocked_count: unlocked.length,
            total: catalog.length,
            percent: Math.round((unlocked.length / Math.max(1, catalog.length)) * 100)
        }
    };
}

function buildWishlistPreview(user) {
    ensureUserAccountDefaults(user);
    return normalizeWishlistEntries(user.wishlist).filter((entry) => entry.is_public).slice(0, 6);
}

function buildGuestbookPreview(state, targetUserId, limit = 6) {
    ensureEngagementCollections(state);
    return safeArray(state.tables.profile_guestbook)
        .filter((row) => Number(row.target_user_id) === Number(targetUserId))
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, limit)
        .map((row) => ({
            ...row,
            author: row.author_id ? buildUserTagPayload(getUserById(row.author_id)) : getSystemIdentity(row)
        }));
}

function buildCaseReviewSummary(caseId, limit = 8) {
    const state = readAppState();
    ensureEngagementCollections(state);
    const rows = safeArray(state.tables.case_reviews)
        .filter((row) => Number(row.case_id) === Number(caseId))
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    const averageRating = rows.length ? Number((rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / rows.length).toFixed(1)) : 0;
    return {
        average_rating: averageRating,
        total_reviews: rows.length,
        reviews: rows.slice(0, limit).map((row) => ({ ...row, author: row.user_id ? buildUserTagPayload(getUserById(row.user_id)) : null }))
    };
}

function getLeaderboardBundle(limit = 25) {
    const users = getAllUsers().map((user) => {
        ensureUserAccountDefaults(user);
        const collection = buildCollectionSummary(user.id);
        const summary = getUserAchievementSummary(user.id);
        return {
            id: user.id,
            username: user.username,
            display_name: getUserDisplayName(user),
            avatar_url: user.avatar_url || null,
            avatar_decoration: normalizeAvatarDecoration(user.avatar_decoration || 'none'),
            badges: getUserBadges(user).map(serializeBadge),
            profile_link: getProfileLink(user),
            balance: Number(user.balance || 0),
            cases_opened: Number(user.cases_opened || 0),
            total_xp: Number(user.total_xp || 0),
            inventory_value: Number(collection.totals.est_value || 0),
            achievement_count: Number(summary.progress.unlocked_count || 0),
            collection_completion_percent: Number(collection.totals.collection_completion_percent || 0)
        };
    });
    const sortLimit = Math.max(1, Math.min(Number(limit || 25), 100));
    return {
        balance: users.slice().sort((a, b) => b.balance - a.balance).slice(0, sortLimit),
        cases: users.slice().sort((a, b) => b.cases_opened - a.cases_opened).slice(0, sortLimit),
        xp: users.slice().sort((a, b) => b.total_xp - a.total_xp).slice(0, sortLimit),
        inventory: users.slice().sort((a, b) => b.inventory_value - a.inventory_value).slice(0, sortLimit),
        achievements: users.slice().sort((a, b) => b.achievement_count - a.achievement_count).slice(0, sortLimit)
    };
}

function ensureInventoryMetaDefaults(item) {
    if (!item) return item;
    if (item.is_locked === undefined) item.is_locked = 0;
    if (item.is_favorite === undefined) item.is_favorite = 0;
    return item;
}

function ensureAuditCollections(state) {
    ensureStateMeta(state);
    if (!Array.isArray(state.meta.audit_logs)) state.meta.audit_logs = [];
    if (!Array.isArray(state.meta.reward_templates)) state.meta.reward_templates = [];
    return state.meta.audit_logs;
}

function pushAuditLog(state, actor, action, target = {}, details = {}) {
    ensureAuditCollections(state);
    const actorUser = actor && typeof actor === 'object' ? actor : null;
    const entry = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
        action: normalizeText(action).slice(0, 80),
        actor_user_id: actorUser?.id || null,
        actor_username: actorUser?.username || 'system',
        actor_role: actorUser ? getUserSiteRole(actorUser) : 'system',
        target_type: normalizeText(target.type || 'system').slice(0, 40),
        target_id: target.id ?? null,
        target_label: normalizeText(target.label || target.username || target.name || '').slice(0, 120),
        details: JSON.parse(JSON.stringify(details || {}))
    };
    state.meta.audit_logs.unshift(entry);
    state.meta.audit_logs = state.meta.audit_logs.slice(0, 600);
    return entry;
}

function getInventorySignature(item) {
    const form = normalizeText(item?.pokemon_form || '').toLowerCase();
    const shiny = Number(item?.is_shiny || 0) ? 'shiny' : 'normal';
    return `${normalizeText(item?.pokemon_name || '').toLowerCase()}::${form}::${shiny}`;
}

function buildCollectionSummary(userId) {
    const inventory = safeArray(getTable('inventory'))
        .filter((row) => Number(row.user_id) === Number(userId))
        .map((row) => ensureInventoryMetaDefaults(enrichInventoryLikeItem(row, { case_id: row.case_id, odds: row.odds })));
    const openings = safeArray(getTable('openings'))
        .filter((row) => Number(row.user_id) === Number(userId))
        .map((row) => enrichInventoryLikeItem(row, { case_id: row.case_id, odds: row.odds }));
    const groups = new Map();
    for (const item of inventory) {
        const key = getInventorySignature(item);
        const current = groups.get(key) || {
            key,
            pokemon_name: item.pokemon_name,
            pokemon_form: item.pokemon_form || null,
            is_shiny: Number(item.is_shiny || 0) ? 1 : 0,
            rarity: item.rarity,
            sprite_url: item.sprite_url,
            owned_count: 0,
            listed_count: 0,
            locked_count: 0,
            favorite_count: 0,
            best_value: 0,
            first_acquired_at: item.acquired_at || null,
            latest_acquired_at: item.acquired_at || null
        };
        current.owned_count += 1;
        current.listed_count += Number(item.is_listed || 0) ? 1 : 0;
        current.locked_count += Number(item.is_locked || 0) ? 1 : 0;
        current.favorite_count += Number(item.is_favorite || 0) ? 1 : 0;
        current.best_value = Math.max(Number(current.best_value || 0), Number(item.estimated_value || 0));
        if (!current.first_acquired_at || String(item.acquired_at || '') < String(current.first_acquired_at || '')) current.first_acquired_at = item.acquired_at || current.first_acquired_at;
        if (!current.latest_acquired_at || String(item.acquired_at || '') > String(current.latest_acquired_at || '')) current.latest_acquired_at = item.acquired_at || current.latest_acquired_at;
        groups.set(key, current);
    }
    const entries = Array.from(groups.values()).sort((a, b) => Number(b.best_value || 0) - Number(a.best_value || 0));
    const openingKeys = new Set(openings.map((item) => getInventorySignature(item)));
    const ownedKeys = new Set(entries.map((item) => item.key));
    const rarityBreakdown = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].map((rarity) => ({
        rarity,
        owned: entries.filter((item) => item.rarity === rarity).length,
        total_items: inventory.filter((item) => item.rarity === rarity).length
    }));
    return {
        totals: {
            unique_owned: entries.length,
            unique_ever_opened: openingKeys.size,
            total_items: inventory.length,
            duplicates: Math.max(0, inventory.length - entries.length),
            listed_items: inventory.filter((item) => Number(item.is_listed || 0)).length,
            locked_items: inventory.filter((item) => Number(item.is_locked || 0)).length,
            favorite_items: inventory.filter((item) => Number(item.is_favorite || 0)).length,
            est_value: Number(inventory.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2)),
            collection_completion_percent: openingKeys.size ? Math.max(0, Math.min(100, Math.round((ownedKeys.size / openingKeys.size) * 100))) : 0
        },
        rarity_breakdown: rarityBreakdown,
        entries
    };
}

function parseAccountStatusExpiresAt(value) {
    const raw = normalizeText(value);
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
}

function clearAccountStatusMetadata(user) {
    ensureUserAccountDefaults(user);
    user.account_status = 'active';
    user.account_status_reason = '';
    user.account_status_expires_at = null;
    user.account_status_set_at = null;
    user.account_status_set_by = null;
    return user;
}

function refreshExpiredAccountStatus(user) {
    ensureUserAccountDefaults(user);
    if (String(user.account_status || 'active').toLowerCase() !== 'suspended') return false;
    if (!user.account_status_expires_at) return false;
    const expiresAt = new Date(user.account_status_expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) return false;
    clearAccountStatusMetadata(user);
    return true;
}

function nextStateId(state, tableName) {
    ensureStateMeta(state);
    const rows = safeArray(state.tables?.[tableName]);
    const current = Number(state.meta.nextIds[tableName] || 0);
    if (current > 0) {
        state.meta.nextIds[tableName] = current + 1;
        return current;
    }
    const fallback = rows.reduce((max, row) => Math.max(max, Number(row?.id || 0)), 0) + 1;
    state.meta.nextIds[tableName] = fallback + 1;
    return fallback;
}

function applyOfflineRollAccrual(state, userRow) {
    ensureUserAccountDefaults(userRow);
    const platformConfig = ensureStateMeta(state);
    const intervalMinutes = Math.max(15, parseInt(platformConfig.offline_roll_interval_minutes, 10) || OFFLINE_ROLL_DEFAULTS.interval_minutes);
    const cap = Math.max(1, parseInt(platformConfig.offline_roll_cap, 10) || OFFLINE_ROLL_DEFAULTS.cap);
    const now = Date.now();
    const currentFreeRolls = Math.max(0, Number(userRow.free_rolls || 0));

    if (!Number(userRow.offline_roll_enabled)) {
        if (!userRow.offline_roll_last_at) userRow.offline_roll_last_at = new Date(now).toISOString();
        return {
            enabled: false,
            interval_minutes: intervalMinutes,
            cap,
            earned_now: 0,
            free_rolls: currentFreeRolls,
            next_roll_in_minutes: intervalMinutes
        };
    }

    if (currentFreeRolls >= cap) {
        userRow.offline_roll_last_at = new Date(now).toISOString();
        return {
            enabled: true,
            interval_minutes: intervalMinutes,
            cap,
            earned_now: 0,
            free_rolls: currentFreeRolls,
            next_roll_in_minutes: intervalMinutes
        };
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    const parsedLast = userRow.offline_roll_last_at ? new Date(userRow.offline_roll_last_at).getTime() : NaN;
    const safeLast = Number.isFinite(parsedLast) && parsedLast > 0 ? parsedLast : now;
    const elapsed = Math.max(0, now - safeLast);
    const generated = Math.floor(elapsed / intervalMs);
    const room = Math.max(0, cap - currentFreeRolls);
    const awarded = Math.max(0, Math.min(room, generated));

    if (!userRow.offline_roll_last_at) {
        userRow.offline_roll_last_at = new Date(now).toISOString();
    } else if (generated > 0) {
        userRow.offline_roll_last_at = new Date(safeLast + generated * intervalMs).toISOString();
    }

    if (awarded > 0) {
        userRow.free_rolls = currentFreeRolls + awarded;
        userRow.offline_roll_total_earned = Math.max(0, Number(userRow.offline_roll_total_earned || 0)) + awarded;
    }

    const baseForNext = userRow.offline_roll_last_at ? new Date(userRow.offline_roll_last_at).getTime() : now;
    const nextIn = userRow.free_rolls >= cap
        ? intervalMinutes
        : Math.max(1, Math.ceil((intervalMs - Math.max(0, now - baseForNext)) / 60000));

    return {
        enabled: true,
        interval_minutes: intervalMinutes,
        cap,
        earned_now: awarded,
        free_rolls: Math.max(0, Number(userRow.free_rolls || 0)),
        next_roll_in_minutes: nextIn
    };
}

function buildOfflineRollSummary(state, userRow) {
    const summary = applyOfflineRollAccrual(state, userRow);
    return {
        ...summary,
        total_earned: Math.max(0, Number(userRow.offline_roll_total_earned || 0)),
        last_tick_at: userRow.offline_roll_last_at || null
    };
}

function syncOfflineRollPresence(state, userRow, mode = 'heartbeat') {
    ensureUserAccountDefaults(userRow);
    const normalized = String(mode || 'heartbeat').toLowerCase();
    const nowIso = new Date().toISOString();

    if (!Number(userRow.offline_roll_enabled)) {
        userRow.offline_roll_last_at = nowIso;
        return buildOfflineRollSummary(state, userRow);
    }

    if (normalized === 'offline' || normalized === 'hidden' || normalized === 'pagehide') {
        userRow.offline_roll_last_at = nowIso;
        return buildOfflineRollSummary(state, userRow);
    }

    const summary = buildOfflineRollSummary(state, userRow);
    userRow.offline_roll_last_at = nowIso;
    return {
        ...summary,
        last_tick_at: userRow.offline_roll_last_at || null,
        next_roll_in_minutes: Math.max(1, Number(summary.interval_minutes || OFFLINE_ROLL_DEFAULTS.interval_minutes))
    };
}

function buildUserAccountSnapshot(state, userId, { actorId = null, reason = '', label = '' } = {}) {
    const users = safeArray(state.tables?.users);
    const userRow = users.find((row) => Number(row.id) === Number(userId));
    if (!userRow) return null;
    state.tables.account_snapshots = safeArray(state.tables.account_snapshots);
    const snapshot = {
        id: nextStateId(state, 'account_snapshots'),
        user_id: Number(userId),
        username: userRow.username,
        created_at: new Date().toISOString(),
        created_by_user_id: actorId ? Number(actorId) : null,
        reason: normalizeText(reason).slice(0, 160) || 'Manual snapshot',
        label: normalizeText(label).slice(0, 80) || 'Snapshot',
        snapshot: {
            user: JSON.parse(JSON.stringify(userRow)),
            inventory: safeArray(state.tables?.inventory).filter((row) => Number(row.user_id) === Number(userId)).map((row) => JSON.parse(JSON.stringify(row))),
            openings: safeArray(state.tables?.openings).filter((row) => Number(row.user_id) === Number(userId)).map((row) => JSON.parse(JSON.stringify(row))),
            marketplace: safeArray(state.tables?.marketplace).filter((row) => Number(row.seller_id) === Number(userId)).map((row) => JSON.parse(JSON.stringify(row))),
            transactions: safeArray(state.tables?.transactions).filter((row) => Number(row.user_id) === Number(userId)).slice(-250).map((row) => JSON.parse(JSON.stringify(row))),
            notifications: safeArray(state.tables?.notifications).filter((row) => Number(row.user_id) === Number(userId)).slice(-120).map((row) => JSON.parse(JSON.stringify(row)))
        }
    };
    state.tables.account_snapshots.unshift(snapshot);
    state.tables.account_snapshots = state.tables.account_snapshots.slice(0, 250);
    return snapshot;
}

function restoreUserAccountSnapshot(state, userId, snapshotId) {
    const snapshot = safeArray(state.tables?.account_snapshots).find((row) => Number(row.id) === Number(snapshotId) && Number(row.user_id) === Number(userId));
    if (!snapshot?.snapshot?.user) return null;
    const payload = snapshot.snapshot;
    state.tables.users = safeArray(state.tables.users).filter((row) => Number(row.id) !== Number(userId));
    state.tables.users.push(JSON.parse(JSON.stringify(payload.user)));
    state.tables.inventory = safeArray(state.tables.inventory).filter((row) => Number(row.user_id) !== Number(userId)).concat(safeArray(payload.inventory).map((row) => JSON.parse(JSON.stringify(row))));
    state.tables.openings = safeArray(state.tables.openings).filter((row) => Number(row.user_id) !== Number(userId)).concat(safeArray(payload.openings).map((row) => JSON.parse(JSON.stringify(row))));
    state.tables.marketplace = safeArray(state.tables.marketplace).filter((row) => Number(row.seller_id) !== Number(userId)).concat(safeArray(payload.marketplace).map((row) => JSON.parse(JSON.stringify(row))));
    state.tables.transactions = safeArray(state.tables.transactions).filter((row) => Number(row.user_id) !== Number(userId)).concat(safeArray(payload.transactions).map((row) => JSON.parse(JSON.stringify(row))));
    state.tables.notifications = safeArray(state.tables.notifications).filter((row) => Number(row.user_id) !== Number(userId)).concat(safeArray(payload.notifications).map((row) => JSON.parse(JSON.stringify(row))));
    return snapshot;
}

function summarizeAccountSnapshots(userId, limit = 20) {
    return safeArray(getTable('account_snapshots'))
        .filter((row) => Number(row.user_id) === Number(userId))
        .slice()
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, limit)
        .map((row) => ({
            id: row.id,
            user_id: row.user_id,
            username: row.username,
            created_at: row.created_at,
            created_by_user_id: row.created_by_user_id,
            reason: row.reason,
            label: row.label
        }));
}

function buildSupportReply(authorType, actor, message, internal = false) {
    return {
        id: Math.random().toString(36).slice(2, 10),
        created_at: new Date().toISOString(),
        author_type: authorType,
        user_id: actor?.id || null,
        username: actor?.username || (authorType === 'admin' ? 'KatsuCases' : 'User'),
        display_name: getUserDisplayName(actor) || (authorType === 'admin' ? 'Support' : 'User'),
        message: normalizeText(message).slice(0, 2000),
        internal: Boolean(internal)
    };
}

function getUserDisplayName(user) {
    return normalizeText(user?.display_name) || normalizeText(user?.username) || 'User';
}

function getUserBadges(user) {
    const badges = new Set(safeArray(user?.badges).map((entry) => normalizeBadgeKey(entry)).filter(Boolean));
    if (user && isAdminUserId(user.id)) badges.add('owner');
    if (normalizeText(user?.custom_role)) badges.add(normalizeBadgeKey(user.custom_role));
    return Array.from(badges);
}

function serializeBadge(badge) {
    const key = normalizeBadgeKey(badge);
    const meta = BADGE_META[key] || { label: normalizeText(badge).toUpperCase(), className: 'badge-common' };
    return { key, label: meta.label, className: meta.className };
}

function getSystemIdentity(overrides = {}) {
    const badges = Array.isArray(overrides.badges) ? overrides.badges : SYSTEM_IDENTITY.badges;
    return {
        ...SYSTEM_IDENTITY,
        ...overrides,
        display_name: normalizeText(overrides.display_name || SYSTEM_IDENTITY.display_name) || SYSTEM_IDENTITY.display_name,
        avatar_url: overrides.avatar_url !== undefined ? overrides.avatar_url : SYSTEM_IDENTITY.avatar_url,
        badges
    };
}

function isSystemIdentityPayload(payload = {}) {
    const username = normalizeText(payload.username || '');
    const displayName = normalizeText(payload.display_name || '');
    return !payload.user_id && (username.toLowerCase() === 'katsucases' || displayName.toLowerCase() === 'system' || payload.type === 'system');
}

function buildUserTagPayload(user) {
    return {
        display_name: getUserDisplayName(user),
        avatar_url: user?.avatar_url || null,
        region: user?.region || '',
        pronouns: user?.pronouns || '',
        custom_role: user?.custom_role || '',
        badges: getUserBadges(user).map(serializeBadge)
    };
}

function getProfileLink(user) {
    if (!user) return '/profile';
    return `/profile?user=${encodeURIComponent(user.username || user.id)}`;
}

function isCaseLive(caseInfo) {
    if (!caseInfo) return false;
    if (Number(caseInfo.is_hidden)) return false;
    const now = Date.now();
    if (caseInfo.launch_at && new Date(caseInfo.launch_at).getTime() > now) return false;
    if (caseInfo.rotation_starts_at && new Date(caseInfo.rotation_starts_at).getTime() > now) return false;
    if (caseInfo.rotation_ends_at && new Date(caseInfo.rotation_ends_at).getTime() < now) return false;
    return true;
}

function getOnlinePresenceSummary(store) {
    const presenceMap = store.presence && typeof store.presence === 'object' ? store.presence : {};
    const now = Date.now();
    const onlineUsers = Object.values(presenceMap).filter((entry) => now - Number(entry.last_seen || 0) < 45000);
    const typingUsers = onlineUsers.filter((entry) => now - Number(entry.typing_at || 0) < 5000);
    return {
        online_count: onlineUsers.length,
        typing: typingUsers.slice(0, 5)
    };
}

function touchPresence(store, user, { typing = false } = {}) {
    if (!store || !user) return;
    if (!store.presence || typeof store.presence !== 'object') store.presence = {};
    const entry = store.presence[user.id] || {};
    store.presence[user.id] = {
        user_id: user.id,
        username: user.username,
        display_name: getUserDisplayName(user),
        avatar_url: user.avatar_url || null,
        avatar_decoration: normalizeAvatarDecoration(user.avatar_decoration || 'none'),
        region: user.region || '',
        badges: getUserBadges(user).map(serializeBadge),
        last_seen: Date.now(),
        typing_at: typing ? Date.now() : Number(entry.typing_at || 0)
    };
}

function clearTyping(store, userId) {
    if (store?.presence?.[userId]) {
        store.presence[userId].typing_at = 0;
    }
}

function ensureSocialCollections(state) {
    ensureStateMeta(state);
    if (!state.tables || typeof state.tables !== 'object') state.tables = {};
    if (!Array.isArray(state.tables.friendships)) state.tables.friendships = [];
    if (!Array.isArray(state.tables.friend_requests)) state.tables.friend_requests = [];
    if (!Array.isArray(state.tables.gifts)) state.tables.gifts = [];
    if (!Array.isArray(state.tables.user_blocks)) state.tables.user_blocks = [];
    if (!Array.isArray(state.tables.friend_aliases)) state.tables.friend_aliases = [];
    return state;
}

function getSortedUserPair(userAId, userBId) {
    return [Number(userAId) || 0, Number(userBId) || 0].sort((a, b) => a - b);
}

function getFriendshipRecord(state, userAId, userBId) {
    if (!userAId || !userBId || Number(userAId) === Number(userBId)) return null;
    ensureSocialCollections(state);
    const [low, high] = getSortedUserPair(userAId, userBId);
    return safeArray(state.tables.friendships).find((row) => Number(row.user_a_id) === low && Number(row.user_b_id) === high && String(row.status || 'accepted') === 'accepted') || null;
}

function areFriends(state, userAId, userBId) {
    return Boolean(getFriendshipRecord(state, userAId, userBId));
}

function removeFriendshipBetween(state, userAId, userBId) {
    ensureSocialCollections(state);
    const [low, high] = getSortedUserPair(userAId, userBId);
    const before = safeArray(state.tables.friendships).length;
    state.tables.friendships = safeArray(state.tables.friendships).filter((row) => !(Number(row.user_a_id) === low && Number(row.user_b_id) === high));
    return before !== state.tables.friendships.length;
}

function getFriendIds(state, userId) {
    ensureSocialCollections(state);
    return safeArray(state.tables.friendships)
        .filter((row) => Number(row.user_a_id) === Number(userId) || Number(row.user_b_id) === Number(userId))
        .map((row) => Number(row.user_a_id) === Number(userId) ? Number(row.user_b_id) : Number(row.user_a_id))
        .filter(Boolean);
}

function getFriendAlias(state, ownerId, friendId) {
    ensureSocialCollections(state);
    const entry = safeArray(state.tables.friend_aliases).find((row) => Number(row.owner_id) === Number(ownerId) && Number(row.friend_id) === Number(friendId));
    return entry ? normalizeText(entry.alias || '') : '';
}

function setFriendAlias(state, ownerId, friendId, alias) {
    ensureSocialCollections(state);
    const normalized = normalizeText(alias || '').slice(0, 32);
    state.tables.friend_aliases = safeArray(state.tables.friend_aliases).filter((row) => !(Number(row.owner_id) === Number(ownerId) && Number(row.friend_id) === Number(friendId)));
    if (normalized) {
        state.tables.friend_aliases.push({
            id: nextStateId(state, 'friend_aliases'),
            owner_id: Number(ownerId),
            friend_id: Number(friendId),
            alias: normalized,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    return normalized;
}

function getPendingFriendRequestBetween(state, userAId, userBId) {
    ensureSocialCollections(state);
    return safeArray(state.tables.friend_requests).find((row) => String(row.status || 'pending') === 'pending' && ((Number(row.sender_id) === Number(userAId) && Number(row.receiver_id) === Number(userBId)) || (Number(row.sender_id) === Number(userBId) && Number(row.receiver_id) === Number(userAId)))) || null;
}

function isUserBlockedBy(state, blockerId, blockedId) {
    ensureSocialCollections(state);
    return safeArray(state.tables.user_blocks).find((row) => Number(row.blocker_id) === Number(blockerId) && Number(row.blocked_id) === Number(blockedId)) || null;
}

function isBlockedPair(state, userAId, userBId) {
    return Boolean(isUserBlockedBy(state, userAId, userBId) || isUserBlockedBy(state, userBId, userAId));
}

function getPresenceForUserId(userId, store = readCommunityStore()) {
    const entry = store?.presence?.[userId] || store?.presence?.[String(userId)] || null;
    const lastSeen = Number(entry?.last_seen || 0);
    return {
        online: Boolean(lastSeen) && Date.now() - lastSeen < 45000,
        last_seen_at: lastSeen ? new Date(lastSeen).toISOString() : null,
        entry: entry || null
    };
}

function getRelationshipStatus(state, viewerId, otherId) {
    if (!viewerId || !otherId) return 'none';
    if (Number(viewerId) === Number(otherId)) return 'self';
    if (isUserBlockedBy(state, viewerId, otherId)) return 'blocked_by_you';
    if (isUserBlockedBy(state, otherId, viewerId)) return 'blocked_you';
    if (areFriends(state, viewerId, otherId)) return 'friends';
    const pending = getPendingFriendRequestBetween(state, viewerId, otherId);
    if (!pending) return 'none';
    return Number(pending.receiver_id) === Number(viewerId) ? 'incoming' : 'outgoing';
}

function buildSocialUserCard(state, user, viewerId, presenceStore = readCommunityStore()) {
    if (!user) return null;
    const presence = getPresenceForUserId(user.id, presenceStore);
    const alias = viewerId ? getFriendAlias(state, viewerId, user.id) : '';
    return {
        id: user.id,
        username: user.username,
        display_name: alias || getUserDisplayName(user),
        canonical_display_name: getUserDisplayName(user),
        friend_alias: alias,
        avatar_url: user.avatar_url || null,
        region: user.region || '',
        custom_role: user.custom_role || '',
        site_role: getUserSiteRole(user),
        badges: getUserBadges(user).map(serializeBadge),
        profile_link: getProfileLink(user),
        relationship_status: getRelationshipStatus(state, viewerId, user.id),
        online: presence.online,
        last_seen_at: presence.last_seen_at
    };
}

function getGiftableInventoryForUser(userId, limit = 24) {
    return safeArray(getTable('inventory'))
        .filter((row) => Number(row.user_id) === Number(userId))
        .map((row) => ensureInventoryMetaDefaults(row))
        .filter((row) => !Number(row.is_listed || 0) && !Number(row.is_locked || 0) && !row.pending_gift_id)
        .sort((a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0) || String(b.acquired_at || '').localeCompare(String(a.acquired_at || '')))
        .slice(0, limit)
        .map((row) => enrichInventoryLikeItem(row, { case_id: row.case_id, odds: row.odds }));
}

function buildGiftSummary(state, gift, viewerId, presenceStore = readCommunityStore()) {
    const sender = getUserById(gift.sender_id);
    const recipient = getUserById(gift.recipient_id);
    const itemSnapshot = gift.type === 'item' && gift.item_snapshot
        ? enrichInventoryLikeItem(gift.item_snapshot, { case_id: gift.item_snapshot.case_id, odds: gift.item_snapshot.odds })
        : null;
    return {
        id: gift.id,
        type: gift.type,
        status: gift.status || 'pending',
        note: gift.note || '',
        amount: Number(gift.amount || 0),
        created_at: gift.created_at,
        updated_at: gift.updated_at || gift.created_at,
        claimed_at: gift.claimed_at || null,
        declined_at: gift.declined_at || null,
        cancelled_at: gift.cancelled_at || null,
        sender: sender ? buildSocialUserCard(state, sender, viewerId, presenceStore) : null,
        recipient: recipient ? buildSocialUserCard(state, recipient, viewerId, presenceStore) : null,
        item: itemSnapshot,
        is_incoming: Number(gift.recipient_id) === Number(viewerId),
        is_outgoing: Number(gift.sender_id) === Number(viewerId)
    };
}

function buildFriendActivityFeed(state, userId, limit = 12) {
    const friendIds = new Set(getFriendIds(state, userId));
    if (!friendIds.size) return [];
    const presenceStore = readCommunityStore();
    return safeArray(state.tables?.openings)
        .filter((row) => friendIds.has(Number(row.user_id)))
        .slice()
        .sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || '')))
        .slice(0, limit)
        .map((row) => ({
            id: `opening_${row.id}`,
            type: 'opening',
            created_at: row.opened_at,
            case_name: row.case_name || '',
            user: buildSocialUserCard(state, getUserById(row.user_id) || { id: row.user_id, username: row.username, display_name: row.username }, userId, presenceStore),
            item: enrichInventoryLikeItem(row, { case_id: row.case_id, odds: row.odds })
        }));
}

function unlockGiftItem(state, gift) {
    const item = safeArray(state.tables?.inventory).find((row) => Number(row.id) === Number(gift.item_id));
    if (item && Number(item.pending_gift_id || 0) === Number(gift.id)) {
        item.pending_gift_id = null;
        item.is_locked = 0;
    }
    return item || null;
}

function refundGiftCredits(state, gift, description = 'Gift refund') {
    if (String(gift.type || '') !== 'credits' || gift.refunded_at) return;
    const sender = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(gift.sender_id));
    if (!sender) return;
    sender.balance = Number(sender.balance || 0) + Number(gift.amount || 0);
    state.tables.transactions = safeArray(state.tables.transactions);
    state.tables.transactions.push({
        id: nextStateId(state, 'transactions'),
        user_id: Number(sender.id),
        type: 'gift_refund',
        amount: Number(gift.amount || 0),
        description,
        created_at: new Date().toISOString()
    });
    gift.refunded_at = new Date().toISOString();
}

function cancelPendingGiftWithState(state, gift, status = 'cancelled') {
    if (!gift || String(gift.status || 'pending') !== 'pending') return gift;
    if (String(gift.type || '') === 'credits') {
        refundGiftCredits(state, gift, `Gift refund · ${status}`);
    } else if (String(gift.type || '') === 'item') {
        unlockGiftItem(state, gift);
    }
    gift.status = status;
    gift.updated_at = new Date().toISOString();
    if (status === 'declined') gift.declined_at = gift.updated_at;
    if (status === 'cancelled') gift.cancelled_at = gift.updated_at;
    return gift;
}

function getPublicAnnouncements(store) {
    return safeArray(store.announcements)
        .filter((entry) => !entry.expires_at || new Date(entry.expires_at).getTime() > Date.now())
        .slice(0, 4)
        .map((entry) => ({ ...entry }));
}
function ensureDataFile(filePath, fallback) {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
}

function readJson(filePath, fallback) {
    ensureDataFile(filePath, fallback);
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return JSON.parse(JSON.stringify(fallback));
    }
}

function writeJson(filePath, value) {
    ensureDataFile(filePath, value);
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    if (filePath === appDataPath && typeof db.reload === 'function') {
        db.reload();
    }
}

function readAppState() {
    return readJson(appDataPath, { meta: { nextIds: {} }, tables: {} });
}

function getTable(tableName) {
    const state = readAppState();
    return Array.isArray(state.tables?.[tableName]) ? state.tables[tableName] : [];
}

function readReplayStore() {
    return readJson(replayDataPath, { nextId: 1, replays: [] });
}

function writeReplayStore(value) {
    writeJson(replayDataPath, value);
}


function saveReplay(payload) {
    const store = readReplayStore();
    const replay = {
        id: store.nextId++,
        created_at: new Date().toISOString(),
        ...payload
    };
    store.replays.unshift(replay);
    store.replays = store.replays.slice(0, 500);
    writeReplayStore(store);
    return replay;
}

function getReplayByOpeningId(openingId) {
    return readReplayStore().replays.find((entry) => Number(entry.opening_id) === Number(openingId)) || null;
}

function readCaseVsStore() {
    return readJson(caseVsDataPath, { nextId: 1, rooms: [] });
}

function writeCaseVsStore(value) {
    writeJson(caseVsDataPath, value);
}


function readCommunityStore() {
    const store = readJson(communityDataPath, {
        nextMessageId: 1,
        nextRainId: 1,
        nextAnnouncementId: 1,
        nextClaimId: 1,
        messages: [],
        activeRain: null,
        rainHistory: [],
        announcements: [],
        presence: {},
        claimDrops: []
    });
    store.nextMessageId = Math.max(Number(store.nextMessageId) || 1, 1);
    store.nextRainId = Math.max(Number(store.nextRainId) || 1, 1);
    store.nextAnnouncementId = Math.max(Number(store.nextAnnouncementId) || 1, 1);
    store.nextClaimId = Math.max(Number(store.nextClaimId) || 1, 1);
    store.messages = Array.isArray(store.messages) ? store.messages : [];
    store.rainHistory = Array.isArray(store.rainHistory) ? store.rainHistory : [];
    store.announcements = Array.isArray(store.announcements) ? store.announcements : [];
    store.claimDrops = Array.isArray(store.claimDrops) ? store.claimDrops : [];
    store.presence = store.presence && typeof store.presence === 'object' ? store.presence : {};

    const now = Date.now();
    for (const [key, entry] of Object.entries(store.presence)) {
        if (now - Number(entry.last_seen || 0) > 60000) {
            delete store.presence[key];
        }
    }
    store.announcements = store.announcements.filter((entry) => !entry.expires_at || new Date(entry.expires_at).getTime() > now - 60000).slice(0, 12);
    store.claimDrops = store.claimDrops.slice(0, 60);
    store.messages = store.messages.map((entry) => {
        if ((String(entry.username || '').toLowerCase() === 'katsucases' || String(entry.display_name || '').toLowerCase() === 'system') && !entry.user_id) {
            return {
                ...entry,
                username: SYSTEM_IDENTITY.username,
                display_name: entry.display_name || SYSTEM_IDENTITY.display_name,
                avatar_url: entry.avatar_url || SYSTEM_IDENTITY.avatar_url,
                badges: Array.isArray(entry.badges) ? entry.badges : []
            };
        }
        return entry;
    });
    return store;
}

function writeCommunityStore(value) {
    writeJson(communityDataPath, value);
}

function requireAdmin(req, res, next) {
    if (!req.user || !hasAdminAccess(req.user)) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

function requireOwner(req, res, next) {
    if (!req.user || !isOwnerUserId(req.user.id)) {
        return res.status(403).json({ error: 'Owner access required' });
    }
    next();
}

function addCommunityMessage(store, payload) {
    const linkedUser = payload.user_id ? getUserById(payload.user_id) : null;
    const isSystem = isSystemIdentityPayload(payload) && !linkedUser;
    const profile = isSystem ? getSystemIdentity(payload) : buildUserTagPayload(linkedUser || payload.user || null);
    const message = {
        id: store.nextMessageId++,
        created_at: new Date().toISOString(),
        type: payload.type || 'user',
        user_id: payload.user_id || linkedUser?.id || null,
        username: payload.username || linkedUser?.username || profile.username || 'KatsuCases',
        display_name: payload.display_name || profile.display_name || payload.username || 'KatsuCases',
        is_admin: Boolean(payload.is_admin || (linkedUser && hasAdminAccess(linkedUser)) || hasAdminAccess(payload.user)),
        avatar_url: payload.avatar_url !== undefined ? payload.avatar_url : profile.avatar_url,
        region: payload.region !== undefined ? payload.region : profile.region,
        pronouns: payload.pronouns !== undefined ? payload.pronouns : profile.pronouns,
        badges: Array.isArray(payload.badges) ? payload.badges : profile.badges,
        custom_role: payload.custom_role !== undefined ? payload.custom_role : profile.custom_role,
        message: String(payload.message || '').trim(),
        meta: payload.meta || null
    };
    if (isSystem) {
        message.username = SYSTEM_IDENTITY.username;
        message.display_name = payload.display_name || SYSTEM_IDENTITY.display_name;
        message.avatar_url = payload.avatar_url !== undefined ? payload.avatar_url : SYSTEM_IDENTITY.avatar_url;
        if (!Array.isArray(message.badges)) message.badges = [];
    }
    store.messages.push(message);
    store.messages = store.messages.slice(-220);
    return message;
}

function formatAmount(value) {
    return Number(value || 0).toFixed(2);
}

function getRainPublic(rain, viewerId = null) {
    if (!rain) return null;
    const entrants = Array.isArray(rain.entrants) ? rain.entrants : [];
    return {
        ...rain,
        entrants: entrants.slice(-12),
        entrant_count: entrants.length,
        entered: viewerId ? entrants.some((entry) => Number(entry.user_id) === Number(viewerId)) : false,
        is_active: rain.status === 'active'
    };
}

function finalizeExpiredRain(force = false) {
    const store = readCommunityStore();

    if (!store.messages.length) {
        addCommunityMessage(store, {
            type: 'system',
            username: 'KatsuCases',
            message: 'Community chat is live. Trade, talk pulls, and watch for rain drops from the owner.'
        });
    }

    const rain = store.activeRain;
    if (!rain) {
        writeCommunityStore(store);
        return { store, finalized: null };
    }

    const now = Date.now();
    const endAt = new Date(rain.ends_at).getTime();
    if (!force && Number.isFinite(endAt) && endAt > now) {
        writeCommunityStore(store);
        return { store, finalized: null };
    }

    const entrants = [];
    const seen = new Set();
    for (const entry of Array.isArray(rain.entrants) ? rain.entrants : []) {
        const key = Number(entry.user_id);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        entrants.push(entry);
    }

    const totalCents = Math.max(0, Math.round(Number(rain.amount || 0) * 100));
    const payouts = [];
    if (entrants.length && totalCents > 0) {
        const base = Math.floor(totalCents / entrants.length);
        let remainder = totalCents % entrants.length;
        for (const entrant of entrants) {
            const payoutCents = base + (remainder > 0 ? 1 : 0);
            remainder = Math.max(0, remainder - 1);
            const payoutAmount = Number((payoutCents / 100).toFixed(2));
            payouts.push({ user_id: entrant.user_id, username: entrant.username, amount: payoutAmount });
            if (payoutAmount > 0) {
                db.prepare('UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?').run(payoutAmount, payoutAmount, entrant.user_id);
                db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(entrant.user_id, 'bonus', payoutAmount, `Rain payout from ${rain.title}`);
            }
            notifications.create(entrant.user_id, {
                type: 'rain_payout',
                title: 'Rain payout received',
                message: `You collected $${formatAmount(payoutAmount)} from ${rain.title}.`,
                link: '/',
                meta: { rainId: rain.id }
            });
        }
    }

    const finalized = {
        ...rain,
        status: 'ended',
        ended_at: new Date().toISOString(),
        entrant_count: entrants.length,
        payouts,
        distributed_amount: Number((payouts.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)).toFixed(2))
    };

    store.activeRain = null;
    store.rainHistory.unshift(finalized);
    store.rainHistory = store.rainHistory.slice(0, 20);

    addCommunityMessage(store, {
        type: 'system',
        username: 'KatsuCases',
        message: entrants.length
            ? `${rain.title} ended. ${entrants.length} player(s) split $${formatAmount(finalized.distributed_amount)}.`
            : `${rain.title} ended with no entrants.`
    });

    writeCommunityStore(store);
    return { store, finalized };
}

function createSeed() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function scoreResult(item) {
    return (RARITY_SCORE[item.rarity] || 0) * 100 + (item.is_shiny ? 10 : 0);
}

function pickCaseResult(contents, options = {}) {
    const enriched = safeArray(contents).map((item) => enrichCaseContent(item));
    if (!enriched.length) return null;

    const hardRule = options.hardRule || null;
    const softRule = options.softRule || null;
    const softMultiplier = Math.max(1, Number(options.softMultiplier || 1));
    const pool = hardRule ? (safeArray(options.hardCandidates).length ? safeArray(options.hardCandidates) : getPityCandidates(enriched, hardRule.key).candidates) : enriched;

    const totalWeight = pool.reduce((sum, row) => {
        const baseWeight = Number(row.weight || getItemWeight(row));
        const rarityScore = Number(RARITY_SCORE[row.rarity] || 0);
        const multiplier = softRule && rarityScore >= softRule.score ? softMultiplier : 1;
        return sum + (baseWeight * multiplier);
    }, 0);

    let random = Math.random() * totalWeight;
    let selected = pool[pool.length - 1] || null;
    for (const item of pool) {
        const baseWeight = Number(item.weight || getItemWeight(item));
        const rarityScore = Number(RARITY_SCORE[item.rarity] || 0);
        const multiplier = softRule && rarityScore >= softRule.score ? softMultiplier : 1;
        random -= (baseWeight * multiplier);
        if (random <= 0) {
            selected = item;
            break;
        }
    }
    return selected;
}

function pickWeightedReplayItem(contents) {
    const enriched = safeArray(contents).map((item) => enrichCaseContent(item));
    return pickCaseResult(enriched) || enriched[0] || null;
}

function buildReplayTrack(contents, winner, slots = 20) {
    const enriched = safeArray(contents).map((item) => enrichCaseContent(item));
    if (!enriched.length) return { track: [], winnerIndex: 0 };
    const track = [];
    const winnerIndex = Number.isFinite(Number(winner?.winning_index)) ? Number(winner.winning_index) : Math.max(8, slots - 5);
    const teasePool = enriched.slice().sort((a, b) => (RARITY_SCORE[b.rarity] || 0) - (RARITY_SCORE[a.rarity] || 0));
    for (let i = 0; i < slots; i += 1) {
        let item;
        if (i === winnerIndex) {
            item = winner;
        } else if (i > winnerIndex - 4 && Math.random() < 0.55) {
            item = teasePool[Math.floor(Math.random() * Math.min(10, teasePool.length))] || pickWeightedReplayItem(enriched);
        } else {
            item = pickWeightedReplayItem(enriched);
        }
        track.push({
            pokemon_name: item.pokemon_name,
            pokemon_form: item.pokemon_form || null,
            rarity: item.rarity,
            sprite_url: buildSpriteUrl(item.pokemon_name, item.sprite_url),
            is_shiny: item.is_shiny,
            odds: Math.max(Number(item.odds || 1), 1),
            estimated_value: Number(item.estimated_value || computeEstimatedValue({ odds: item.odds, rarity: item.rarity, is_shiny: item.is_shiny, casePrice: getCasePrice(item.case_id) }))
        });
    }
    return { track, winnerIndex };
}

function saveValueToOwnedRows(inventoryId, openingId, payload) {
    const state = readAppState();
    const inventoryRow = safeArray(state.tables?.inventory).find((row) => Number(row.id) === Number(inventoryId));
    const openingRow = safeArray(state.tables?.openings).find((row) => Number(row.id) === Number(openingId));
    if (inventoryRow) {
        inventoryRow.estimated_value = Number(payload.estimated_value || 0);
        inventoryRow.odds = Number(payload.odds || 0);
        inventoryRow.case_id = Number(payload.case_id || 0) || null;
        inventoryRow.case_name = payload.case_name || null;
        inventoryRow.sprite_url = buildSpriteUrl(inventoryRow.pokemon_name, inventoryRow.sprite_url);
        if (!inventoryRow.original_owner_id) inventoryRow.original_owner_id = Number(payload.original_owner_id || payload.user_id || 0) || null;
        if (!inventoryRow.original_owner_username) inventoryRow.original_owner_username = payload.original_owner_username || payload.username || null;
    }
    if (openingRow) {
        openingRow.estimated_value = Number(payload.estimated_value || 0);
        openingRow.odds = Number(payload.odds || 0);
        openingRow.seed = payload.seed || null;
        openingRow.sprite_url = buildSpriteUrl(openingRow.pokemon_name, openingRow.sprite_url);
    }
    writeJson(appDataPath, state);
}

function getUsers() {
    return getTable('users');
}

function findUserByUsername(username) {
    return getUsers().find((row) => String(row.username).toLowerCase() === String(username).toLowerCase()) || null;
}

function normalizeSearchText(value) {
    return String(value || '').trim().toLowerCase();
}

function searchUsersList(query, excludeUserId = null, limit = 8) {
    const needle = normalizeSearchText(query).replace(/^@+/, '');
    return getUsers()
        .filter((user) => Number(user.id) !== Number(excludeUserId))
        .filter((user) => {
            if (!needle) return true;
            const username = normalizeSearchText(user.username);
            const displayName = normalizeSearchText(user.display_name || user.username);
            const email = normalizeSearchText(user.email);
            return username.includes(needle) || displayName.includes(needle) || email.includes(needle) || `${username} ${displayName} ${email}`.includes(needle);
        })
        .sort((a, b) => String(a.username || '').localeCompare(String(b.username || '')))
        .slice(0, limit)
        .map((user) => ({
            id: user.id,
            username: user.username,
            display_name: getUserDisplayName(user),
            email: user.email,
            balance: Number(user.balance || 0),
            created_at: user.created_at,
            site_role: getUserSiteRole(user),
            is_owner: isOwnerUserId(user.id),
            is_admin: hasAdminAccess(user),
            avatar_url: user.avatar_url || null,
            avatar_decoration: normalizeAvatarDecoration(user.avatar_decoration || 'none'),
            region: user.region || '',
            badges: getUserBadges(user).map(serializeBadge),
            custom_role: user.custom_role || '',
            account_status: user.account_status || 'active',
            account_status_reason: user.account_status_reason || '',
            account_status_expires_at: user.account_status_expires_at || null,
            signup_ip: user.signup_ip || null,
            last_login_ip: user.last_login_ip || null,
            suspected_ban_evasion: Boolean(Number(user.suspected_ban_evasion || 0)),
            pity: getPitySummaryForUser(user)
        }));
}

function computeTradeSummaryFromItems(senderItems, receiverItems) {
    const offerValue = Number(senderItems.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2));
    const requestValue = Number(receiverItems.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2));
    const richerSide = Math.max(offerValue, requestValue);
    const poorerSide = Math.min(offerValue, requestValue);
    const difference = Number(Math.abs(offerValue - requestValue).toFixed(2));
    const ratio = richerSide > 0 ? Number((poorerSide / richerSide).toFixed(3)) : 1;
    const isFreeTrade = (offerValue === 0 && requestValue > 0) || (requestValue === 0 && offerValue > 0);
    const warningLevel = isFreeTrade ? 'danger' : ratio < 0.45 ? 'warning' : ratio < 0.7 ? 'notice' : 'balanced';
    return { offerValue, requestValue, difference, ratio, isFreeTrade, warningLevel };
}

function saveTradeMeta(tradeId, meta) {
    const state = readAppState();
    const tradeRow = safeArray(state.tables?.trades).find((row) => Number(row.id) === Number(tradeId));
    if (!tradeRow) return null;
    Object.assign(tradeRow, meta || {});
    writeJson(appDataPath, state);
    return tradeRow;
}

async function getPokemonNameCache() {
    const now = Date.now();
    if (POKEMON_CACHE.names.length && now - POKEMON_CACHE.fetchedAt < POKEMON_CACHE_TTL) {
        return POKEMON_CACHE.names;
    }
    try {
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=2000&offset=0', { timeout: 12000 });
        const names = safeArray(response.data?.results).map((entry) => normalizeText(entry.name)).filter(Boolean);
        if (names.length) {
            POKEMON_CACHE.names = names;
            POKEMON_CACHE.fetchedAt = now;
        }
    } catch (error) {
        if (!POKEMON_CACHE.names.length) {
            const fallback = new Set();
            getTable('case_contents').forEach((entry) => fallback.add(normalizeText(entry.pokemon_name).toLowerCase()));
            getTable('inventory').forEach((entry) => fallback.add(normalizeText(entry.pokemon_name).toLowerCase()));
            POKEMON_CACHE.names = Array.from(fallback).filter(Boolean);
            POKEMON_CACHE.fetchedAt = now;
        }
    }
    return POKEMON_CACHE.names;
}

function getTradableInventoryForUser(userId, limit = 24) {
    return getTable('inventory')
        .filter((item) => Number(item.user_id) === Number(userId) && !Number(item.is_listed))
        .sort((a, b) => String(b.acquired_at || '').localeCompare(String(a.acquired_at || '')))
        .slice(0, limit)
        .map((item) => enrichInventoryLikeItem({
            id: item.id,
            pokemon_name: item.pokemon_name,
            rarity: item.rarity,
            sprite_url: item.sprite_url,
            is_shiny: item.is_shiny,
            acquired_at: item.acquired_at,
            odds: item.odds,
            case_id: item.case_id
        }, { case_id: item.case_id, odds: item.odds }));
}

function maybeCreateRareRollAnnouncement({ user, result, caseInfo, seed }) {
    const odds = Math.max(Number(result?.odds || 0), 0);
    const rarityKey = String(result?.rarity || '').toLowerCase();
    const shouldBroadcast = ['legendary', 'mythical'].includes(rarityKey) || odds >= 1000000;
    if (!shouldBroadcast) return;
    const store = readCommunityStore();
    const displayName = getUserDisplayName(user);
    const rarityLabel = String(result.rarity || '').toUpperCase();
    const message = `${displayName} just landed ${result.pokemon_name}${result.is_shiny ? ' SHINY' : ''} from ${caseInfo.name} (${rarityLabel} · 1 in ${odds.toLocaleString()}).`;
    addCommunityMessage(store, {
        type: 'system',
        username: 'KatsuCases',
        message,
        meta: { seed, profile_link: getProfileLink(user) }
    });
    const isJackpot = odds >= 1000000000000 || (rarityKey === 'mythical' && Number(result?.is_shiny || 0) === 1);
    store.announcements.unshift({
        id: store.nextAnnouncementId++,
        type: 'rare_roll',
        priority: isJackpot ? 'jackpot' : 'highlight',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        message,
        link: '/livepulls',
        meta: { seed, case_name: caseInfo.name, username: user.username, pokemon_name: result.pokemon_name, rarity: result.rarity, odds, isJackpot }
    });
    store.announcements = store.announcements.slice(0, 12);
    writeCommunityStore(store);
}

function openCaseForUser({ userId, username, caseInfo, contents, seed, source = 'case_open', roomId = null, selectedItem = null, pityMeta = null }) {
    const selectedSource = selectedItem ? enrichCaseContent(selectedItem, caseInfo) : enrichCaseContent(pickCaseResult(contents), caseInfo);
    const selectedItemFinal = selectedSource;
    const inventoryResult = db.prepare(`
        INSERT INTO inventory (user_id, pokemon_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        selectedItemFinal.pokemon_id,
        selectedItemFinal.pokemon_name,
        selectedItemFinal.pokemon_form,
        selectedItemFinal.rarity,
        buildSpriteUrl(selectedItemFinal.pokemon_name, selectedItemFinal.sprite_url),
        selectedItemFinal.is_shiny
    );

    const openingResult = db.prepare(`
        INSERT INTO openings (user_id, username, case_id, case_name, item_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny, amount_paid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        username,
        caseInfo.id,
        caseInfo.name,
        inventoryResult.lastInsertRowid,
        selectedItemFinal.pokemon_name,
        selectedItemFinal.pokemon_form,
        selectedItemFinal.rarity,
        buildSpriteUrl(selectedItemFinal.pokemon_name, selectedItemFinal.sprite_url),
        selectedItemFinal.is_shiny,
        caseInfo.price
    );

    const enrichedResult = {
        inventoryId: inventoryResult.lastInsertRowid,
        openingId: openingResult.lastInsertRowid,
        case_id: caseInfo.id,
        case_name: caseInfo.name,
        seed,
        user_id: userId,
        username,
        original_owner_id: userId,
        original_owner_username: username,
        pokemon_id: selectedItemFinal.pokemon_id,
        pokemon_name: selectedItemFinal.pokemon_name,
        pokemon_form: selectedItemFinal.pokemon_form || null,
        rarity: selectedItemFinal.rarity,
        sprite_url: buildSpriteUrl(selectedItemFinal.pokemon_name, selectedItemFinal.sprite_url),
        is_shiny: selectedItemFinal.is_shiny,
        odds: Math.max(Number(selectedItemFinal.odds || 1), 1),
        estimated_value: Number(selectedItemFinal.estimated_value || computeEstimatedValue({ odds: selectedItemFinal.odds, rarity: selectedItemFinal.rarity, is_shiny: selectedItemFinal.is_shiny, casePrice: caseInfo.price }))
    };

    saveValueToOwnedRows(inventoryResult.lastInsertRowid, openingResult.lastInsertRowid, enrichedResult);

    const replayBuild = buildReplayTrack(contents, enrichedResult);
    const replayTrack = replayBuild.track;
    const winningIndex = replayBuild.winnerIndex;
    enrichedResult.winning_index = winningIndex;
    const replay = saveReplay({
        type: source,
        room_id: roomId,
        opening_id: openingResult.lastInsertRowid,
        user_id: userId,
        username,
        case_id: caseInfo.id,
        case_name: caseInfo.name,
        seed,
        winning_index: winningIndex,
        track: replayTrack,
        result: enrichedResult
    });

    const finalResult = { ...enrichedResult, replayId: replay.id, track: replayTrack, winning_index: winningIndex, pity: pityMeta || null };
    const user = getUserById(userId) || { id: userId, username };
    maybeCreateRareRollAnnouncement({ user, result: finalResult, caseInfo, seed });
    return finalResult;
}

function shouldDeliverNotificationToUser(user, type) {
    ensureUserNotificationDefaults(user);
    if (!user || !type) return true;
    if (Number(user.notification_quiet_mode || 0)) return false;
    const key = String(type).toLowerCase();
    if (key.includes('trade')) return Boolean(Number(user.notification_trade || 0));
    if (key.includes('market') || key.includes('listing') || key.includes('claim')) return Boolean(Number(user.notification_market || 0));
    if (key.includes('support') || key.includes('ticket') || key.includes('password_reset')) return Boolean(Number(user.notification_support || 0));
    return Boolean(Number(user.notification_system || 0));
}

function notifyUser(userId, type, title, message, link = null, meta = null) {
    if (!userId) return;
    const user = getUserById(userId);
    if (user && !shouldDeliverNotificationToUser(user, type)) return;
    notifications.create(userId, { type, title, message, link, meta });
}



router.get('/notifications', isAuthenticated, (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
        const list = notifications.listForUser(req.user.id, limit);
        res.json({
            notifications: list,
            unreadCount: notifications.unreadCount(req.user.id)
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.post('/notifications/read-all', isAuthenticated, (req, res) => {
    try {
        notifications.markAllRead(req.user.id);
        res.json({ success: true, unreadCount: 0 });
    } catch (error) {
        console.error('Read all notifications error:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

router.post('/notifications/:id/read', isAuthenticated, (req, res) => {
    try {
        notifications.markRead(req.user.id, req.params.id);
        res.json({ success: true, unreadCount: notifications.unreadCount(req.user.id) });
    } catch (error) {
        console.error('Read notification error:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});


router.get('/leaderboards', optionalAuth, (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 5), 100);
        res.json({ leaderboards: getLeaderboardBundle(limit) });
    } catch (error) {
        console.error('Leaderboards error:', error);
        res.status(500).json({ error: 'Failed to load leaderboards' });
    }
});

router.get('/achievements', isAuthenticated, (req, res) => {
    try {
        res.json(getUserAchievementSummary(req.user.id));
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ error: 'Failed to load achievements' });
    }
});

router.get('/wishlist', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        const user = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        ensureUserAccountDefaults(user);
        res.json({ wishlist: normalizeWishlistEntries(user.wishlist), market_watchlist: normalizeMarketWatchlist(user.market_watchlist) });
    } catch (error) {
        console.error('Wishlist load error:', error);
        res.status(500).json({ error: 'Failed to load wishlist' });
    }
});

router.put('/wishlist', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        const user = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        ensureUserAccountDefaults(user);
        user.wishlist = normalizeWishlistEntries(req.body.wishlist);
        user.market_watchlist = normalizeMarketWatchlist(req.body.market_watchlist);
        writeJson(appDataPath, state);
        res.json({ success: true, wishlist: user.wishlist, market_watchlist: user.market_watchlist });
    } catch (error) {
        console.error('Wishlist save error:', error);
        res.status(500).json({ error: 'Failed to save wishlist' });
    }
});

router.get('/profiles/:identifier/guestbook', optionalAuth, (req, res) => {
    try {
        const identifier = String(req.params.identifier || '').trim();
        const user = /^\d+$/.test(identifier) ? getUserById(Number(identifier)) : getUserByUsernameLike(decodeURIComponent(identifier));
        if (!user) return res.status(404).json({ error: 'User not found' });
        const state = readAppState();
        res.json({ entries: buildGuestbookPreview(state, user.id, 30) });
    } catch (error) {
        console.error('Guestbook load error:', error);
        res.status(500).json({ error: 'Failed to load guestbook' });
    }
});

router.post('/profiles/:identifier/guestbook', isAuthenticated, (req, res) => {
    try {
        const identifier = String(req.params.identifier || '').trim();
        const targetUser = /^\d+$/.test(identifier) ? getUserById(Number(identifier)) : getUserByUsernameLike(decodeURIComponent(identifier));
        if (!targetUser) return res.status(404).json({ error: 'User not found' });
        if (Number(targetUser.id) === Number(req.user.id)) return res.status(400).json({ error: 'You cannot post on your own guestbook' });
        const message = normalizeText(req.body.message || '').slice(0, 220);
        if (!message) return res.status(400).json({ error: 'Message is required' });
        const state = readAppState();
        ensureEngagementCollections(state);
        const nextId = Number(state.meta?.nextIds?.profile_guestbook || 1);
        if (!state.meta) state.meta = { nextIds: {} };
        if (!state.meta.nextIds) state.meta.nextIds = {};
        state.meta.nextIds.profile_guestbook = nextId + 1;
        const row = { id: nextId, target_user_id: Number(targetUser.id), author_id: Number(req.user.id), message, created_at: new Date().toISOString() };
        state.tables.profile_guestbook.push(row);
        writeJson(appDataPath, state);
        notifyUser(targetUser.id, 'guestbook_post', 'New guestbook message', `${req.user.username} left a message on your profile.`, `/profile?user=${encodeURIComponent(targetUser.username)}`, { guestbookId: row.id });
        res.json({ success: true, entry: { ...row, author: buildUserTagPayload(getUserById(req.user.id)) } });
    } catch (error) {
        console.error('Guestbook post error:', error);
        res.status(500).json({ error: 'Failed to post guestbook message' });
    }
});

router.delete('/profile-guestbook/:id', isAuthenticated, (req, res) => {
    try {
        const entryId = Number(req.params.id);
        const state = readAppState();
        ensureEngagementCollections(state);
        const before = state.tables.profile_guestbook.length;
        state.tables.profile_guestbook = state.tables.profile_guestbook.filter((row) => !(Number(row.id) === entryId && (Number(row.author_id) === Number(req.user.id) || Number(row.target_user_id) === Number(req.user.id) || hasAdminAccess(req.user))));
        if (state.tables.profile_guestbook.length === before) return res.status(404).json({ error: 'Guestbook entry not found' });
        writeJson(appDataPath, state);
        res.json({ success: true });
    } catch (error) {
        console.error('Guestbook delete error:', error);
        res.status(500).json({ error: 'Failed to delete guestbook message' });
    }
});


router.get('/progression', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        const user = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        ensureUserFeatureDefaults(user);
        syncUserDailyState(user);
        writeJson(appDataPath, state);
        res.json(buildFeatureBundleForUser(user));
    } catch (error) {
        console.error('Progression load error:', error);
        res.status(500).json({ error: 'Failed to load progression' });
    }
});

router.post('/daily/claim', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        const user = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        ensureUserFeatureDefaults(user);
        syncUserDailyState(user);
        const summary = getDailyRewardSummary(user);
        if (summary.claimed_today) {
            return res.status(400).json({ error: 'Daily reward already claimed today' });
        }
        user.daily_claim_streak = summary.next_claim_streak;
        user.daily_last_claim_at = new Date().toISOString();
        user.daily_claim_total = Number(user.daily_claim_total || 0) + 1;
        awardUserBonuses(user, summary.reward_preview);
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            user.id,
            'daily_claim',
            Number(summary.reward_preview.credits || 0),
            `Daily reward claimed · streak ${user.daily_claim_streak}`
        );
        writeJson(appDataPath, state);
        notifyUser(user.id, 'daily_claim', 'Daily reward claimed', `You claimed $${Number(summary.reward_preview.credits || 0).toFixed(2)}${summary.reward_preview.free_rolls ? ` and ${summary.reward_preview.free_rolls} free roll${summary.reward_preview.free_rolls === 1 ? '' : 's'}` : ''}.`, '/profile', { streak: user.daily_claim_streak, rewards: summary.reward_preview });
        res.json({ success: true, rewards: summary.reward_preview, ...buildFeatureBundleForUser(user), balance: Number(user.balance || 0), free_rolls: Number(user.free_rolls || 0) });
    } catch (error) {
        console.error('Daily claim error:', error);
        res.status(500).json({ error: 'Failed to claim daily reward' });
    }
});

router.post('/missions/:key/claim', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        const user = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        ensureUserFeatureDefaults(user);
        syncUserDailyState(user);
        const mission = DAILY_MISSIONS.find((entry) => entry.key === String(req.params.key || ''));
        if (!mission) return res.status(404).json({ error: 'Mission not found' });
        const progress = getMissionProgress(user, mission);
        if (progress.claimed) return res.status(400).json({ error: 'Mission already claimed' });
        if (progress.progress < mission.goal) return res.status(400).json({ error: 'Mission is not complete yet' });
        user.daily_mission_claims[mission.key] = true;
        awardUserBonuses(user, { credits: mission.credits, freeRolls: mission.free_rolls, xp: mission.xp });
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            user.id,
            'daily_mission',
            Number(mission.credits || 0),
            `Mission completed · ${mission.label}`
        );
        writeJson(appDataPath, state);
        notifyUser(user.id, 'mission_claim', 'Mission reward claimed', `${mission.label} paid out $${Number(mission.credits || 0).toFixed(2)}${mission.free_rolls ? ` and ${mission.free_rolls} free roll${mission.free_rolls === 1 ? '' : 's'}` : ''}.`, '/cases', { mission: mission.key });
        res.json({ success: true, mission: mission.key, rewards: { credits: mission.credits, free_rolls: mission.free_rolls, xp: mission.xp }, ...buildFeatureBundleForUser(user), balance: Number(user.balance || 0), free_rolls: Number(user.free_rolls || 0) });
    } catch (error) {
        console.error('Mission claim error:', error);
        res.status(500).json({ error: 'Failed to claim mission reward' });
    }
});

router.post('/cases/:id/favorite', isAuthenticated, (req, res) => {
    try {
        const caseId = Number(req.params.id);
        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
        if (!caseInfo) return res.status(404).json({ error: 'Case not found' });
        const state = readAppState();
        const user = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        ensureUserFeatureDefaults(user);
        const favorites = new Set(safeArray(user.favorite_case_ids).map((value) => Number(value)).filter(Boolean));
        let favorited = false;
        if (favorites.has(caseId)) {
            favorites.delete(caseId);
        } else {
            favorites.add(caseId);
            favorited = true;
        }
        user.favorite_case_ids = Array.from(favorites).slice(0, 24);
        writeJson(appDataPath, state);
        res.json({ success: true, caseId, favorited, favorite_case_ids: user.favorite_case_ids });
    } catch (error) {
        console.error('Favorite case toggle error:', error);
        res.status(500).json({ error: 'Failed to update favorites' });
    }
});

// Get all cases
router.get('/cases', (req, res) => {
    try {
        const { category, featured } = req.query;
        const viewer = req.session?.userId ? getUserById(req.session.userId) : null;
        const canSeeHidden = Boolean(viewer && hasAdminAccess(viewer));

        let query = 'SELECT * FROM cases';
        const params = [];
        const conditions = [];

        if (category) {
            conditions.push('category = ?');
            params.push(category);
        }

        if (featured !== undefined) {
            conditions.push('is_featured = ?');
            params.push(featured === 'true' ? 1 : 0);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY is_featured DESC, times_opened DESC';

        const cases = db.prepare(query).all(...params)
            .filter((caseRow) => canSeeHidden || isCaseLive(caseRow));

        const favoriteIds = new Set(safeArray(viewer?.favorite_case_ids).map((value) => Number(value)));
        const casesWithCounts = cases.map((c) => {
            const contentRows = dedupeCaseContents(
                db.prepare('SELECT * FROM case_contents WHERE case_id = ? ORDER BY odds ASC').all(c.id).map((row) => enrichCaseContent(row, c))
            );
            const rarityMap = {};
            contentRows.forEach((item) => {
                const rarity = item.rarity || 'common';
                if (!rarityMap[rarity]) {
                    rarityMap[rarity] = { rarity, count: 0, min_odds: Number(item.odds || 0), max_odds: Number(item.odds || 0) };
                }
                rarityMap[rarity].count += 1;
                rarityMap[rarity].min_odds = Math.min(rarityMap[rarity].min_odds, Number(item.odds || 0));
                rarityMap[rarity].max_odds = Math.max(rarityMap[rarity].max_odds, Number(item.odds || 0));
            });
            const rarities = Object.values(rarityMap);
            return {
                ...c,
                total_items: contentRows.length,
                rarity_breakdown: rarities,
                is_live: isCaseLive(c),
                next_launch_at: c.launch_at || null,
                top_items: contentRows.slice(0, 5),
                is_favorite: favoriteIds.has(Number(c.id))
            };
        });

        res.json({ cases: casesWithCounts });
    } catch (error) {
        console.error('Get cases error:', error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

// Get single case with contents
router.get('/cases/:id', (req, res) => {
    try {
        const { id } = req.params;
        const viewer = req.session?.userId ? getUserById(req.session.userId) : null;
        const canSeeHidden = Boolean(viewer && hasAdminAccess(viewer));

        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
        if (!caseInfo) {
            return res.status(404).json({ error: 'Case not found' });
        }
        if (!canSeeHidden && !isCaseLive(caseInfo)) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const contents = dedupeCaseContents(db.prepare('SELECT * FROM case_contents WHERE case_id = ? ORDER BY odds ASC').all(id).map((row) => enrichCaseContent(row, caseInfo)));
        const byRarity = {};
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

        for (const rarity of rarities) {
            byRarity[rarity] = contents.filter((c) => c.rarity === rarity);
        }

        res.json({
            case: { ...caseInfo, is_live: isCaseLive(caseInfo) },
            contents,
            byRarity,
            totalItems: contents.length,
            pity: viewer ? buildPitySnapshot(getUserPityState(viewer), contents) : null
        });
    } catch (error) {
        console.error('Get case error:', error);
        res.status(500).json({ error: 'Failed to fetch case' });
    }
});

// Open case

router.get('/cases/:id/reviews', optionalAuth, (req, res) => {
    try {
        const caseId = Number(req.params.id);
        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
        if (!caseInfo) return res.status(404).json({ error: 'Case not found' });
        res.json(buildCaseReviewSummary(caseId, 20));
    } catch (error) {
        console.error('Case reviews load error:', error);
        res.status(500).json({ error: 'Failed to load reviews' });
    }
});

router.post('/cases/:id/reviews', isAuthenticated, (req, res) => {
    try {
        const caseId = Number(req.params.id);
        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
        if (!caseInfo) return res.status(404).json({ error: 'Case not found' });
        const rating = Math.max(1, Math.min(5, parseInt(req.body.rating, 10) || 0));
        const message = normalizeText(req.body.message || '').slice(0, 280);
        if (!rating) return res.status(400).json({ error: 'Rating is required' });
        const state = readAppState();
        ensureEngagementCollections(state);
        const existing = safeArray(state.tables.case_reviews).find((row) => Number(row.case_id) === caseId && Number(row.user_id) === Number(req.user.id));
        if (existing) {
            existing.rating = rating;
            existing.message = message;
            existing.updated_at = new Date().toISOString();
        } else {
            const nextId = Number(state.meta?.nextIds?.case_reviews || 1);
            if (!state.meta) state.meta = { nextIds: {} };
            if (!state.meta.nextIds) state.meta.nextIds = {};
            state.meta.nextIds.case_reviews = nextId + 1;
            state.tables.case_reviews.push({ id: nextId, case_id: caseId, user_id: Number(req.user.id), rating, message, created_at: new Date().toISOString(), updated_at: null });
        }
        writeJson(appDataPath, state);
        res.json({ success: true, ...buildCaseReviewSummary(caseId, 20) });
    } catch (error) {
        console.error('Case review save error:', error);
        res.status(500).json({ error: 'Failed to save review' });
    }
});

router.post('/cases/:id/open', isAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const amount = Math.min(Math.max(parseInt(req.body.amount, 10) || 1, 1), 10);
        const userId = req.user.id;

        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
        if (!caseInfo || !isCaseLive(caseInfo)) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const accrualState = readAppState();
        ensureStateMeta(accrualState);
        const liveUser = safeArray(accrualState.tables?.users).find((row) => Number(row.id) === Number(userId));
        if (!liveUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        ensureUserAccountDefaults(liveUser);
        if (String(liveUser.account_status || 'active').toLowerCase() === 'suspended') {
            return res.status(403).json({ error: 'This account is suspended' });
        }
        applyOfflineRollAccrual(accrualState, liveUser);
        writeJson(appDataPath, accrualState);
        const freeRolls = Math.max(0, Number(liveUser?.free_rolls || 0));
        const paidRolls = Math.max(0, amount - freeRolls);
        const freeRollsUsed = Math.min(amount, freeRolls);
        const totalCost = Number(caseInfo.price) * paidRolls;
        if (Number(req.user.balance) < totalCost) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const contents = dedupeCaseContents(db.prepare('SELECT * FROM case_contents WHERE case_id = ?').all(id).map((row) => enrichCaseContent(row, caseInfo)));
        const baseSeed = createSeed();
        const results = [];
        ensureUserFeatureDefaults(liveUser);
        syncUserDailyState(liveUser);
        let pityState = getUserPityState(liveUser);
        const pityBefore = buildPitySnapshot(pityState, contents);

        for (let i = 0; i < amount; i += 1) {
            const seed = `${baseSeed}-${i + 1}`;
            const plan = getPityRollPlan(pityState, contents);
            const progressBefore = { ...plan.state };
            const selectedItem = pickCaseResult(contents, plan);
            const nextPityState = applyPityStateResult(pityState, selectedItem?.rarity);
            const triggeredRule = plan.hardRule && Number(RARITY_SCORE[selectedItem?.rarity] || 0) >= Number(plan.hardRule.score || 0)
                ? plan.hardRule
                : null;
            const result = openCaseForUser({
                userId,
                username: req.user.username,
                caseInfo,
                contents,
                seed,
                source: 'case_open',
                selectedItem,
                pityMeta: {
                    triggered: Boolean(triggeredRule),
                    trigger_label: triggeredRule ? triggeredRule.label : '',
                    trigger_key: triggeredRule ? triggeredRule.key : '',
                    progress_before: triggeredRule ? Number(progressBefore[triggeredRule.key] || 0) : 0,
                    soft_active: Boolean(plan.softRule),
                    soft_label: plan.softRule ? plan.softRule.label : '',
                    soft_multiplier: Number(plan.softMultiplier || 1),
                    after: buildPitySnapshot(nextPityState, contents)
                }
            });
            db.prepare('UPDATE cases SET times_opened = times_opened + 1 WHERE id = ?').run(id);
            pityState = nextPityState;
            results.push(result);
        }

        if (paidRolls > 0) {
            db.prepare('UPDATE users SET balance = balance - ?, cases_opened = cases_opened + ? WHERE id = ?').run(totalCost, amount, userId);
            db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
                userId,
                'purchase',
                -totalCost,
                `Opened ${amount}x ${caseInfo.name}${freeRollsUsed ? ` using ${freeRollsUsed} free roll(s)` : ''}`
            );
        } else {
            const freeState = readAppState();
            const freeUser = safeArray(freeState.tables?.users).find((row) => Number(row.id) === Number(userId));
            if (freeUser) {
                freeUser.cases_opened = Number(freeUser.cases_opened || 0) + amount;
            }
            writeJson(appDataPath, freeState);
            db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
                userId,
                'free_roll',
                0,
                `Opened ${amount}x ${caseInfo.name} with free rolls`
            );
        }

        const state = readAppState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(userId));
        let earnedXp = 0;
        if (userRow) {
            ensureUserFeatureDefaults(userRow);
            syncUserDailyState(userRow);
            if (freeRollsUsed > 0) {
                userRow.free_rolls = Math.max(0, Number(userRow.free_rolls || 0) - freeRollsUsed);
            }
            userRow.daily_case_opens = Number(userRow.daily_case_opens || 0) + results.length;
            earnedXp = results.reduce((sum, result) => sum + 12 + (Number(RARITY_SCORE[result?.rarity] || 0) * 6), 0);
            awardUserBonuses(userRow, { xp: earnedXp });
            saveUserPityState(userRow, pityState);
        }
        writeJson(appDataPath, state);

        const updatedUser = userRow || getUserById(userId) || req.user;
        const responseResults = results.map((result, index) => {
            if (index === results.length - 1) return result;
            const { track, ...rest } = result;
            return rest;
        });

        res.json({
            success: true,
            results: responseResults,
            newBalance: Number(updatedUser?.balance || 0),
            freeRolls: Number(updatedUser?.free_rolls || 0),
            freeRollsUsed,
            paidRolls,
            seed: baseSeed,
            pityBefore,
            pity: buildPitySnapshot(pityState, contents),
            userPity: getPitySummaryForUser(updatedUser),
            progression: getProgressionSummary(updatedUser),
            earnedXp
        });
    } catch (error) {
        console.error('Open case error:', error);
        res.status(500).json({ error: 'Failed to open case' });
    }
});

// Get marketplace items
router.get('/marketplace', (req, res) => {
    try {
        const { rarity, sort, search } = req.query;
        
        let query = 'SELECT * FROM marketplace WHERE status = ?';
        const params = ['active'];

        if (rarity) {
            query += ' AND rarity = ?';
            params.push(rarity);
        }

        if (search) {
            query += ' AND pokemon_name LIKE ?';
            params.push(`%${search}%`);
        }

        switch (sort) {
            case 'price_low':
                query += ' ORDER BY price ASC';
                break;
            case 'price_high':
                query += ' ORDER BY price DESC';
                break;
            case 'recent':
                query += ' ORDER BY listed_at DESC';
                break;
            default:
                query += ' ORDER BY listed_at DESC';
        }

        const items = db.prepare(query).all(...params).map((item) => ensureInventoryMetaDefaults(enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds })));
        res.json({ items });
    } catch (error) {
        console.error('Get marketplace error:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace' });
    }
});

// List item on marketplace
router.post('/marketplace/list', isAuthenticated, (req, res) => {
    try {
        const { itemId, price } = req.body;
        const userId = req.user.id;

        if (!itemId || !price || price <= 0) {
            return res.status(400).json({ error: 'Valid item ID and price are required' });
        }

        // Check ownership
        const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, userId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found or not owned' });
        }

        ensureInventoryMetaDefaults(item);
        if (item.is_listed) {
            return res.status(400).json({ error: 'Item is already listed' });
        }
        if (Number(item.is_locked || 0)) {
            return res.status(400).json({ error: 'Locked items cannot be listed' });
        }

        // Create listing
        db.prepare(`
            INSERT INTO marketplace (seller_id, seller_username, item_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            userId,
            req.user.username,
            itemId,
            item.pokemon_name,
            item.pokemon_form,
            item.rarity,
            item.sprite_url,
            item.is_shiny,
            price
        );

        // Update inventory
        db.prepare('UPDATE inventory SET is_listed = 1, listed_price = ? WHERE id = ?').run(price, itemId);

        notifyUser(userId, 'marketplace_listed', 'Listing is live', `${item.pokemon_name} is now listed for $${Number(price).toFixed(2)}.`, '/inventory', { itemId, price: Number(price) });
        getAllUsers().forEach((watchUser) => {
            ensureUserAccountDefaults(watchUser);
            if (Number(watchUser.id) === Number(userId)) return;
            const watchlist = new Set(normalizeMarketWatchlist(watchUser.market_watchlist));
            const pokemonKey = normalizeText(item.pokemon_name || '').toLowerCase();
            if (!watchlist.has(pokemonKey)) return;
            notifyUser(watchUser.id, 'market_alert', 'Watchlist match', `${item.pokemon_name} just hit the marketplace for $${Number(price).toFixed(2)}.`, '/marketplace', { itemId, pokemon_name: item.pokemon_name, price: Number(price) });
        });

        res.json({ success: true });
    } catch (error) {
        console.error('List item error:', error);
        res.status(500).json({ error: 'Failed to list item' });
    }
});

// Buy item from marketplace
router.post('/marketplace/:id/buy', isAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get listing
        const listing = db.prepare('SELECT * FROM marketplace WHERE id = ? AND status = ?').get(id, 'active');
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.seller_id === userId) {
            return res.status(400).json({ error: 'Cannot buy your own item' });
        }

        if (req.user.balance < listing.price) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Process transaction
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(listing.price, userId);
        db.prepare('UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?').run(listing.price, listing.price, listing.seller_id);
        
        // Update listing
        db.prepare('UPDATE marketplace SET status = ? WHERE id = ?').run('sold', id);
        
        // Update inventory ownership
        db.prepare('UPDATE inventory SET user_id = ?, is_listed = 0, listed_price = NULL WHERE id = ?').run(userId, listing.item_id);

        // Log transactions
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            userId,
            'purchase',
            -listing.price,
            `Bought ${listing.pokemon_name} from ${listing.seller_username}`
        );

        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            listing.seller_id,
            'sale',
            listing.price,
            `Sold ${listing.pokemon_name} to ${req.user.username}`
        );

        const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

        notifyUser(listing.seller_id, 'marketplace_sold', 'Marketplace sale complete', `${req.user.username} bought your ${listing.pokemon_name} for $${Number(listing.price).toFixed(2)}.`, '/marketplace', { listingId: Number(id), itemId: listing.item_id, buyerId: userId });
        notifyUser(userId, 'marketplace_bought', 'Purchase complete', `You bought ${listing.pokemon_name} from ${listing.seller_username}.`, '/inventory', { listingId: Number(id), itemId: listing.item_id, sellerId: listing.seller_id });

        res.json({
            success: true,
            newBalance: updatedUser.balance
        });
    } catch (error) {
        console.error('Buy item error:', error);
        res.status(500).json({ error: 'Failed to complete purchase' });
    }
});

// Get user inventory

router.post('/offline-rolls/presence', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        ensureStateMeta(state);
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        const mode = String(req.body?.mode || req.body?.state || 'heartbeat').toLowerCase();
        const offline_roll = syncOfflineRollPresence(state, userRow, mode);
        writeJson(appDataPath, state);
        res.json({ success: true, offline_roll, mode });
    } catch (error) {
        console.error('Offline roll presence sync error:', error);
        res.status(500).json({ error: 'Failed to sync offline roll presence' });
    }
});

router.get('/settings', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        ensureStateMeta(state);
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        ensureUserAccountDefaults(userRow);
        ensureUserNotificationDefaults(userRow);
        const offline_roll = buildOfflineRollSummary(state, userRow);
        const collection = buildCollectionSummary(req.user.id);
        writeJson(appDataPath, state);
        res.json({
            profile: {
                id: userRow.id,
                username: userRow.username,
                display_name: userRow.display_name || userRow.username,
                email: userRow.email,
                avatar_url: userRow.avatar_url || '',
                banner_url: userRow.banner_url || '',
                profile_background_url: userRow.profile_background_url || '',
                avatar_decoration: normalizeAvatarDecoration(userRow.avatar_decoration || 'none'),
                media_history: mediaHistoryPayload(userRow),
                pronouns: userRow.pronouns || '',
                region: userRow.region || '',
                hide_inventory: Boolean(Number(userRow.hide_inventory || 0))
            },
            preferences: {
                offline_roll_enabled: Boolean(Number(userRow.offline_roll_enabled || 0)),
                theme_mode: userRow.theme_mode || 'dark',
                notification_trade: Boolean(Number(userRow.notification_trade || 0)),
                notification_market: Boolean(Number(userRow.notification_market || 0)),
                notification_support: Boolean(Number(userRow.notification_support || 0)),
                notification_system: Boolean(Number(userRow.notification_system || 0)),
                notification_quiet_mode: Boolean(Number(userRow.notification_quiet_mode || 0))
            },
            offline_roll,
            session_history: safeArray(userRow.login_history).slice(0, 12),
            collection_preview: {
                unique_owned: collection.totals.unique_owned,
                duplicates: collection.totals.duplicates,
                completion_percent: collection.totals.collection_completion_percent
            },
            platform: {
                offline_roll_interval_minutes: Number(state.meta.platform_config.offline_roll_interval_minutes || OFFLINE_ROLL_DEFAULTS.interval_minutes),
                offline_roll_cap: Number(state.meta.platform_config.offline_roll_cap || OFFLINE_ROLL_DEFAULTS.cap)
            }
        });
    } catch (error) {
        console.error('Settings load error:', error);
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

router.put('/settings', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        ensureStateMeta(state);
        const users = safeArray(state.tables?.users);
        const currentUser = users.find((row) => Number(row.id) === Number(req.user.id));
        if (!currentUser) return res.status(404).json({ error: 'User not found' });
        ensureUserAccountDefaults(currentUser);
        ensureUserNotificationDefaults(currentUser);
        const original = JSON.stringify({
            username: currentUser.username,
            display_name: currentUser.display_name,
            avatar_url: currentUser.avatar_url || '',
            banner_url: currentUser.banner_url || '',
            profile_background_url: currentUser.profile_background_url || '',
            avatar_decoration: normalizeAvatarDecoration(currentUser.avatar_decoration || 'none'),
            pronouns: currentUser.pronouns || '',
            region: currentUser.region || '',
            hide_inventory: Number(currentUser.hide_inventory || 0),
            offline_roll_enabled: Number(currentUser.offline_roll_enabled || 0),
            theme_mode: currentUser.theme_mode || 'dark',
            notification_trade: Number(currentUser.notification_trade || 0),
            notification_market: Number(currentUser.notification_market || 0),
            notification_support: Number(currentUser.notification_support || 0),
            notification_system: Number(currentUser.notification_system || 0),
            notification_quiet_mode: Number(currentUser.notification_quiet_mode || 0)
        });

        const username = normalizeText(req.body.username || currentUser.username);
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters using letters, numbers, or underscores' });
        }
        const conflict = users.find((row) => Number(row.id) !== Number(req.user.id) && String(row.username || '').toLowerCase() === username.toLowerCase());
        if (conflict) {
            return res.status(400).json({ error: 'That username is already taken' });
        }
        const previousUsername = currentUser.username;
        buildUserAccountSnapshot(state, req.user.id, { actorId: req.user.id, reason: 'Account settings updated', label: 'Settings change' });
        currentUser.display_name = normalizeText(req.body.display_name || req.body.displayName || currentUser.display_name || username).slice(0, 24) || username;
        applyUserMediaField(currentUser, 'avatar_url', 'avatar_history', req.body.avatar_url ?? req.body.avatarUrl ?? currentUser.avatar_url ?? '');
        applyUserMediaField(currentUser, 'banner_url', 'banner_history', req.body.banner_url ?? req.body.bannerUrl ?? currentUser.banner_url ?? '');
        applyUserMediaField(currentUser, 'profile_background_url', 'profile_background_history', req.body.profile_background_url ?? req.body.profileBackgroundUrl ?? currentUser.profile_background_url ?? '');
        currentUser.avatar_decoration = normalizeAvatarDecoration(req.body.avatar_decoration ?? req.body.avatarDecoration ?? currentUser.avatar_decoration ?? 'none');
        currentUser.pronouns = normalizeText(req.body.pronouns || currentUser.pronouns || '').slice(0, 24);
        currentUser.region = normalizeText(req.body.region || currentUser.region || '').slice(0, 48);
        currentUser.hide_inventory = req.body.hide_inventory === undefined ? Number(currentUser.hide_inventory || 0) : (req.body.hide_inventory ? 1 : 0);
        if (req.body.offline_roll_enabled !== undefined) {
            currentUser.offline_roll_enabled = req.body.offline_roll_enabled ? 1 : 0;
            currentUser.offline_roll_last_at = new Date().toISOString();
        }
        if (req.body.theme_mode !== undefined) {
            currentUser.theme_mode = ['light', 'dark'].includes(String(req.body.theme_mode).toLowerCase()) ? String(req.body.theme_mode).toLowerCase() : 'dark';
        }
        if (req.body.notification_trade !== undefined) currentUser.notification_trade = req.body.notification_trade ? 1 : 0;
        if (req.body.notification_market !== undefined) currentUser.notification_market = req.body.notification_market ? 1 : 0;
        if (req.body.notification_support !== undefined) currentUser.notification_support = req.body.notification_support ? 1 : 0;
        if (req.body.notification_system !== undefined) currentUser.notification_system = req.body.notification_system ? 1 : 0;
        if (req.body.notification_quiet_mode !== undefined) currentUser.notification_quiet_mode = req.body.notification_quiet_mode ? 1 : 0;
        if (previousUsername !== username) {
            if (!Array.isArray(currentUser.username_history)) currentUser.username_history = [];
            currentUser.username_history.push(previousUsername);
            currentUser.username_history = currentUser.username_history.slice(-12);
            currentUser.username = username;
            safeArray(state.tables?.inventory).forEach((row) => {
                if (Number(row.original_owner_id || 0) === Number(req.user.id)) row.original_owner_username = username;
            });
            safeArray(state.tables?.openings).forEach((row) => {
                if (Number(row.user_id) === Number(req.user.id)) row.username = username;
            });
            safeArray(state.tables?.marketplace).forEach((row) => {
                if (Number(row.seller_id) === Number(req.user.id)) row.seller_username = username;
            });
            safeArray(state.tables?.trades).forEach((row) => {
                if (Number(row.sender_id) === Number(req.user.id)) row.sender_username = username;
                if (Number(row.receiver_id) === Number(req.user.id)) row.receiver_username = username;
            });
            const roomStore = readCaseVsStore();
            safeArray(roomStore.rooms).forEach((room) => {
                safeArray(room.players).forEach((player) => {
                    if (Number(player.user_id) === Number(req.user.id)) {
                        player.username = username;
                        player.display_name = currentUser.display_name || username;
                    }
                });
                safeArray(room.rounds_data).forEach((round) => {
                    safeArray(round.pulls).forEach((pull) => {
                        if (Number(pull.user_id) === Number(req.user.id)) pull.username = username;
                    });
                });
                if (Number(room.winner_id || 0) === Number(req.user.id)) room.winner_username = username;
            });
            writeCaseVsStore(roomStore);
            const communityStore = readCommunityStore();
            safeArray(communityStore.messages).forEach((message) => {
                if (Number(message.user_id || 0) === Number(req.user.id)) {
                    message.username = username;
                    message.display_name = currentUser.display_name || username;
                    message.avatar_url = currentUser.avatar_url || null;
                    message.region = currentUser.region || '';
                    message.pronouns = currentUser.pronouns || '';
                }
            });
            if (communityStore.presence && communityStore.presence[req.user.id]) {
                communityStore.presence[req.user.id].username = username;
                communityStore.presence[req.user.id].display_name = currentUser.display_name || username;
                communityStore.presence[req.user.id].avatar_url = currentUser.avatar_url || null;
                communityStore.presence[req.user.id].region = currentUser.region || '';
            }
            writeCommunityStore(communityStore);
        }
        const updatedOffline = buildOfflineRollSummary(state, currentUser);
        writeJson(appDataPath, state);
        res.json({ success: true, settings: { profile: currentUser, offline_roll: updatedOffline } });
    } catch (error) {
        console.error('Settings save error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

router.get('/inventory', isAuthenticated, (req, res) => {
    try {
        const { rarity, sort, listed } = req.query;
        const userId = req.user.id;
        
        let query = 'SELECT * FROM inventory WHERE user_id = ?';
        const params = [userId];

        if (rarity) {
            query += ' AND rarity = ?';
            params.push(rarity);
        }

        if (listed !== undefined) {
            query += ' AND is_listed = ?';
            params.push(listed === 'true' ? 1 : 0);
        }

        switch (sort) {
            case 'value':
                query += ' ORDER BY is_listed DESC, listed_price DESC';
                break;
            case 'rarity':
                query += ' ORDER BY CASE rarity WHEN \'mythical\' THEN 1 WHEN \'legendary\' THEN 2 WHEN \'epic\' THEN 3 WHEN \'rare\' THEN 4 WHEN \'uncommon\' THEN 5 ELSE 6 END';
                break;
            case 'recent':
                query += ' ORDER BY acquired_at DESC';
                break;
            default:
                query += ' ORDER BY acquired_at DESC';
        }

        const items = db.prepare(query).all(...params).map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
        res.json({ items, totalEstimatedValue: Number(items.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2)) });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Get live pulls

router.get('/collection/summary', isAuthenticated, (req, res) => {
    try {
        const summary = buildCollectionSummary(req.user.id);
        res.json(summary);
    } catch (error) {
        console.error('Collection summary error:', error);
        res.status(500).json({ error: 'Failed to load collection summary' });
    }
});

router.post('/inventory/sell-duplicates', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        const items = safeArray(state.tables?.inventory)
            .filter((row) => Number(row.user_id) === Number(req.user.id))
            .map((row) => ensureInventoryMetaDefaults(row));
        const groups = new Map();
        for (const item of items) {
            if (Number(item.is_listed || 0) || Number(item.is_locked || 0)) continue;
            const key = getInventorySignature(item);
            const group = groups.get(key) || [];
            group.push(item);
            groups.set(key, group);
        }
        const sellIds = [];
        let total = 0;
        let soldCount = 0;
        groups.forEach((group) => {
            group.sort((a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0) || String(b.acquired_at || '').localeCompare(String(a.acquired_at || '')));
            group.slice(1).forEach((item) => {
                sellIds.push(Number(item.id));
                total += Number(item.estimated_value || 0);
                soldCount += 1;
            });
        });
        if (!sellIds.length) return res.status(400).json({ error: 'No duplicate unlocked items were found' });
        state.tables.inventory = safeArray(state.tables.inventory).filter((row) => !sellIds.includes(Number(row.id)));
        const user = safeArray(state.tables.users).find((row) => Number(row.id) === Number(req.user.id));
        if (user) {
            user.balance = Number(user.balance || 0) + total;
            user.total_earned = Number(user.total_earned || 0) + total;
        }
        state.tables.transactions = safeArray(state.tables.transactions);
        state.tables.transactions.push({
            id: nextStateId(state, 'transactions'),
            user_id: Number(req.user.id),
            type: 'sell_duplicates',
            amount: Number(total.toFixed(2)),
            description: `Quick sold ${soldCount} duplicate item(s)`,
            created_at: new Date().toISOString()
        });
        writeJson(appDataPath, state);
        notifyUser(req.user.id, 'inventory_sale', 'Duplicates sold', `You quick sold ${soldCount} duplicate item(s) for $${formatAmount(total)}.`, '/inventory', { soldCount, total });
        res.json({ success: true, soldCount, total: Number(total.toFixed(2)) });
    } catch (error) {
        console.error('Sell duplicates error:', error);
        res.status(500).json({ error: 'Failed to sell duplicates' });
    }
});

router.post('/inventory/sell-selected', isAuthenticated, (req, res) => {
    try {
        const itemIds = Array.isArray(req.body.itemIds) ? req.body.itemIds.map((value) => Number(value)).filter(Boolean) : [];
        if (!itemIds.length) return res.status(400).json({ error: 'No items selected' });
        const state = readAppState();
        const items = safeArray(state.tables?.inventory)
            .filter((row) => Number(row.user_id) === Number(req.user.id) && itemIds.includes(Number(row.id)))
            .map((row) => ensureInventoryMetaDefaults(row))
            .filter((row) => !Number(row.is_listed || 0) && !Number(row.is_locked || 0));
        if (!items.length) return res.status(400).json({ error: 'No unlocked items were available to sell' });
        const total = Number(items.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2));
        const ids = items.map((item) => Number(item.id));
        state.tables.inventory = safeArray(state.tables.inventory).filter((row) => !ids.includes(Number(row.id)));
        const user = safeArray(state.tables.users).find((row) => Number(row.id) === Number(req.user.id));
        if (user) {
            user.balance = Number(user.balance || 0) + total;
            user.total_earned = Number(user.total_earned || 0) + total;
        }
        state.tables.transactions = safeArray(state.tables.transactions);
        state.tables.transactions.push({
            id: nextStateId(state, 'transactions'),
            user_id: Number(req.user.id),
            type: 'sell_selected',
            amount: total,
            description: `Quick sold ${items.length} selected item(s)`,
            created_at: new Date().toISOString()
        });
        writeJson(appDataPath, state);
        notifyUser(req.user.id, 'inventory_sale', 'Items sold', `You sold ${items.length} selected item(s) for $${formatAmount(total)}.`, '/inventory', { soldCount: items.length, total });
        res.json({ success: true, soldCount: items.length, total });
    } catch (error) {
        console.error('Sell selected error:', error);
        res.status(500).json({ error: 'Failed to sell selected items' });
    }
});

router.post('/inventory/:id/lock', isAuthenticated, (req, res) => {
    try {
        const itemId = Number(req.params.id);
        const state = readAppState();
        const item = safeArray(state.tables?.inventory).find((row) => Number(row.id) === itemId && Number(row.user_id) === Number(req.user.id));
        if (!item) return res.status(404).json({ error: 'Item not found' });
        ensureInventoryMetaDefaults(item);
        item.is_locked = Number(item.is_locked || 0) ? 0 : 1;
        if (Number(item.is_locked)) {
            item.is_listed = 0;
            item.listed_price = null;
        }
        writeJson(appDataPath, state);
        res.json({ success: true, is_locked: Boolean(Number(item.is_locked || 0)) });
    } catch (error) {
        console.error('Inventory lock toggle error:', error);
        res.status(500).json({ error: 'Failed to update item lock' });
    }
});

router.post('/inventory/:id/favorite', isAuthenticated, (req, res) => {
    try {
        const itemId = Number(req.params.id);
        const state = readAppState();
        const item = safeArray(state.tables?.inventory).find((row) => Number(row.id) === itemId && Number(row.user_id) === Number(req.user.id));
        if (!item) return res.status(404).json({ error: 'Item not found' });
        ensureInventoryMetaDefaults(item);
        item.is_favorite = Number(item.is_favorite || 0) ? 0 : 1;
        writeJson(appDataPath, state);
        res.json({ success: true, is_favorite: Boolean(Number(item.is_favorite || 0)) });
    } catch (error) {
        console.error('Inventory favorite toggle error:', error);
        res.status(500).json({ error: 'Failed to update favorite state' });
    }
});

router.post('/inventory/:id/feature', isAuthenticated, (req, res) => {
    try {
        const itemId = Number(req.params.id);
        const state = readAppState();
        const user = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        const item = safeArray(state.tables?.inventory).find((row) => Number(row.id) === itemId && Number(row.user_id) === Number(req.user.id));
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        ensureUserAccountDefaults(user);
        const featured = safeArray(user.featured_item_ids).map((value) => Number(value)).filter(Boolean);
        const hasItem = featured.includes(itemId);
        let next = featured.filter((value) => value !== itemId);
        if (!hasItem) next = [itemId, ...next].slice(0, 6);
        user.featured_item_ids = next;
        writeJson(appDataPath, state);
        res.json({ success: true, featured: !hasItem, featured_item_ids: user.featured_item_ids });
    } catch (error) {
        console.error('Inventory feature toggle error:', error);
        res.status(500).json({ error: 'Failed to update featured showcase items' });
    }
});

router.get('/livepulls', (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const pulls = db.prepare(`
            SELECT * FROM openings 
            WHERE is_public = 1 
            ORDER BY opened_at DESC 
            LIMIT ?
        `).all(limit).map((pull) => enrichInventoryLikeItem(pull, { case_id: pull.case_id, odds: pull.odds }));
        const replayStore = readReplayStore();
        const pullsWithReplay = pulls.map((pull) => {
            const replay = replayStore.replays.find((row) => Number(row.opening_id) === Number(pull.id));
            return {
                ...pull,
                replay_id: replay ? replay.id : null,
                seed: replay ? replay.seed : null,
                has_replay: Boolean(replay)
            };
        });

        res.json({ pulls: pullsWithReplay });
    } catch (error) {
        console.error('Get live pulls error:', error);
        res.status(500).json({ error: 'Failed to fetch live pulls' });
    }
});

router.get('/livepulls/:id/replay', (req, res) => {
    try {
        const openingId = Number(req.params.id);
        const opening = getTable('openings').find((row) => Number(row.id) === openingId);
        if (!opening) {
            return res.status(404).json({ error: 'Replay not found' });
        }
        let replay = getReplayByOpeningId(openingId);
        if (!replay) {
            replay = saveReplay({
                type: 'case_open',
                opening_id: opening.id,
                user_id: opening.user_id,
                username: opening.username,
                case_id: opening.case_id,
                case_name: opening.case_name,
                seed: `legacy-${opening.id}`,
                winning_index: 0,
                track: [{
                    pokemon_name: opening.pokemon_name,
                    pokemon_form: opening.pokemon_form || null,
                    rarity: opening.rarity,
                    sprite_url: opening.sprite_url,
                    is_shiny: opening.is_shiny,
                    odds: opening.odds || 0,
                    estimated_value: opening.estimated_value || 0
                }],
                result: {
                    inventoryId: opening.item_id,
                    pokemon_id: null,
                    pokemon_name: opening.pokemon_name,
                    pokemon_form: opening.pokemon_form,
                    rarity: opening.rarity,
                    sprite_url: opening.sprite_url,
                    is_shiny: opening.is_shiny,
                    odds: opening.odds || 0,
                    estimated_value: opening.estimated_value || 0,
                    winning_index: 0
                }
            });
        }

        res.json({ replay, opening });
    } catch (error) {
        console.error('Replay fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch replay' });
    }
});

// Get trades
router.get('/trades', isAuthenticated, (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;
        
        let query = `
            SELECT t.*, 
                (SELECT COUNT(*) FROM trade_items WHERE trade_id = t.id) as item_count
            FROM trades t 
            WHERE sender_id = ? OR receiver_id = ?
        `;
        const params = [userId, userId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const trades = db.prepare(query).all(...params);
        
        // Get trade items for each trade
        const tradesWithItems = trades.map(trade => {
            const items = db.prepare('SELECT * FROM trade_items WHERE trade_id = ?').all(trade.id).map((item) => enrichInventoryLikeItem(item, { odds: item.odds }));
            const offeredItems = items.filter((item) => Number(item.from_user) === Number(trade.sender_id));
            const requestedItems = items.filter((item) => Number(item.from_user) === Number(trade.receiver_id));
            const fairness = computeTradeSummaryFromItems(offeredItems, requestedItems);
            return {
                ...trade,
                items,
                offeredItems,
                requestedItems,
                offer_count: offeredItems.length,
                request_count: requestedItems.length,
                offer_value: fairness.offerValue,
                request_value: fairness.requestValue,
                fairness
            };
        });

        res.json({ trades: tradesWithItems });
    } catch (error) {
        console.error('Get trades error:', error);
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});

// Create trade
router.post('/trades', isAuthenticated, (req, res) => {
    try {
        const { receiverId, receiverUsername, items, requestedItemIds = [], message = '' } = req.body;
        const senderId = req.user.id;
        const tradeMessage = normalizeText(message || '').slice(0, 220);

        const selectedItemIds = Array.isArray(items) ? items.map((value) => Number(value)).filter(Boolean) : [];
        const requestedIds = Array.isArray(requestedItemIds) ? requestedItemIds.map((value) => Number(value)).filter(Boolean) : [];
        if ((!receiverId && !receiverUsername) || selectedItemIds.length === 0) {
            return res.status(400).json({ error: 'A target user and at least one offered item are required' });
        }

        const receiver = receiverId
            ? (() => { const user = getUserById(receiverId); return user ? { id: user.id, username: user.username, email: user.email } : null; })()
            : (() => {
                const user = findUserByUsername(receiverUsername);
                return user ? { id: user.id, username: user.username, email: user.email } : null;
            })();

        if (!receiver) {
            return res.status(404).json({ error: 'Receiver not found' });
        }

        if (Number(receiver.id) === Number(senderId)) {
            return res.status(400).json({ error: 'You cannot trade with yourself' });
        }

        const socialState = readAppState();
        ensureSocialCollections(socialState);
        if (isBlockedPair(socialState, senderId, receiver.id)) {
            return res.status(400).json({ error: 'Trading is blocked between these accounts' });
        }

        const validItems = [];
        for (const itemId of selectedItemIds) {
            const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, senderId);
            if (item) ensureInventoryMetaDefaults(item);
            if (item && !Number(item.is_listed) && !Number(item.is_locked || 0)) {
                validItems.push(item);
            }
        }

        if (validItems.length === 0) {
            return res.status(400).json({ error: 'No valid trade items were selected' });
        }

        const requestedItems = [];
        for (const itemId of requestedIds) {
            const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, receiver.id);
            if (item) ensureInventoryMetaDefaults(item);
            if (item && !Number(item.is_listed) && !Number(item.is_locked || 0)) {
                requestedItems.push(item);
            }
        }

        const result = db.prepare(`
            INSERT INTO trades (sender_id, sender_username, receiver_id, receiver_username)
            VALUES (?, ?, ?, ?)
        `).run(senderId, req.user.username, receiver.id, receiver.username);

        const insertTradeItem = db.prepare(`
            INSERT INTO trade_items (trade_id, item_id, pokemon_name, rarity, sprite_url, is_shiny, from_user)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of validItems) {
            insertTradeItem.run(result.lastInsertRowid, item.id, item.pokemon_name, item.rarity, item.sprite_url, item.is_shiny, senderId);
        }
        for (const item of requestedItems) {
            insertTradeItem.run(result.lastInsertRowid, item.id, item.pokemon_name, item.rarity, item.sprite_url, item.is_shiny, receiver.id);
        }

        const offeredItems = validItems.map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
        const requestedPreviewItems = requestedItems.map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
        const fairness = computeTradeSummaryFromItems(offeredItems, requestedPreviewItems);
        saveTradeMeta(result.lastInsertRowid, {
            offer_value: fairness.offerValue,
            request_value: fairness.requestValue,
            trade_difference: fairness.difference,
            trade_ratio: fairness.ratio,
            trade_warning_level: fairness.warningLevel,
            requires_free_accept: fairness.isFreeTrade ? 1 : 0,
            sender_accepts_free: fairness.isFreeTrade ? 1 : 0,
            receiver_accepts_free: 0,
            message: tradeMessage
        });

        const progressState = readAppState();
        const senderRow = safeArray(progressState.tables?.users).find((row) => Number(row.id) === Number(senderId));
        if (senderRow) {
            ensureUserFeatureDefaults(senderRow);
            syncUserDailyState(senderRow);
            senderRow.daily_trades_sent = Number(senderRow.daily_trades_sent || 0) + 1;
            awardUserBonuses(senderRow, { xp: 15 });
            writeJson(appDataPath, progressState);
        }

        notifyUser(receiver.id, 'trade_request', 'New trade request', `${req.user.username} sent you a trade request with ${validItems.length} offered item(s)${requestedItems.length ? ` and requested ${requestedItems.length} item(s) from you` : ''}${fairness.isFreeTrade ? '. This is a one-sided trade and requires your confirmation.' : ''}${tradeMessage ? ` Message: ${tradeMessage}` : ''}.`, '/trading', { tradeId: result.lastInsertRowid, senderId, fairness, message: tradeMessage });
        notifyUser(senderId, 'trade_sent', 'Trade request sent', `Your trade request to ${receiver.username} is pending.${fairness.warningLevel !== 'balanced' ? ` Trade balance: ${fairness.offerValue > fairness.requestValue ? 'you are overpaying' : fairness.requestValue > fairness.offerValue ? 'you are asking for more value' : 'review the balance before it is accepted'}.` : ''}`, '/trading', { tradeId: result.lastInsertRowid, receiverId: receiver.id, fairness });

        res.json({ success: true, tradeId: result.lastInsertRowid, requestedCount: requestedItems.length, fairness });
    } catch (error) {
        console.error('Create trade error:', error);
        res.status(500).json({ error: 'Failed to create trade' });
    }
});

// Update trade status
router.put('/trades/:id', isAuthenticated, (req, res) => {
    try {
        const tradeId = Number(req.params.id);
        const { status, receiverItemIds = [], receiverAcceptFree = false } = req.body;
        const userId = req.user.id;

        const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
        if (!trade) {
            return res.status(404).json({ error: 'Trade not found' });
        }

        if (Number(trade.receiver_id) !== Number(userId)) {
            return res.status(403).json({ error: 'Only the receiver can update trade status' });
        }

        if (trade.status !== 'pending') {
            return res.status(400).json({ error: 'This trade is no longer pending' });
        }

        if (!['accepted', 'declined'].includes(status)) {
            return res.status(400).json({ error: 'Invalid trade status' });
        }

        const existingTradeItems = db.prepare('SELECT * FROM trade_items WHERE trade_id = ?').all(tradeId);
        const senderItems = existingTradeItems.filter((item) => Number(item.from_user) === Number(trade.sender_id));
        const previousReceiverItems = existingTradeItems.filter((item) => Number(item.from_user) === Number(trade.receiver_id));

        if (status === 'accepted') {
            const requestedReceiverIds = Array.isArray(receiverItemIds) ? receiverItemIds.map((value) => Number(value)).filter(Boolean) : previousReceiverItems.map((item) => Number(item.item_id));
            const nextReceiverItems = [];

            for (const itemId of requestedReceiverIds) {
                const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, userId);
                if (item) ensureInventoryMetaDefaults(item);
                if (!item || Number(item.is_listed) || Number(item.is_locked || 0)) {
                    return res.status(400).json({ error: 'One of the requested return items is unavailable' });
                }
                nextReceiverItems.push(item);
            }

            // sync receiver-side trade item previews to the exact accepted set
            const tradeState = readAppState();
            const tradeItemsTable = Array.isArray(tradeState.tables.trade_items) ? tradeState.tables.trade_items : [];
            tradeState.tables.trade_items = tradeItemsTable.filter((item) => !(Number(item.trade_id) === Number(tradeId) && Number(item.from_user) === Number(trade.receiver_id)));
            const nextTradeItemId = () => {
                const current = Number(tradeState.meta?.nextIds?.trade_items || 1);
                if (!tradeState.meta) tradeState.meta = { nextIds: {} };
                if (!tradeState.meta.nextIds) tradeState.meta.nextIds = {};
                tradeState.meta.nextIds.trade_items = current + 1;
                return current;
            };
            for (const item of nextReceiverItems) {
                tradeState.tables.trade_items.push({
                    id: nextTradeItemId(),
                    trade_id: tradeId,
                    item_id: item.id,
                    pokemon_name: item.pokemon_name,
                    rarity: item.rarity,
                    sprite_url: item.sprite_url,
                    is_shiny: item.is_shiny,
                    from_user: userId
                });
            }
            writeJson(appDataPath, tradeState);

            for (const item of senderItems) {
                const stillOwned = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(item.item_id, trade.sender_id);
                if (stillOwned) ensureInventoryMetaDefaults(stillOwned);
                if (!stillOwned || Number(stillOwned.is_listed) || Number(stillOwned.is_locked || 0)) {
                    return res.status(400).json({ error: 'The sender no longer owns one of the offered items' });
                }
            }

            for (const item of nextReceiverItems) {
                const stillOwned = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(item.id, trade.receiver_id);
                if (stillOwned) ensureInventoryMetaDefaults(stillOwned);
                if (!stillOwned || Number(stillOwned.is_listed) || Number(stillOwned.is_locked || 0)) {
                    return res.status(400).json({ error: 'One of your selected return items is unavailable' });
                }
            }

            const senderPreview = senderItems.map((item) => enrichInventoryLikeItem(item, { odds: item.odds }));
            const receiverPreview = nextReceiverItems.map((item) => enrichInventoryLikeItem(item, { odds: item.odds }));
            const fairness = computeTradeSummaryFromItems(senderPreview, receiverPreview);
            if (fairness.isFreeTrade && !receiverAcceptFree) {
                return res.status(400).json({ error: 'This is a one-sided trade. The receiver must explicitly agree before it can be completed.' });
            }
            saveTradeMeta(tradeId, {
                offer_value: fairness.offerValue,
                request_value: fairness.requestValue,
                trade_difference: fairness.difference,
                trade_ratio: fairness.ratio,
                trade_warning_level: fairness.warningLevel,
                requires_free_accept: fairness.isFreeTrade ? 1 : 0,
                receiver_accepts_free: fairness.isFreeTrade && receiverAcceptFree ? 1 : 0
            });

            for (const item of senderItems) {
                db.prepare('UPDATE inventory SET user_id = ?, is_listed = 0, listed_price = NULL WHERE id = ?').run(trade.receiver_id, item.item_id);
            }
            for (const item of nextReceiverItems) {
                db.prepare('UPDATE inventory SET user_id = ?, is_listed = 0, listed_price = NULL WHERE id = ?').run(trade.sender_id, item.id);
            }
        }

        db.prepare('UPDATE trades SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, tradeId);

        if (status === 'accepted') {
            notifyUser(trade.sender_id, 'trade_accepted', 'Trade accepted', `${trade.receiver_username} accepted your trade request.`, '/trading', { tradeId });
            notifyUser(trade.receiver_id, 'trade_accepted', 'Trade completed', `You completed a trade with ${trade.sender_username}.`, '/trading', { tradeId });
        } else {
            notifyUser(trade.sender_id, 'trade_declined', 'Trade declined', `${trade.receiver_username} declined your trade request.`, '/trading', { tradeId });
            notifyUser(trade.receiver_id, 'trade_declined', 'Trade declined', `You declined ${trade.sender_username}'s trade request.`, '/trading', { tradeId });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update trade error:', error);
        res.status(500).json({ error: 'Failed to update trade' });
    }
});

router.get('/users/search', isAuthenticated, (req, res) => {
    try {
        const query = String(req.query.query ?? req.query.q ?? '').trim();
        const users = searchUsersList(query, req.user.id, 12);
        res.json({ users });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

router.get('/social/summary', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        ensureSocialCollections(state);
        const presenceStore = readCommunityStore();
        const me = Number(req.user.id);
        const friends = getFriendIds(state, me)
            .map((userId) => getUserById(userId))
            .filter(Boolean)
            .map((user) => buildSocialUserCard(state, user, me, presenceStore))
            .sort((a, b) => Number(b.online) - Number(a.online) || String(a.display_name || a.username).localeCompare(String(b.display_name || b.username)));
        const incomingRequests = safeArray(state.tables.friend_requests)
            .filter((row) => String(row.status || 'pending') === 'pending' && Number(row.receiver_id) === me)
            .slice()
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
            .map((row) => ({ id: row.id, created_at: row.created_at, from: buildSocialUserCard(state, getUserById(row.sender_id), me, presenceStore) }));
        const outgoingRequests = safeArray(state.tables.friend_requests)
            .filter((row) => String(row.status || 'pending') === 'pending' && Number(row.sender_id) === me)
            .slice()
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
            .map((row) => ({ id: row.id, created_at: row.created_at, to: buildSocialUserCard(state, getUserById(row.receiver_id), me, presenceStore) }));
        const blocks = safeArray(state.tables.user_blocks)
            .filter((row) => Number(row.blocker_id) === me)
            .slice()
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
            .map((row) => ({ id: row.id, created_at: row.created_at, user: buildSocialUserCard(state, getUserById(row.blocked_id), me, presenceStore) }));
        const gifts = safeArray(state.tables.gifts)
            .filter((row) => Number(row.sender_id) === me || Number(row.recipient_id) === me)
            .slice()
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        const pendingIncoming = gifts.filter((row) => Number(row.recipient_id) === me && String(row.status || 'pending') === 'pending').map((row) => buildGiftSummary(state, row, me, presenceStore));
        const pendingOutgoing = gifts.filter((row) => Number(row.sender_id) === me && String(row.status || 'pending') === 'pending').map((row) => buildGiftSummary(state, row, me, presenceStore));
        const giftHistory = gifts.slice(0, 24).map((row) => buildGiftSummary(state, row, me, presenceStore));
        const blockedIds = new Set(blocks.map((entry) => Number(entry.user?.id || 0)).filter(Boolean));
        const friendIds = new Set(friends.map((entry) => Number(entry.id)));
        const suggested = getAllUsers()
            .filter((user) => Number(user.id) !== me)
            .filter((user) => !friendIds.has(Number(user.id)))
            .filter((user) => !blockedIds.has(Number(user.id)))
            .filter((user) => getRelationshipStatus(state, me, user.id) === 'none')
            .slice(0, 10)
            .map((user) => buildSocialUserCard(state, user, me, presenceStore));
        res.json({
            stats: {
                friends: friends.length,
                online_friends: friends.filter((entry) => entry.online).length,
                incoming_requests: incomingRequests.length,
                outgoing_requests: outgoingRequests.length,
                pending_gifts: pendingIncoming.length + pendingOutgoing.length
            },
            friends,
            incoming_requests: incomingRequests,
            outgoing_requests: outgoingRequests,
            blocks,
            suggested,
            gifts: {
                incoming_pending: pendingIncoming,
                outgoing_pending: pendingOutgoing,
                history: giftHistory
            },
            giftable_inventory: getGiftableInventoryForUser(me, 36),
            activity: buildFriendActivityFeed(state, me, 12)
        });
    } catch (error) {
        console.error('Social summary error:', error);
        res.status(500).json({ error: 'Failed to load social features' });
    }
});

router.get('/social/search', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        ensureSocialCollections(state);
        const presenceStore = readCommunityStore();
        const me = Number(req.user.id);
        const query = normalizeText(req.query.query || req.query.q || '').toLowerCase();
        const users = getAllUsers()
            .filter((user) => Number(user.id) !== me)
            .filter((user) => {
                if (!query) return true;
                return String(user.username || '').toLowerCase().includes(query)
                    || String(user.display_name || '').toLowerCase().includes(query)
                    || String(user.region || '').toLowerCase().includes(query);
            })
            .slice(0, 18)
            .map((user) => buildSocialUserCard(state, user, me, presenceStore));
        res.json({ users });
    } catch (error) {
        console.error('Social search error:', error);
        res.status(500).json({ error: 'Failed to search players' });
    }
});

router.post('/social/friends/request', isAuthenticated, (req, res) => {
    try {
        const targetId = Number(req.body.userId || req.body.targetId || 0);
        const me = Number(req.user.id);
        if (!targetId || targetId === me) return res.status(400).json({ error: 'Choose another player' });
        const state = readAppState();
        ensureSocialCollections(state);
        const targetUser = safeArray(state.tables?.users).find((row) => Number(row.id) === targetId);
        if (!targetUser) return res.status(404).json({ error: 'Player not found' });
        if (isBlockedPair(state, me, targetId)) return res.status(400).json({ error: 'Friend requests are blocked between these accounts' });
        if (areFriends(state, me, targetId)) return res.status(400).json({ error: 'You are already friends' });
        const existing = getPendingFriendRequestBetween(state, me, targetId);
        if (existing) {
            if (Number(existing.receiver_id) === me) {
                existing.status = 'accepted';
                existing.responded_at = new Date().toISOString();
                const [low, high] = getSortedUserPair(me, targetId);
                state.tables.friendships.push({
                    id: nextStateId(state, 'friendships'),
                    user_a_id: low,
                    user_b_id: high,
                    status: 'accepted',
                    created_at: existing.created_at,
                    accepted_at: existing.responded_at
                });
                pushAuditLog(state, req.user, 'friend_accept_auto', { type: 'user', id: targetUser.id, label: targetUser.username }, { requestId: existing.id });
                writeJson(appDataPath, state);
                notifyUser(targetId, 'friend_accept', 'Friend request accepted', `${req.user.username} accepted your friend request.`, '/social', { requestId: existing.id, userId: me });
                notifyUser(me, 'friend_accept', 'Friend added', `You are now friends with ${targetUser.username}.`, '/social', { requestId: existing.id, userId: targetId });
                return res.json({ success: true, accepted: true, friendship: { userId: targetId } });
            }
            return res.status(400).json({ error: 'A friend request is already pending' });
        }
        const requestRow = {
            id: nextStateId(state, 'friend_requests'),
            sender_id: me,
            receiver_id: targetId,
            status: 'pending',
            created_at: new Date().toISOString(),
            responded_at: null
        };
        state.tables.friend_requests.push(requestRow);
        pushAuditLog(state, req.user, 'friend_request_send', { type: 'user', id: targetUser.id, label: targetUser.username }, { requestId: requestRow.id });
        writeJson(appDataPath, state);
        notifyUser(targetId, 'friend_request', 'New friend request', `${req.user.username} wants to add you as a friend.`, '/social', { requestId: requestRow.id, userId: me });
        res.json({ success: true, request: requestRow });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

router.post('/social/friends/:id/respond', isAuthenticated, (req, res) => {
    try {
        const requestId = Number(req.params.id);
        const action = normalizeText(req.body.action || '').toLowerCase();
        const me = Number(req.user.id);
        if (!['accept', 'decline'].includes(action)) return res.status(400).json({ error: 'Invalid response' });
        const state = readAppState();
        ensureSocialCollections(state);
        const requestRow = safeArray(state.tables.friend_requests).find((row) => Number(row.id) === requestId && Number(row.receiver_id) === me && String(row.status || 'pending') === 'pending');
        if (!requestRow) return res.status(404).json({ error: 'Friend request not found' });
        const sender = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(requestRow.sender_id));
        if (!sender) return res.status(404).json({ error: 'Request sender not found' });
        requestRow.status = action === 'accept' ? 'accepted' : 'declined';
        requestRow.responded_at = new Date().toISOString();
        if (action === 'accept' && !areFriends(state, me, sender.id)) {
            const [low, high] = getSortedUserPair(me, sender.id);
            state.tables.friendships.push({
                id: nextStateId(state, 'friendships'),
                user_a_id: low,
                user_b_id: high,
                status: 'accepted',
                created_at: requestRow.created_at,
                accepted_at: requestRow.responded_at
            });
        }
        pushAuditLog(state, req.user, `friend_request_${action}`, { type: 'user', id: sender.id, label: sender.username }, { requestId: requestRow.id });
        writeJson(appDataPath, state);
        notifyUser(sender.id, action === 'accept' ? 'friend_accept' : 'friend_decline', action === 'accept' ? 'Friend request accepted' : 'Friend request declined', action === 'accept' ? `${req.user.username} accepted your friend request.` : `${req.user.username} declined your friend request.`, '/social', { requestId: requestRow.id, userId: me });
        if (action === 'accept') notifyUser(me, 'friend_accept', 'Friend added', `You are now friends with ${sender.username}.`, '/social', { requestId: requestRow.id, userId: sender.id });
        res.json({ success: true, status: requestRow.status });
    } catch (error) {
        console.error('Friend response error:', error);
        res.status(500).json({ error: 'Failed to update friend request' });
    }
});

router.delete('/social/friends/:id', isAuthenticated, (req, res) => {
    try {
        const friendId = Number(req.params.id);
        const me = Number(req.user.id);
        const state = readAppState();
        ensureSocialCollections(state);
        const friend = safeArray(state.tables?.users).find((row) => Number(row.id) === friendId);
        if (!friend) return res.status(404).json({ error: 'Player not found' });
        if (!removeFriendshipBetween(state, me, friendId)) return res.status(404).json({ error: 'Friendship not found' });
        pushAuditLog(state, req.user, 'friend_remove', { type: 'user', id: friend.id, label: friend.username });
        writeJson(appDataPath, state);
        notifyUser(friend.id, 'friend_remove', 'Friend removed', `${req.user.username} removed the friendship link.`, '/social', { userId: me });
        res.json({ success: true });
    } catch (error) {
        console.error('Friend remove error:', error);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

router.post('/social/friends/:id/alias', isAuthenticated, (req, res) => {
    try {
        const friendId = Number(req.params.id);
        const me = Number(req.user.id);
        const state = readAppState();
        ensureSocialCollections(state);
        const friend = safeArray(state.tables?.users).find((row) => Number(row.id) === friendId);
        if (!friend) return res.status(404).json({ error: 'Player not found' });
        if (!areFriends(state, me, friendId)) return res.status(404).json({ error: 'Friendship not found' });
        const alias = setFriendAlias(state, me, friendId, req.body?.alias || '');
        writeJson(appDataPath, state);
        res.json({ success: true, alias });
    } catch (error) {
        console.error('Friend alias error:', error);
        res.status(500).json({ error: 'Failed to update friend nickname' });
    }
});

router.post('/social/blocks', isAuthenticated, (req, res) => {
    try {
        const targetId = Number(req.body.userId || req.body.targetId || 0);
        const me = Number(req.user.id);
        if (!targetId || targetId === me) return res.status(400).json({ error: 'Choose another player' });
        const state = readAppState();
        ensureSocialCollections(state);
        const targetUser = safeArray(state.tables?.users).find((row) => Number(row.id) === targetId);
        if (!targetUser) return res.status(404).json({ error: 'Player not found' });
        if (isUserBlockedBy(state, me, targetId)) return res.json({ success: true, alreadyBlocked: true });
        state.tables.user_blocks.push({
            id: nextStateId(state, 'user_blocks'),
            blocker_id: me,
            blocked_id: targetId,
            created_at: new Date().toISOString()
        });
        removeFriendshipBetween(state, me, targetId);
        state.tables.friend_requests = safeArray(state.tables.friend_requests).filter((row) => !((Number(row.sender_id) === me && Number(row.receiver_id) === targetId) || (Number(row.sender_id) === targetId && Number(row.receiver_id) === me)) || String(row.status || 'pending') !== 'pending');
        safeArray(state.tables.gifts)
            .filter((row) => String(row.status || 'pending') === 'pending')
            .filter((row) => (Number(row.sender_id) === me && Number(row.recipient_id) === targetId) || (Number(row.sender_id) === targetId && Number(row.recipient_id) === me))
            .forEach((row) => cancelPendingGiftWithState(state, row, 'cancelled'));
        pushAuditLog(state, req.user, 'user_block', { type: 'user', id: targetUser.id, label: targetUser.username });
        writeJson(appDataPath, state);
        res.json({ success: true });
    } catch (error) {
        console.error('User block error:', error);
        res.status(500).json({ error: 'Failed to block player' });
    }
});

router.delete('/social/blocks/:id', isAuthenticated, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const me = Number(req.user.id);
        const state = readAppState();
        ensureSocialCollections(state);
        const before = safeArray(state.tables.user_blocks).length;
        state.tables.user_blocks = safeArray(state.tables.user_blocks).filter((row) => !(Number(row.blocker_id) === me && Number(row.blocked_id) === targetId));
        if (before === state.tables.user_blocks.length) return res.status(404).json({ error: 'Block entry not found' });
        writeJson(appDataPath, state);
        res.json({ success: true });
    } catch (error) {
        console.error('User unblock error:', error);
        res.status(500).json({ error: 'Failed to unblock player' });
    }
});

router.post('/social/gifts/credits', isAuthenticated, (req, res) => {
    try {
        const recipientId = Number(req.body.recipientId || req.body.userId || 0);
        const amount = Number(req.body.amount || 0);
        const note = normalizeText(req.body.note || '').slice(0, 200);
        const me = Number(req.user.id);
        if (!recipientId || recipientId === me) return res.status(400).json({ error: 'Choose a valid friend' });
        if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Enter a valid gift amount' });
        const state = readAppState();
        ensureSocialCollections(state);
        if (!areFriends(state, me, recipientId)) return res.status(400).json({ error: 'Credit gifts are only available between friends' });
        if (isBlockedPair(state, me, recipientId)) return res.status(400).json({ error: 'Gifts are blocked between these accounts' });
        const sender = safeArray(state.tables?.users).find((row) => Number(row.id) === me);
        const recipient = safeArray(state.tables?.users).find((row) => Number(row.id) === recipientId);
        if (!sender || !recipient) return res.status(404).json({ error: 'Player not found' });
        if (Number(sender.balance || 0) < amount) return res.status(400).json({ error: 'Insufficient balance' });
        sender.balance = Number(sender.balance || 0) - amount;
        state.tables.transactions = safeArray(state.tables.transactions);
        state.tables.transactions.push({
            id: nextStateId(state, 'transactions'),
            user_id: me,
            type: 'gift_sent',
            amount: -Number(amount.toFixed(2)),
            description: `Sent a credit gift to ${recipient.username}`,
            created_at: new Date().toISOString()
        });
        const gift = {
            id: nextStateId(state, 'gifts'),
            type: 'credits',
            sender_id: me,
            recipient_id: recipientId,
            amount: Number(amount.toFixed(2)),
            item_id: null,
            item_snapshot: null,
            note,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        state.tables.gifts.push(gift);
        pushAuditLog(state, req.user, 'gift_send_credits', { type: 'user', id: recipient.id, label: recipient.username }, { amount: gift.amount, giftId: gift.id });
        writeJson(appDataPath, state);
        notifyUser(recipientId, 'gift_received', 'Credit gift received', `${req.user.username} sent you ${formatAmount(gift.amount)} in credits.`, '/social', { giftId: gift.id, amount: gift.amount });
        notifyUser(me, 'gift_sent', 'Gift sent', `You sent ${formatAmount(gift.amount)} to ${recipient.username}.`, '/social', { giftId: gift.id, amount: gift.amount });
        res.json({ success: true, gift: buildGiftSummary(state, gift, me) });
    } catch (error) {
        console.error('Credit gift error:', error);
        res.status(500).json({ error: 'Failed to send credit gift' });
    }
});

router.post('/social/gifts/item', isAuthenticated, (req, res) => {
    try {
        const recipientId = Number(req.body.recipientId || req.body.userId || 0);
        const itemId = Number(req.body.itemId || 0);
        const note = normalizeText(req.body.note || '').slice(0, 200);
        const me = Number(req.user.id);
        if (!recipientId || recipientId === me) return res.status(400).json({ error: 'Choose a valid friend' });
        if (!itemId) return res.status(400).json({ error: 'Choose an item to gift' });
        const state = readAppState();
        ensureSocialCollections(state);
        if (!areFriends(state, me, recipientId)) return res.status(400).json({ error: 'Item gifts are only available between friends' });
        if (isBlockedPair(state, me, recipientId)) return res.status(400).json({ error: 'Gifts are blocked between these accounts' });
        const recipient = safeArray(state.tables?.users).find((row) => Number(row.id) === recipientId);
        const item = safeArray(state.tables?.inventory).find((row) => Number(row.id) === itemId && Number(row.user_id) === me);
        if (!recipient) return res.status(404).json({ error: 'Player not found' });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        ensureInventoryMetaDefaults(item);
        if (Number(item.is_listed || 0) || Number(item.is_locked || 0) || item.pending_gift_id) return res.status(400).json({ error: 'This item is not available to gift' });
        const gift = {
            id: nextStateId(state, 'gifts'),
            type: 'item',
            sender_id: me,
            recipient_id: recipientId,
            amount: 0,
            item_id: item.id,
            item_snapshot: JSON.parse(JSON.stringify(enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }))),
            note,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        item.pending_gift_id = gift.id;
        item.is_locked = 1;
        state.tables.gifts.push(gift);
        pushAuditLog(state, req.user, 'gift_send_item', { type: 'user', id: recipient.id, label: recipient.username }, { giftId: gift.id, itemId: item.id, pokemon: item.pokemon_name });
        writeJson(appDataPath, state);
        notifyUser(recipientId, 'gift_received', 'Pokémon gift received', `${req.user.username} sent you ${item.pokemon_name}.`, '/social', { giftId: gift.id, itemId: item.id });
        notifyUser(me, 'gift_sent', 'Gift sent', `You sent ${item.pokemon_name} to ${recipient.username}.`, '/social', { giftId: gift.id, itemId: item.id });
        res.json({ success: true, gift: buildGiftSummary(state, gift, me) });
    } catch (error) {
        console.error('Item gift error:', error);
        res.status(500).json({ error: 'Failed to send item gift' });
    }
});

router.post('/social/gifts/:id/claim', isAuthenticated, (req, res) => {
    try {
        const giftId = Number(req.params.id);
        const me = Number(req.user.id);
        const state = readAppState();
        ensureSocialCollections(state);
        const gift = safeArray(state.tables.gifts).find((row) => Number(row.id) === giftId && Number(row.recipient_id) === me && String(row.status || 'pending') === 'pending');
        if (!gift) return res.status(404).json({ error: 'Gift not found' });
        const sender = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(gift.sender_id));
        const recipient = safeArray(state.tables?.users).find((row) => Number(row.id) === me);
        if (!recipient) return res.status(404).json({ error: 'Recipient account not found' });
        if (String(gift.type || '') === 'credits') {
            recipient.balance = Number(recipient.balance || 0) + Number(gift.amount || 0);
            recipient.total_earned = Number(recipient.total_earned || 0) + Number(gift.amount || 0);
            state.tables.transactions = safeArray(state.tables.transactions);
            state.tables.transactions.push({
                id: nextStateId(state, 'transactions'),
                user_id: me,
                type: 'gift_received',
                amount: Number(gift.amount || 0),
                description: `Claimed a credit gift from ${sender?.username || 'a friend'}`,
                created_at: new Date().toISOString()
            });
        } else if (String(gift.type || '') === 'item') {
            const item = safeArray(state.tables?.inventory).find((row) => Number(row.id) === Number(gift.item_id) && Number(row.user_id) === Number(gift.sender_id));
            if (!item || Number(item.pending_gift_id || 0) !== gift.id) return res.status(400).json({ error: 'This gift item is no longer available' });
            item.user_id = me;
            item.is_listed = 0;
            item.listed_price = null;
            item.is_locked = 0;
            item.pending_gift_id = null;
        }
        gift.status = 'claimed';
        gift.claimed_at = new Date().toISOString();
        gift.updated_at = gift.claimed_at;
        pushAuditLog(state, req.user, 'gift_claim', { type: 'gift', id: gift.id, label: gift.type }, { senderId: gift.sender_id });
        writeJson(appDataPath, state);
        if (sender) notifyUser(sender.id, 'gift_claimed', 'Gift claimed', `${req.user.username} claimed your gift.`, '/social', { giftId: gift.id });
        notifyUser(me, 'gift_claimed', 'Gift claimed', `You claimed a gift from ${sender?.username || 'a friend'}.`, '/social', { giftId: gift.id });
        res.json({ success: true, gift: buildGiftSummary(state, gift, me) });
    } catch (error) {
        console.error('Gift claim error:', error);
        res.status(500).json({ error: 'Failed to claim gift' });
    }
});

router.post('/social/gifts/:id/decline', isAuthenticated, (req, res) => {
    try {
        const giftId = Number(req.params.id);
        const me = Number(req.user.id);
        const state = readAppState();
        ensureSocialCollections(state);
        const gift = safeArray(state.tables.gifts).find((row) => Number(row.id) === giftId && Number(row.recipient_id) === me && String(row.status || 'pending') === 'pending');
        if (!gift) return res.status(404).json({ error: 'Gift not found' });
        cancelPendingGiftWithState(state, gift, 'declined');
        writeJson(appDataPath, state);
        notifyUser(gift.sender_id, 'gift_declined', 'Gift declined', `${req.user.username} declined your gift.`, '/social', { giftId: gift.id });
        res.json({ success: true, gift: buildGiftSummary(state, gift, me) });
    } catch (error) {
        console.error('Gift decline error:', error);
        res.status(500).json({ error: 'Failed to decline gift' });
    }
});

router.post('/social/gifts/:id/cancel', isAuthenticated, (req, res) => {
    try {
        const giftId = Number(req.params.id);
        const me = Number(req.user.id);
        const state = readAppState();
        ensureSocialCollections(state);
        const gift = safeArray(state.tables.gifts).find((row) => Number(row.id) === giftId && Number(row.sender_id) === me && String(row.status || 'pending') === 'pending');
        if (!gift) return res.status(404).json({ error: 'Gift not found' });
        cancelPendingGiftWithState(state, gift, 'cancelled');
        writeJson(appDataPath, state);
        notifyUser(gift.recipient_id, 'gift_cancelled', 'Gift cancelled', `${req.user.username} cancelled a pending gift.`, '/social', { giftId: gift.id });
        res.json({ success: true, gift: buildGiftSummary(state, gift, me) });
    } catch (error) {
        console.error('Gift cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel gift' });
    }
});

router.get('/users/:id/tradable-items', isAuthenticated, (req, res) => {
    try {
        const userId = Number(req.params.id);
        if (!userId || Number.isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }
        const user = getUserById(userId);
        if (!user || Number(user.id) === Number(req.user.id)) {
            return res.json({ items: [], user: user ? { id: user.id, username: user.username } : null });
        }
        res.json({
            user: { id: user.id, username: user.username, display_name: getUserDisplayName(user), avatar_url: user.avatar_url || null, avatar_decoration: normalizeAvatarDecoration(user.avatar_decoration || 'none'), badges: getUserBadges(user).map(serializeBadge), region: user.region || '', hide_inventory: Boolean(Number(user.hide_inventory || 0)) },
            items: getTradableInventoryForUser(userId, 24)
        });
    } catch (error) {
        console.error('Tradable items error:', error);
        res.status(500).json({ error: 'Failed to fetch tradable items' });
    }
});


router.get('/pokemon/search', isAuthenticated, async (req, res) => {
    try {
        const query = normalizeText(req.query.query || req.query.q || '').toLowerCase();
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 24);
        const names = await getPokemonNameCache();
        let matches = [];
        if (query) {
            matches = names.filter((name) => name.includes(query));
            matches.sort((a, b) => {
                const aStarts = a.startsWith(query) ? 0 : 1;
                const bStarts = b.startsWith(query) ? 0 : 1;
                if (aStarts !== bStarts) return aStarts - bStarts;
                return a.localeCompare(b);
            });
        } else {
            matches = names.slice().sort((a, b) => a.localeCompare(b));
        }
        const results = matches.slice(0, limit).map((name) => ({
            name,
            label: name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
            base_name: String(name).split('-')[0],
            sprite_url: buildSpriteUrl(name)
        }));
        res.json({ pokemon: results });
    } catch (error) {
        console.error('Pokemon search error:', error);
        res.status(500).json({ error: 'Failed to search Pokémon' });
    }
});

router.get('/profiles/:identifier', optionalAuth, (req, res) => {
    try {
        const identifier = String(req.params.identifier || '').trim();
        const user = /^\d+$/.test(identifier) ? getUserById(Number(identifier)) : getUserByUsernameLike(decodeURIComponent(identifier));
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isSelf = Boolean(req.user && Number(req.user.id) === Number(user.id));
        const hideInventory = Boolean(Number(user.hide_inventory || 0));
        const inventory = getTable('inventory').filter((item) => Number(item.user_id) === Number(user.id)).map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
        const openings = getTable('openings').filter((item) => Number(item.user_id) === Number(user.id)).slice().sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || ''))).slice(0, 10).map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
        const canViewInventory = isSelf || !hideInventory;
        const socialState = readAppState();
        ensureSocialCollections(socialState);
        ensureUserAccountDefaults(user);
        const relationshipStatus = req.user ? getRelationshipStatus(socialState, req.user.id, user.id) : 'none';
        const featuredIds = new Set(safeArray(user.featured_item_ids).map((value) => Number(value)).filter(Boolean));
        const pinnedInventory = inventory.filter((item) => featuredIds.has(Number(item.id)));
        const fallbackInventory = inventory.slice().sort((a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0));
        const visibleFeaturedInventory = canViewInventory ? (pinnedInventory.length ? pinnedInventory.slice(0, 6) : fallbackInventory.slice(0, 12)) : [];
        const publicUser = {
            id: user.id,
            username: user.username,
            display_name: getUserDisplayName(user),
            email: isSelf ? user.email : null,
            avatar_url: user.avatar_url || null,
            banner_url: user.banner_url || null,
            profile_background_url: user.profile_background_url || null,
            avatar_decoration: normalizeAvatarDecoration(user.avatar_decoration || 'none'),
            profile_status: user.profile_status || '',
            profile_bio: user.profile_bio || '',
            profile_theme: normalizeProfileTheme(user.profile_theme || 'default'),
            featured_item_ids: safeArray(user.featured_item_ids).map((value) => Number(value)).filter(Boolean),
            pronouns: user.pronouns || '',
            region: user.region || '',
            badges: getUserBadges(user).map(serializeBadge),
            custom_role: user.custom_role || '',
            account_status: user.account_status || 'active',
            created_at: user.created_at,
            balance: Number(user.balance || 0),
            cases_opened: Number(user.cases_opened || 0),
            total_spent: Number(user.total_spent || 0),
            total_earned: Number(user.total_earned || 0),
            free_rolls: Number(user.free_rolls || 0),
            hide_inventory: hideInventory,
            inventory_count: inventory.length,
            inventory_value: Number(inventory.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2)),
            profile_link: getProfileLink(user),
            username_history: safeArray(user.username_history).slice(-12).reverse(),
            pity: getPitySummaryForUser(user),
            progression: getProgressionSummary(user),
            daily_claim_streak: Number(user.daily_claim_streak || 0),
            total_xp: Number(user.total_xp || 0),
            favorite_case_count: safeArray(user.favorite_case_ids).length,
            wishlist_preview: buildWishlistPreview(user),
            achievement_summary: getUserAchievementSummary(user.id).progress,
            media_history: isSelf ? mediaHistoryPayload(user) : undefined
        };
        res.json({
            user: publicUser,
            featuredInventory: visibleFeaturedInventory,
            recentOpens: openings,
            guestbook_preview: buildGuestbookPreview(socialState, user.id, 6),
            canTrade: Boolean(req.user && Number(req.user.id) !== Number(user.id) && !isBlockedPair(socialState, req.user.id, user.id)),
            canEdit: isSelf,
            canViewInventory,
            relationship_status: relationshipStatus,
            canFriend: Boolean(req.user && Number(req.user.id) !== Number(user.id) && ['none', 'incoming', 'outgoing', 'friends'].includes(relationshipStatus)),
            notFound: false
        });
    } catch (error) {
        console.error('Profile lookup error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.put('/profile', isAuthenticated, (req, res) => {
    try {
        const username = normalizeText(req.body.username || req.user.username);
        const displayName = normalizeText(req.body.display_name || req.body.displayName || username).slice(0, 24);
        const avatarUrl = req.body.avatar_url ?? req.body.avatarUrl ?? '';
        const bannerUrl = req.body.banner_url ?? req.body.bannerUrl ?? undefined;
        const profileBackgroundUrl = req.body.profile_background_url ?? req.body.profileBackgroundUrl ?? undefined;
        const avatarDecoration = req.body.avatar_decoration ?? req.body.avatarDecoration ?? undefined;
        const profileStatus = normalizeText(req.body.profile_status ?? req.body.profileStatus ?? '').slice(0, 80);
        const profileBio = normalizeText(req.body.profile_bio ?? req.body.profileBio ?? '').slice(0, 320);
        const profileTheme = req.body.profile_theme ?? req.body.profileTheme ?? undefined;
        const pronouns = normalizeText(req.body.pronouns || '').slice(0, 24);
        const region = normalizeText(req.body.region || '').slice(0, 48);
        const hideInventory = req.body.hide_inventory === undefined ? null : (req.body.hide_inventory ? 1 : 0);
        const state = readAppState();
        ensureStateMeta(state);
        const users = safeArray(state.tables?.users);
        const currentUser = users.find((row) => Number(row.id) === Number(req.user.id));
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        ensureUserAccountDefaults(currentUser);
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters using letters, numbers, or underscores' });
        }
        const conflict = users.find((row) => Number(row.id) !== Number(req.user.id) && (String(row.username).toLowerCase() === username.toLowerCase()));
        if (conflict) {
            return res.status(400).json({ error: 'That username is already taken' });
        }
        const previousUsername = currentUser.username;
        buildUserAccountSnapshot(state, req.user.id, { actorId: req.user.id, reason: 'Profile settings updated', label: 'Profile change' });
        const originalProfileState = JSON.stringify({
            username: currentUser.username,
            display_name: currentUser.display_name,
            avatar_url: currentUser.avatar_url || '',
            banner_url: currentUser.banner_url || '',
            profile_background_url: currentUser.profile_background_url || '',
            avatar_decoration: normalizeAvatarDecoration(currentUser.avatar_decoration || 'none'),
            profile_status: currentUser.profile_status || '',
            profile_bio: currentUser.profile_bio || '',
            profile_theme: normalizeProfileTheme(currentUser.profile_theme || 'default'),
            featured_item_ids: safeArray(currentUser.featured_item_ids).map((value) => Number(value)).filter(Boolean),
            pronouns: currentUser.pronouns || '',
            region: currentUser.region || '',
            hide_inventory: Number(currentUser.hide_inventory || 0)
        });
        if (!Array.isArray(currentUser.username_history)) currentUser.username_history = [];
        if (previousUsername && previousUsername !== username) {
            const nextHistory = currentUser.username_history
                .filter((entry) => normalizeText(entry).toLowerCase() !== normalizeText(username).toLowerCase() && normalizeText(entry).toLowerCase() !== normalizeText(previousUsername).toLowerCase());
            nextHistory.push(previousUsername);
            currentUser.username_history = nextHistory.slice(-12);
        }
        currentUser.username = username;
        currentUser.display_name = displayName || username;
        applyUserMediaField(currentUser, 'avatar_url', 'avatar_history', avatarUrl);
        if (bannerUrl !== undefined) applyUserMediaField(currentUser, 'banner_url', 'banner_history', bannerUrl);
        if (profileBackgroundUrl !== undefined) applyUserMediaField(currentUser, 'profile_background_url', 'profile_background_history', profileBackgroundUrl);
        if (avatarDecoration !== undefined) currentUser.avatar_decoration = normalizeAvatarDecoration(avatarDecoration, currentUser.avatar_decoration || 'none');
        currentUser.profile_status = profileStatus;
        currentUser.profile_bio = profileBio;
        if (profileTheme !== undefined) currentUser.profile_theme = normalizeProfileTheme(profileTheme, currentUser.profile_theme || 'default');
        currentUser.pronouns = pronouns;
        currentUser.region = region;
        if (hideInventory !== null) currentUser.hide_inventory = hideInventory;

        safeArray(state.tables?.inventory).forEach((row) => {
            if (Number(row.original_owner_id || 0) === Number(req.user.id)) {
                row.original_owner_username = username;
            }
        });
        safeArray(state.tables?.openings).forEach((row) => {
            if (Number(row.user_id) === Number(req.user.id)) {
                row.username = username;
            }
        });
        safeArray(state.tables?.marketplace).forEach((row) => {
            if (Number(row.seller_id) === Number(req.user.id)) row.seller_username = username;
        });
        safeArray(state.tables?.trades).forEach((row) => {
            if (Number(row.sender_id) === Number(req.user.id)) row.sender_username = username;
            if (Number(row.receiver_id) === Number(req.user.id)) row.receiver_username = username;
        });

        const roomStore = readCaseVsStore();
        safeArray(roomStore.rooms).forEach((room) => {
            safeArray(room.players).forEach((player) => {
                if (Number(player.user_id) === Number(req.user.id)) {
                    player.username = username;
                    player.display_name = currentUser.display_name || username;
                }
            });
            safeArray(room.rounds_data).forEach((round) => {
                safeArray(round.pulls).forEach((pull) => {
                    if (Number(pull.user_id) === Number(req.user.id)) pull.username = username;
                });
            });
            if (Number(room.winner_id || 0) === Number(req.user.id)) room.winner_username = username;
        });
        writeCaseVsStore(roomStore);

        const communityStore = readCommunityStore();
        safeArray(communityStore.messages).forEach((message) => {
            if (Number(message.user_id || 0) === Number(req.user.id)) {
                message.username = username;
                message.display_name = currentUser.display_name || username;
                message.avatar_url = currentUser.avatar_url || null;
                message.region = currentUser.region || '';
                message.pronouns = currentUser.pronouns || '';
            }
        });
        if (communityStore.presence && communityStore.presence[req.user.id]) {
            communityStore.presence[req.user.id].username = username;
            communityStore.presence[req.user.id].display_name = currentUser.display_name || username;
            communityStore.presence[req.user.id].avatar_url = currentUser.avatar_url || null;
            communityStore.presence[req.user.id].region = currentUser.region || '';
        }
        writeCommunityStore(communityStore);

        writeJson(appDataPath, state);
        res.json({ success: true, user: getUserById(req.user.id) });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

function serializeCaseVsPull(pull) {
    if (!pull) return pull;
    const { track, ...rest } = pull;
    return rest;
}

function compareCaseVsPulls(a, b) {
    const scoreDelta = Number(b?.score || 0) - Number(a?.score || 0);
    if (scoreDelta !== 0) return scoreDelta;
    const valueDelta = Number(b?.estimated_value || 0) - Number(a?.estimated_value || 0);
    if (valueDelta !== 0) return valueDelta;
    const rarityDelta = Number(RARITY_SCORE[b?.rarity] || 0) - Number(RARITY_SCORE[a?.rarity] || 0);
    if (rarityDelta !== 0) return rarityDelta;
    const oddsDelta = Number(b?.odds || 0) - Number(a?.odds || 0);
    if (oddsDelta !== 0) return oddsDelta;
    return String(b?.pokemon_name || '').localeCompare(String(a?.pokemon_name || ''));
}

function isCaseVsTie(a, b) {
    return Boolean(a && b)
        && Number(a?.score || 0) === Number(b?.score || 0)
        && Number(a?.estimated_value || 0) === Number(b?.estimated_value || 0)
        && Number(RARITY_SCORE[a?.rarity] || 0) === Number(RARITY_SCORE[b?.rarity] || 0)
        && Number(a?.odds || 0) === Number(b?.odds || 0);
}

function resolveCaseVsRoundOutcome(pulls = []) {
    const ordered = safeArray(pulls).slice().sort(compareCaseVsPulls);
    const top = ordered[0] || null;
    const runnerUp = ordered[1] || null;
    const isDraw = isCaseVsTie(top, runnerUp);
    return {
        winner: isDraw ? null : top,
        isDraw,
        ordered
    };
}

function pickBestPlayerPull(room, userId) {
    const pulls = safeArray(room?.rounds_data).flatMap((round) => safeArray(round.pulls)).filter((pull) => Number(pull.user_id) === Number(userId));
    return pulls.slice().sort(compareCaseVsPulls)[0] || null;
}

function scheduleCaseVsRoomPlayback(roomId, delayMs = 220) {
    if (activeCaseVsJobs.has(Number(roomId))) return;
    activeCaseVsJobs.add(Number(roomId));
    const executeRound = (roundNumber = 1) => {
        setTimeout(() => {
            try {
                const store = readCaseVsStore();
                const room = safeArray(store.rooms).find((entry) => Number(entry.id) === Number(roomId));
                if (!room || room.status !== 'rolling') {
                    activeCaseVsJobs.delete(Number(roomId));
                    return;
                }
                const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(room.case_id);
                if (!caseInfo) {
                    room.status = 'cancelled';
                    room.updated_at = new Date().toISOString();
                    writeCaseVsStore(store);
                    activeCaseVsJobs.delete(Number(roomId));
                    return;
                }
                const contents = dedupeCaseContents(db.prepare('SELECT * FROM case_contents WHERE case_id = ?').all(room.case_id));
                const pulls = safeArray(room.players).map((player, index) => {
                    const seed = `${room.seed}-r${roundNumber}-p${index + 1}`;
                    const result = openCaseForUser({
                        userId: player.user_id,
                        username: player.username,
                        caseInfo,
                        contents,
                        seed,
                        source: 'case_vs',
                        roomId: room.id
                    });
                    db.prepare('UPDATE cases SET times_opened = times_opened + 1 WHERE id = ?').run(room.case_id);
                    return {
                        user_id: player.user_id,
                        username: player.username,
                        score: scoreResult(result),
                        ...result
                    };
                });

                const outcome = resolveCaseVsRoundOutcome(pulls);
                room.rounds_data = safeArray(room.rounds_data);
                room.rounds_data.push({
                    round: roundNumber,
                    winner_user_id: outcome.winner ? outcome.winner.user_id : null,
                    winner_username: outcome.winner ? outcome.winner.username : null,
                    is_draw: outcome.isDraw,
                    pulls
                });
                room.updated_at = new Date().toISOString();
                writeCaseVsStore(store);

                if (roundNumber < Number(room.rounds || 1)) {
                    executeRound(roundNumber + 1);
                    return;
                }

                const [playerA, playerB] = safeArray(room.players);
                const winsA = safeArray(room.rounds_data).filter((round) => Number(round.winner_user_id) === Number(playerA?.user_id)).length;
                const winsB = safeArray(room.rounds_data).filter((round) => Number(round.winner_user_id) === Number(playerB?.user_id)).length;
                const bestPullA = pickBestPlayerPull(room, playerA?.user_id);
                const bestPullB = pickBestPlayerPull(room, playerB?.user_id);
                const bestPull = [bestPullA, bestPullB].filter(Boolean).slice().sort(compareCaseVsPulls)[0] || null;
                const tiebreakCompare = bestPullA && bestPullB ? compareCaseVsPulls(bestPullA, bestPullB) : 0;
                const isPerfectDraw = winsA === winsB && isCaseVsTie(bestPullA, bestPullB);
                const winner = winsA === winsB
                    ? (isPerfectDraw ? null : (tiebreakCompare <= 0 ? playerA : playerB))
                    : (winsA > winsB ? playerA : playerB);

                room.summary = {
                    wins: { [playerA.user_id]: winsA, [playerB.user_id]: winsB },
                    best_pull: bestPull,
                    pot_amount: Number((Number(room.case_price || 0) * Number(room.rounds || 1) * safeArray(room.players).length).toFixed(2)),
                    loser_user_id: winner ? (Number(playerA.user_id) === Number(winner.user_id) ? Number(playerB.user_id) : Number(playerA.user_id)) : null,
                    draw: !winner,
                    draw_reason: !winner ? 'matched_rounds_and_best_pull' : null
                };

                const totalPot = Number(room.summary.pot_amount || 0);
                const state = readAppState();
                const users = safeArray(state.tables?.users);
                if (!winner) {
                    const split = Number((totalPot / Math.max(1, safeArray(room.players).length)).toFixed(2));
                    safeArray(room.players).forEach((player) => {
                        const userRow = users.find((entry) => Number(entry.id) === Number(player.user_id));
                        if (userRow) {
                            userRow.balance = Number((Number(userRow.balance || 0) + split).toFixed(2));
                            userRow.total_earned = Number((Number(userRow.total_earned || 0) + split).toFixed(2));
                        }
                        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(player.user_id, 'casevs_draw', split, `Case Vs room #${room.id} ended in a draw`);
                        notifyUser(player.user_id, 'casevs_finished', 'Case Vs draw', `Room #${room.id} ended in a draw. Your entry was returned.`, '/casevs', { roomId: room.id, pot_amount: totalPot, draw: true });
                    });
                    room.status = 'draw';
                    room.winner_user_id = null;
                    room.winner_username = null;
                } else {
                    const winnerUserId = Number(winner.user_id);
                    const winningUser = users.find((entry) => Number(entry.id) === winnerUserId);
                    if (winningUser) {
                        winningUser.balance = Number((Number(winningUser.balance || 0) + totalPot).toFixed(2));
                        winningUser.total_earned = Number((Number(winningUser.total_earned || 0) + totalPot).toFixed(2));
                    }
                    db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(winnerUserId, 'casevs_win', totalPot, `Won Case Vs room #${room.id}`);
                    notifyUser(playerA.user_id, 'casevs_finished', 'Case Vs finished', `${winner.username} won room #${room.id}${winnerUserId === Number(playerA.user_id) ? ` and banked $${formatAmount(totalPot)}.` : '.'}`, '/casevs', { roomId: room.id, pot_amount: totalPot });
                    notifyUser(playerB.user_id, 'casevs_finished', 'Case Vs finished', `${winner.username} won room #${room.id}${winnerUserId === Number(playerB.user_id) ? ` and banked $${formatAmount(totalPot)}.` : '.'}`, '/casevs', { roomId: room.id, pot_amount: totalPot });
                    room.status = 'finished';
                    room.winner_user_id = winnerUserId;
                    room.winner_username = winner.username;
                }

                room.updated_at = new Date().toISOString();
                writeJson(appDataPath, state);
                writeCaseVsStore(store);
                activeCaseVsJobs.delete(Number(roomId));
            } catch (error) {
                console.error('Case Vs background execution error:', error);
                activeCaseVsJobs.delete(Number(roomId));
            }
        }, roundNumber === 1 ? delayMs : 1250);
    };

    executeRound(1);
}

function serializeCaseVsRoom(room) {
    if (!room) return room;
    const rounds = Array.isArray(room.rounds_data) ? room.rounds_data : [];
    const summary = room.summary ? {
        ...room.summary,
        best_pull: room.summary.best_pull ? serializeCaseVsPull(room.summary.best_pull) : room.summary.best_pull
    } : null;
    return {
        ...room,
        rounds_data: rounds.map((round) => ({
            ...round,
            pulls: Array.isArray(round.pulls) ? round.pulls.map(serializeCaseVsPull) : []
        })),
        summary
    };
}

// Case Vs lobby rooms
router.get('/casevs/rooms', (req, res) => {
    try {
        const store = readCaseVsStore();
        const rooms = store.rooms
            .slice()
            .sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)))
            .map((room) => ({
                ...serializeCaseVsRoom(room),
                can_join: room.status === 'waiting' && room.players.length === 1
            }));
        res.json({ rooms });
    } catch (error) {
        console.error('Case Vs rooms error:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

router.get('/casevs/rooms/:id', (req, res) => {
    try {
        const roomId = Number(req.params.id);
        const store = readCaseVsStore();
        const room = store.rooms.find((entry) => Number(entry.id) === roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json({ room: serializeCaseVsRoom(room) });
    } catch (error) {
        console.error('Case Vs room error:', error);
        res.status(500).json({ error: 'Failed to fetch room' });
    }
});

router.post('/casevs/rooms', isAuthenticated, (req, res) => {
    try {
        const caseId = Number(req.body.caseId);
        const rounds = Math.min(Math.max(parseInt(req.body.rounds, 10) || 1, 1), 3);
        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId);
        if (!caseInfo) {
            return res.status(404).json({ error: 'Case not found' });
        }
        if (!isCaseLive(caseInfo)) {
            return res.status(400).json({ error: 'That case is not live yet' });
        }

        const store = readCaseVsStore();
        const room = {
            id: store.nextId++,
            case_id: caseInfo.id,
            case_name: caseInfo.name,
            case_price: Number(caseInfo.price),
            rounds,
            status: 'waiting',
            seed: createSeed(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            winner_user_id: null,
            winner_username: null,
            players: [{ user_id: req.user.id, username: req.user.username, joined_at: new Date().toISOString() }],
            rounds_data: [],
            summary: null
        };
        store.rooms.unshift(room);
        writeCaseVsStore(store);
        res.json({ success: true, room: serializeCaseVsRoom(room) });
    } catch (error) {
        console.error('Case Vs create error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

router.post('/casevs/rooms/:id/join', isAuthenticated, (req, res) => {
    try {
        const roomId = Number(req.params.id);
        const store = readCaseVsStore();
        const room = store.rooms.find((entry) => Number(entry.id) === roomId);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        if (room.status !== 'waiting' || room.players.length !== 1) {
            return res.status(400).json({ error: 'This room is no longer joinable' });
        }
        if (Number(room.players[0].user_id) === Number(req.user.id)) {
            return res.status(400).json({ error: 'You cannot join your own room' });
        }

        const creator = getUserById(room.players[0].user_id);
        const joiner = getUserById(req.user.id);
        const entryCost = Number(room.case_price) * Number(room.rounds);
        if (!creator || Number(creator.balance) < entryCost) {
            return res.status(400).json({ error: 'The room creator no longer has enough balance' });
        }
        if (!joiner || Number(joiner.balance) < entryCost) {
            return res.status(400).json({ error: 'Insufficient balance to join this room' });
        }

        room.players.push({ user_id: req.user.id, username: req.user.username, joined_at: new Date().toISOString() });
        room.status = 'rolling';
        room.started_at = new Date().toISOString();
        room.rounds_data = safeArray(room.rounds_data);
        room.summary = null;
        room.winner_user_id = null;
        room.winner_username = null;
        room.updated_at = new Date().toISOString();

        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(entryCost, creator.id);
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(entryCost, joiner.id);
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(creator.id, 'purchase', -entryCost, `Joined Case Vs room #${room.id}`);
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(joiner.id, 'purchase', -entryCost, `Joined Case Vs room #${room.id}`);

        notifyUser(room.players[0].user_id, 'casevs_joined', 'Case Vs started', `${joiner.username} joined your room for ${room.case_name}.`, '/casevs', { roomId: room.id });
        writeCaseVsStore(store);
        scheduleCaseVsRoomPlayback(room.id);
        res.json({ success: true, room: serializeCaseVsRoom(room) });
    } catch (error) {
        console.error('Case Vs join error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});


router.get('/site/state', optionalAuth, (req, res) => {
    try {
        const store = readCommunityStore();
        if (req.user) {
            touchPresence(store, getUserById(req.user.id) || req.user, { typing: false });
            writeCommunityStore(store);
        }
        const presence = getOnlinePresenceSummary(store);
        res.json({
            announcements: getPublicAnnouncements(store),
            onlineCount: presence.online_count,
            typingUsers: presence.typing,
            activeRain: getRainPublic(store.activeRain, req.user ? req.user.id : null)
        });
    } catch (error) {
        console.error('Site state error:', error);
        res.status(500).json({ error: 'Failed to load site state' });
    }
});

router.get('/community/chat', optionalAuth, (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 10), 100);
        const { store, finalized } = finalizeExpiredRain(false);
        if (req.user) {
            const liveUser = getUserById(req.user.id) || req.user;
            touchPresence(store, liveUser, { typing: false });
            clearTyping(store, req.user.id);
        }
        const presence = getOnlinePresenceSummary(store);
        const messages = store.messages.slice(-limit).map((message) => ({ ...message }));
        const claimDrops = safeArray(store.claimDrops).filter((entry) => entry.status === 'active').slice(0, 6).map((entry) => ({
            code: entry.code,
            title: entry.title,
            type: entry.type,
            created_at: entry.created_at,
            max_claims: entry.max_claims,
            claimed_count: safeArray(entry.claimed_by).length,
            locked_user_id: entry.locked_user_id || null
        }));
        writeCommunityStore(store);
        res.json({
            messages,
            activeRain: getRainPublic(store.activeRain, req.user ? req.user.id : null),
            rainHistory: store.rainHistory.slice(0, 8),
            ownerUserId: getOwnerUserId(),
            viewerIsAdmin: Boolean(req.user && hasAdminAccess(req.user)),
            finalizedRain: finalized ? { id: finalized.id, title: finalized.title, entrant_count: finalized.entrant_count, distributed_amount: finalized.distributed_amount } : null,
            onlineCount: presence.online_count,
            typingUsers: presence.typing,
            announcements: getPublicAnnouncements(store),
            claimDrops
        });
    } catch (error) {
        console.error('Community chat error:', error);
        res.status(500).json({ error: 'Failed to load community chat' });
    }
});

router.post('/community/chat', isAuthenticated, (req, res) => {
    try {
        const text = String(req.body.message || '').trim().replace(/\s+/g, ' ');
        if (!text) {
            return res.status(400).json({ error: 'Message is required' });
        }
        if (text.length > 240) {
            return res.status(400).json({ error: 'Message must be 240 characters or less' });
        }
        const lastMessageAt = Number(req.session.lastChatMessageAt || 0);
        if (Date.now() - lastMessageAt < 1800) {
            return res.status(429).json({ error: 'Slow down a little before sending another message' });
        }

        const { store } = finalizeExpiredRain(false);
        const liveUser = getUserById(req.user.id) || req.user;
        const state = readAppState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (userRow) {
            ensureUserFeatureDefaults(userRow);
            syncUserDailyState(userRow);
            userRow.daily_chat_messages = Number(userRow.daily_chat_messages || 0) + 1;
            awardUserBonuses(userRow, { xp: 2 });
            writeJson(appDataPath, state);
        }
        touchPresence(store, liveUser, { typing: false });
        clearTyping(store, req.user.id);
        const message = addCommunityMessage(store, {
            type: 'user',
            user_id: req.user.id,
            username: req.user.username,
            display_name: getUserDisplayName(liveUser),
            is_admin: hasAdminAccess(req.user),
            avatar_url: liveUser.avatar_url || null,
            region: liveUser.region || '',
            pronouns: liveUser.pronouns || '',
            badges: getUserBadges(liveUser).map(serializeBadge),
            custom_role: liveUser.custom_role || '',
            message: text
        });
        writeCommunityStore(store);
        req.session.lastChatMessageAt = Date.now();
        res.json({ success: true, message });
    } catch (error) {
        console.error('Community post error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

router.delete('/community/chat/:id', isAuthenticated, (req, res) => {
    try {
        const messageId = Number(req.params.id);
        const store = readCommunityStore();
        const index = store.messages.findIndex((entry) => Number(entry.id) === messageId);
        if (index === -1) {
            return res.status(404).json({ error: 'Message not found' });
        }
        const message = store.messages[index];
        const isOwner = Boolean(req.user && hasAdminAccess(req.user));
        const isAuthor = Boolean(req.user && Number(message.user_id) === Number(req.user.id));
        const recentEnough = Date.now() - new Date(message.created_at || 0).getTime() < 5 * 60 * 1000;
        if (!(isOwner || (isAuthor && recentEnough))) {
            return res.status(403).json({ error: 'You cannot delete that message' });
        }
        store.messages.splice(index, 1);
        writeCommunityStore(store);
        res.json({ success: true, removedId: messageId });
    } catch (error) {
        console.error('Delete community message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

router.post('/community/presence', isAuthenticated, (req, res) => {
    try {
        const typing = Boolean(req.body.typing);
        const store = readCommunityStore();
        const liveUser = getUserById(req.user.id) || req.user;
        touchPresence(store, liveUser, { typing });
        if (!typing) clearTyping(store, req.user.id);
        writeCommunityStore(store);
        const presence = getOnlinePresenceSummary(store);
        res.json({ success: true, onlineCount: presence.online_count, typingUsers: presence.typing });
    } catch (error) {
        console.error('Presence update error:', error);
        res.status(500).json({ error: 'Failed to update presence' });
    }
});

router.post('/community/rain/enter', isAuthenticated, (req, res) => {
    try {
        const { store } = finalizeExpiredRain(false);
        const rain = store.activeRain;
        if (!rain || rain.status !== 'active') {
            return res.status(404).json({ error: 'There is no active rain right now' });
        }
        rain.entrants = Array.isArray(rain.entrants) ? rain.entrants : [];
        const alreadyEntered = rain.entrants.find((entry) => Number(entry.user_id) === Number(req.user.id));
        if (alreadyEntered) {
            return res.status(400).json({ error: 'You already entered this rain' });
        }
        const liveUser = getUserById(req.user.id) || req.user;
        rain.entrants.push({ user_id: req.user.id, username: req.user.username, display_name: getUserDisplayName(liveUser), entered_at: new Date().toISOString() });
        addCommunityMessage(store, {
            type: 'system',
            username: 'KatsuCases',
            message: `${getUserDisplayName(liveUser)} entered ${rain.title}.`
        });
        writeCommunityStore(store);
        res.json({ success: true, activeRain: getRainPublic(rain, req.user.id) });
    } catch (error) {
        console.error('Rain entry error:', error);
        res.status(500).json({ error: 'Failed to join rain' });
    }
});

router.get('/claims/:code', optionalAuth, (req, res) => {
    try {
        const code = String(req.params.code || '').trim();
        if (wantsHtmlResponse(req) || String(req.query.view || '').toLowerCase() === 'page') {
            return res.sendFile(claimPagePath);
        }
        const store = readCommunityStore();
        const claim = safeArray(store.claimDrops).find((entry) => entry.code === code && entry.status === 'active');
        if (!claim) return res.status(404).json({ error: 'Claim link not found' });
        res.json({
            claim: {
                code: claim.code,
                title: claim.title,
                type: claim.type,
                max_claims: claim.max_claims,
                claimed_count: safeArray(claim.claimed_by).length,
                locked_user_id: claim.locked_user_id || null,
                expires_at: claim.expires_at || null,
                details: claim.details || {}
            }
        });
    } catch (error) {
        console.error('Claim fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch claim link' });
    }
});

router.post('/claims/:code/claim', isAuthenticated, (req, res) => {
    try {
        const code = String(req.params.code || '').trim();
        const store = readCommunityStore();
        const claim = safeArray(store.claimDrops).find((entry) => entry.code === code && entry.status === 'active');
        if (!claim) return res.status(404).json({ error: 'Claim link not found' });
        if (claim.expires_at && new Date(claim.expires_at).getTime() <= Date.now()) {
            claim.status = 'expired';
            writeCommunityStore(store);
            return res.status(400).json({ error: 'This claim link expired' });
        }
        if (claim.locked_user_id && Number(claim.locked_user_id) !== Number(req.user.id)) {
            return res.status(403).json({ error: 'This link is locked to another user' });
        }
        claim.claimed_by = safeArray(claim.claimed_by);
        if (claim.claimed_by.some((entry) => Number(entry.user_id) === Number(req.user.id))) {
            return res.status(400).json({ error: 'You already used this claim link' });
        }
        if (claim.claimed_by.length >= Number(claim.max_claims || 1)) {
            claim.status = 'claimed_out';
            writeCommunityStore(store);
            return res.status(400).json({ error: 'This claim link has no uses left' });
        }

        const state = readAppState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(req.user.id));
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        const details = claim.details || {};
        if (claim.type === 'balance') {
            const amount = Number(details.amount || 0);
            if (!(amount > 0)) return res.status(400).json({ error: 'Invalid balance claim' });
            userRow.balance = Number((Number(userRow.balance || 0) + amount).toFixed(2));
            db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(req.user.id, 'claim_balance', amount, claim.title || 'Claimed balance drop');
        } else if (claim.type === 'rolls') {
            const rolls = Math.max(1, parseInt(details.rolls, 10) || 1);
            userRow.free_rolls = Number(userRow.free_rolls || 0) + rolls;
            db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(req.user.id, 'claim_rolls', 0, `${claim.title || 'Claim'} · ${rolls} free rolls`);
        } else if (claim.type === 'badge') {
            const badge = normalizeBadgeKey(details.badge || 'vip');
            userRow.badges = safeArray(userRow.badges);
            if (!userRow.badges.includes(badge)) userRow.badges.push(badge);
        } else if (claim.type === 'pokemon') {
            const nextId = Number(state.meta?.nextIds?.inventory || 1);
            if (!state.meta) state.meta = { nextIds: {} };
            if (!state.meta.nextIds) state.meta.nextIds = {};
            state.meta.nextIds.inventory = nextId + 1;
            const odds = Math.max(Number(details.odds || 5000), 1);
            const rarity = details.rarity || 'epic';
            const pokemonName = details.pokemon_name || details.pokemonName || 'Eevee';
            safeArray(state.tables.inventory).push({
                id: nextId,
                user_id: req.user.id,
                pokemon_id: Number(details.pokemon_id || 0),
                pokemon_name: pokemonName,
                pokemon_form: details.pokemon_form || null,
                rarity,
                sprite_url: buildSpriteUrl(pokemonName, details.sprite_url || ''),
                is_shiny: Number(details.is_shiny || 0),
                is_listed: 0,
                listed_price: null,
                acquired_at: new Date().toISOString(),
                estimated_value: computeEstimatedValue({ odds, rarity, is_shiny: Number(details.is_shiny || 0), casePrice: Number(details.case_price || 6.99) }),
                odds
            });
        } else {
            return res.status(400).json({ error: 'Unsupported claim type' });
        }

        claim.claimed_by.push({ user_id: req.user.id, username: req.user.username, claimed_at: new Date().toISOString() });
        if (claim.claimed_by.length >= Number(claim.max_claims || 1)) {
            claim.status = 'claimed_out';
        }
        writeJson(appDataPath, state);
        writeCommunityStore(store);
        notifyUser(req.user.id, 'claim_used', 'Claim redeemed', `You redeemed ${claim.title}.`, '/profile', { code: claim.code, type: claim.type });
        res.json({ success: true, claim });
    } catch (error) {
        console.error('Claim use error:', error);
        res.status(500).json({ error: 'Failed to redeem claim link' });
    }
});



router.get('/admin/gist-backup/status', isAuthenticated, requireAdmin, async (req, res) => {
    try {
        res.json(await getGistBackupStatus(loadGistBackupConfig()));
    } catch (error) {
        console.error('Gist backup status error:', error);
        res.status(500).json({ error: 'Failed to read Gist backup status' });
    }
});

router.post('/admin/gist-backup/config', isAuthenticated, requireAdmin, async (req, res) => {
    try {
        const current = loadGistBackupConfig();
        const next = {
            ...current,
            description: normalizeText(req.body.description || current.description || 'KatsuCases site data backup').slice(0, 200) || 'KatsuCases site data backup',
            isPublic: req.body.isPublic === undefined ? Boolean(current.isPublic) : Boolean(req.body.isPublic),
            autoSaveMinutes: req.body.autoSaveMinutes === undefined ? Number(current.autoSaveMinutes || 0) : Math.max(0, parseInt(req.body.autoSaveMinutes, 10) || 0),
            maxVersions: req.body.maxVersions === undefined ? Number(current.maxVersions || 8) : Math.max(1, parseInt(req.body.maxVersions, 10) || 8)
        };
        saveGistBackupConfig(next);
        res.json({ success: true, status: await getGistBackupStatus(loadGistBackupConfig()) });
    } catch (error) {
        console.error('Gist backup config error:', error);
        res.status(500).json({ error: error.message || 'Failed to save Gist backup config' });
    }
});

router.get('/admin/gist-backup/versions', isAuthenticated, requireAdmin, async (req, res) => {
    try {
        res.json(await listGistBackupVersions(loadGistBackupConfig()));
    } catch (error) {
        console.error('Gist backup versions error:', error);
        res.status(500).json({ error: error.message || 'Failed to load Gist backup versions' });
    }
});

router.post('/admin/gist-backup/backup', isAuthenticated, requireAdmin, async (req, res) => {
    try {
        const current = loadGistBackupConfig();
        const overrides = {
            description: normalizeText(req.body.description || current.description || 'KatsuCases site data backup').slice(0, 200) || 'KatsuCases site data backup',
            isPublic: req.body.isPublic === undefined ? Boolean(current.isPublic) : Boolean(req.body.isPublic),
            maxVersions: req.body.maxVersions === undefined ? Number(current.maxVersions || 8) : Math.max(1, parseInt(req.body.maxVersions, 10) || 8)
        };
        const result = await runGistBackupNow(overrides);
        if (typeof db.reload === 'function') db.reload();
        res.json({ success: true, result, status: await getGistBackupStatus(loadGistBackupConfig()) });
    } catch (error) {
        console.error('Gist backup run error:', error);
        res.status(500).json({ error: error.message || 'Failed to backup site data to Gist' });
    }
});

router.post('/admin/gist-backup/restore', isAuthenticated, requireAdmin, async (req, res) => {
    try {
        const ref = normalizeText(req.body.ref || req.body.snapshotFile || '');
        const result = await runGistRestoreNow(ref || '');
        if (typeof db.reload === 'function') db.reload();
        res.json({ success: true, result, status: await getGistBackupStatus(loadGistBackupConfig()) });
    } catch (error) {
        console.error('Gist restore error:', error);
        res.status(500).json({ error: error.message || 'Failed to restore site data from Gist' });
    }
});

router.get('/admin/summary', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const { store } = finalizeExpiredRain(false);
        const roomStore = readCaseVsStore();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const users = getUsers().slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        const trades = getTable('trades').slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        const marketplaceRows = getTable('marketplace').slice().sort((a, b) => String(b.listed_at || '').localeCompare(String(a.listed_at || '')));
        const stats = {
            totalUsers: users.length,
            totalCasesOpened: db.prepare('SELECT SUM(cases_opened) as total FROM users').get().total || 0,
            activeListings: marketplaceRows.filter((row) => row.status === 'active').length,
            recentPulls: db.prepare('SELECT COUNT(*) as count FROM openings WHERE opened_at > ?').get(oneDayAgo).count,
            activeRooms: roomStore.rooms.filter((room) => ['waiting', 'rolling'].includes(room.status)).length,
            unreadNotifications: notifications.unreadCount(req.user.id),
            pendingTrades: trades.filter((row) => row.status === 'pending').length,
            completedTrades: trades.filter((row) => row.status === 'accepted').length,
            siteBalanceFloat: Number(users.reduce((sum, user) => sum + Number(user.balance || 0), 0).toFixed(2)),
            totalMarketplaceVolume: Number(marketplaceRows.filter((row) => row.status === 'sold').reduce((sum, row) => sum + Number(row.price || 0), 0).toFixed(2))
        };

        const recentUsers = users.slice(0, 8).map((user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            balance: Number(user.balance || 0),
            created_at: user.created_at,
            is_admin: hasAdminAccess(user),
            site_role: getUserSiteRole(user),
            is_owner: isOwnerUserId(user.id)
        }));

        const recentTrades = trades.slice(0, 8).map((trade) => {
            const items = getTable('trade_items').filter((item) => Number(item.trade_id) === Number(trade.id));
            const offerCount = items.filter((item) => Number(item.from_user) === Number(trade.sender_id)).length;
            const requestCount = items.filter((item) => Number(item.from_user) === Number(trade.receiver_id)).length;
            return { ...trade, offerCount, requestCount };
        });

        const recentListings = marketplaceRows.slice(0, 8).map((listing) => ({
            id: listing.id,
            pokemon_name: listing.pokemon_name,
            rarity: listing.rarity,
            price: Number(listing.price || 0),
            status: listing.status,
            seller_username: listing.seller_username,
            listed_at: listing.listed_at,
            sold_at: listing.sold_at || null
        }));

        const activeRooms = roomStore.rooms
            .slice()
            .sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)))
            .slice(0, 6)
            .map((room) => ({
                id: room.id,
                case_name: room.case_name,
                status: room.status,
                rounds: room.rounds,
                players: room.players,
                winner_username: room.winner_username,
                updated_at: room.updated_at || room.created_at
            }));

        const todayKey = getDayKey();
        const casesTable = getTable('cases');
        const favoriteCounts = new Map();
        users.forEach((user) => {
            ensureUserFeatureDefaults(user);
            safeArray(user.favorite_case_ids).forEach((caseId) => {
                const id = Number(caseId);
                if (!id) return;
                favoriteCounts.set(id, Number(favoriteCounts.get(id) || 0) + 1);
            });
        });
        const topFavoritedCases = Array.from(favoriteCounts.entries())
            .map(([caseId, count]) => {
                const caseRow = casesTable.find((entry) => Number(entry.id) === Number(caseId));
                return caseRow ? { id: caseRow.id, name: caseRow.name, category: caseRow.category, count } : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            .slice(0, 6);

        const progression = {
            dailyClaimsToday: users.filter((user) => user.daily_last_claim_at && getDayKey(user.daily_last_claim_at) === todayKey).length,
            avgLevel: Number((users.reduce((sum, user) => sum + Number(getProgressionSummary(user).level || 1), 0) / Math.max(1, users.length)).toFixed(1)),
            topDailyStreak: users.reduce((best, user) => Math.max(best, Number(user.daily_claim_streak || 0)), 0),
            topXpUser: users.slice().sort((a, b) => Number(b.total_xp || 0) - Number(a.total_xp || 0))[0] ? {
                username: users.slice().sort((a, b) => Number(b.total_xp || 0) - Number(a.total_xp || 0))[0].username,
                total_xp: Number(users.slice().sort((a, b) => Number(b.total_xp || 0) - Number(a.total_xp || 0))[0].total_xp || 0),
                level: getProgressionSummary(users.slice().sort((a, b) => Number(b.total_xp || 0) - Number(a.total_xp || 0))[0]).level
            } : null,
            topFavoritedCases
        };

        res.json({
            stats,
            activeRain: getRainPublic(store.activeRain, req.user.id),
            rainHistory: store.rainHistory.slice(0, 10),
            recentMessages: store.messages.slice(-12),
            ownerUserId: getOwnerUserId(),
            recentUsers,
            recentTrades,
            recentListings,
            activeRooms,
            announcements: getPublicAnnouncements(store),
            claimDrops: safeArray(store.claimDrops).slice(0, 12).map((entry) => ({ ...entry, claimed_count: safeArray(entry.claimed_by).length })),
            cases: getTable('cases').slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 12),
            progression
        });
    } catch (error) {
        console.error('Admin summary error:', error);
        res.status(500).json({ error: 'Failed to fetch admin summary' });
    }
});


router.get('/support/tickets', isAuthenticated, (req, res) => {
    try {
        const state = readAppState();
        state.tables.support_tickets = safeArray(state.tables.support_tickets);
        const tickets = state.tables.support_tickets
            .filter((ticket) => Number(ticket.user_id) === Number(req.user.id))
            .slice()
            .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
            .map((ticket) => ({
                ...ticket,
                replies: safeArray(ticket.replies).filter((reply) => !reply.internal)
            }));
        res.json({ tickets });
    } catch (error) {
        console.error('Support tickets load error:', error);
        res.status(500).json({ error: 'Failed to load support tickets' });
    }
});

router.post('/support/tickets', isAuthenticated, (req, res) => {
    try {
        const subject = normalizeText(req.body.subject || '').slice(0, 120);
        const category = normalizeText(req.body.category || 'general').slice(0, 40) || 'general';
        const message = normalizeText(req.body.message || '').slice(0, 2000);
        const priority = normalizeText(req.body.priority || 'normal').toLowerCase();
        if (!subject || !message) {
            return res.status(400).json({ error: 'Subject and message are required' });
        }
        const state = readAppState();
        ensureStateMeta(state);
        state.tables.support_tickets = safeArray(state.tables.support_tickets);
        const ticket = {
            id: nextStateId(state, 'support_tickets'),
            user_id: Number(req.user.id),
            username: req.user.username,
            subject,
            category,
            priority,
            status: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            replies: [buildSupportReply('user', req.user, message)]
        };
        state.tables.support_tickets.unshift(ticket);
        writeJson(appDataPath, state);
        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Support ticket create error:', error);
        res.status(500).json({ error: 'Failed to create support ticket' });
    }
});

router.post('/support/tickets/:id/reply', isAuthenticated, (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        const message = normalizeText(req.body.message || '').slice(0, 2000);
        if (!message) return res.status(400).json({ error: 'Reply message is required' });
        const state = readAppState();
        state.tables.support_tickets = safeArray(state.tables.support_tickets);
        const ticket = state.tables.support_tickets.find((row) => Number(row.id) === ticketId && Number(row.user_id) === Number(req.user.id));
        if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
        ticket.replies = safeArray(ticket.replies);
        ticket.replies.push(buildSupportReply('user', req.user, message));
        ticket.status = ticket.status === 'closed' ? 'customer-replied' : ticket.status;
        ticket.updated_at = new Date().toISOString();
        writeJson(appDataPath, state);
        res.json({ success: true, ticket: { ...ticket, replies: safeArray(ticket.replies).filter((reply) => !reply.internal) } });
    } catch (error) {
        console.error('Support ticket reply error:', error);
        res.status(500).json({ error: 'Failed to reply to support ticket' });
    }
});


router.get('/admin/audit', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const state = readAppState();
        ensureAuditCollections(state);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 120, 1), 300);
        const logs = safeArray(state.meta.audit_logs)
            .slice(0, limit)
            .map((entry) => ({
                ...entry,
                actor_display: entry.actor_username || 'system'
            }));
        res.json({ logs, reward_templates: safeArray(state.meta.reward_templates).slice(0, 40) });
    } catch (error) {
        console.error('Admin audit load error:', error);
        res.status(500).json({ error: 'Failed to load audit log' });
    }
});

router.get('/admin/reward-templates', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const state = readAppState();
        ensureAuditCollections(state);
        res.json({ templates: safeArray(state.meta.reward_templates).slice(0, 50) });
    } catch (error) {
        console.error('Reward templates load error:', error);
        res.status(500).json({ error: 'Failed to load reward templates' });
    }
});

router.post('/admin/reward-templates', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const state = readAppState();
        ensureAuditCollections(state);
        const type = normalizeText(req.body.type || 'balance').toLowerCase();
        if (!['balance', 'rolls', 'badge', 'pokemon'].includes(type)) return res.status(400).json({ error: 'Invalid template type' });
        const template = {
            id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            created_at: new Date().toISOString(),
            created_by_user_id: Number(req.user.id),
            name: normalizeText(req.body.name || `${type} template`).slice(0, 60),
            type,
            details: {
                amount: Number(req.body.amount || 0),
                rolls: Math.max(0, parseInt(req.body.rolls || 0, 10) || 0),
                badge: normalizeText(req.body.badge || '').slice(0, 40),
                pokemon_name: normalizeText(req.body.pokemon_name || req.body.pokemonName || '').toLowerCase(),
                rarity: normalizeText(req.body.rarity || 'rare').toLowerCase(),
                is_shiny: req.body.is_shiny ? 1 : 0
            }
        };
        state.meta.reward_templates.unshift(template);
        state.meta.reward_templates = state.meta.reward_templates.slice(0, 50);
        pushAuditLog(state, req.user, 'reward_template_created', { type: 'reward_template', id: template.id, label: template.name }, { reward_type: type });
        writeJson(appDataPath, state);
        res.json({ success: true, template });
    } catch (error) {
        console.error('Reward template create error:', error);
        res.status(500).json({ error: 'Failed to save reward template' });
    }
});

router.delete('/admin/reward-templates/:id', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const state = readAppState();
        ensureAuditCollections(state);
        const templateId = String(req.params.id || '');
        const existing = safeArray(state.meta.reward_templates).find((entry) => entry.id === templateId);
        state.meta.reward_templates = safeArray(state.meta.reward_templates).filter((entry) => entry.id !== templateId);
        if (!existing) return res.status(404).json({ error: 'Template not found' });
        pushAuditLog(state, req.user, 'reward_template_deleted', { type: 'reward_template', id: templateId, label: existing.name }, { reward_type: existing.type });
        writeJson(appDataPath, state);
        res.json({ success: true });
    } catch (error) {
        console.error('Reward template delete error:', error);
        res.status(500).json({ error: 'Failed to delete reward template' });
    }
});

router.get('/admin/support/tickets', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const status = normalizeText(req.query.status || '').toLowerCase();
        const query = normalizeText(req.query.query || req.query.q || '').toLowerCase();
        const tickets = safeArray(getTable('support_tickets'))
            .filter((ticket) => !status || String(ticket.status || '').toLowerCase() === status)
            .filter((ticket) => !query || [ticket.subject, ticket.username, ticket.category].some((value) => String(value || '').toLowerCase().includes(query)))
            .slice()
            .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
        res.json({ tickets });
    } catch (error) {
        console.error('Admin support tickets load error:', error);
        res.status(500).json({ error: 'Failed to load support tickets' });
    }
});

router.post('/admin/support/tickets/:id/reply', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        const message = normalizeText(req.body.message || '').slice(0, 2000);
        const internal = Boolean(req.body.internal);
        if (!message) return res.status(400).json({ error: 'Reply message is required' });
        const state = readAppState();
        state.tables.support_tickets = safeArray(state.tables.support_tickets);
        const ticket = state.tables.support_tickets.find((row) => Number(row.id) === ticketId);
        if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
        ticket.replies = safeArray(ticket.replies);
        ticket.replies.push(buildSupportReply('admin', req.user, message, internal));
        ticket.status = internal ? ticket.status : 'awaiting-user';
        ticket.updated_at = new Date().toISOString();
        pushAuditLog(state, req.user, 'support_ticket_replied', { type: 'support_ticket', id: ticket.id, label: ticket.subject }, { internal });
        writeJson(appDataPath, state);
        if (!internal) notifyUser(ticket.user_id, 'support_reply', 'Support replied', `Support replied to ticket #${ticket.id}: ${ticket.subject}`, '/support');
        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Admin support reply error:', error);
        res.status(500).json({ error: 'Failed to reply to support ticket' });
    }
});

router.post('/admin/support/tickets/:id/status', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const ticketId = Number(req.params.id);
        const status = normalizeText(req.body.status || '').toLowerCase();
        if (!['open', 'pending', 'awaiting-user', 'resolved', 'closed', 'customer-replied'].includes(status)) {
            return res.status(400).json({ error: 'Invalid support ticket status' });
        }
        const state = readAppState();
        state.tables.support_tickets = safeArray(state.tables.support_tickets);
        const ticket = state.tables.support_tickets.find((row) => Number(row.id) === ticketId);
        if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
        ticket.status = status;
        ticket.updated_at = new Date().toISOString();
        pushAuditLog(state, req.user, 'support_ticket_status', { type: 'support_ticket', id: ticket.id, label: ticket.subject }, { status });
        writeJson(appDataPath, state);
        notifyUser(ticket.user_id, 'support_status', 'Support ticket updated', `Your support ticket #${ticket.id} is now marked ${status}.`, '/support');
        res.json({ success: true, ticket });
    } catch (error) {
        console.error('Admin support status error:', error);
        res.status(500).json({ error: 'Failed to update support ticket status' });
    }
});

router.get('/admin/platform/config', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const state = readAppState();
        const config = ensureStateMeta(state);
        writeJson(appDataPath, state);
        res.json({ config });
    } catch (error) {
        console.error('Admin platform config load error:', error);
        res.status(500).json({ error: 'Failed to load platform config' });
    }
});

router.post('/admin/platform/config', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const state = readAppState();
        const config = ensureStateMeta(state);
        if (req.body.offline_roll_interval_minutes !== undefined) {
            config.offline_roll_interval_minutes = Math.max(15, parseInt(req.body.offline_roll_interval_minutes, 10) || OFFLINE_ROLL_DEFAULTS.interval_minutes);
        }
        if (req.body.offline_roll_cap !== undefined) {
            config.offline_roll_cap = Math.max(1, parseInt(req.body.offline_roll_cap, 10) || OFFLINE_ROLL_DEFAULTS.cap);
        }
        if (req.body.gist_backup_max_versions !== undefined) {
            config.gist_backup_max_versions = Math.max(1, parseInt(req.body.gist_backup_max_versions, 10) || 8);
        }
        writeJson(appDataPath, state);
        res.json({ success: true, config });
    } catch (error) {
        console.error('Admin platform config save error:', error);
        res.status(500).json({ error: 'Failed to save platform config' });
    }
});

router.get('/admin/users/:id/snapshots', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        res.json({ snapshots: summarizeAccountSnapshots(targetId, 30) });
    } catch (error) {
        console.error('Admin user snapshots error:', error);
        res.status(500).json({ error: 'Failed to load account snapshots' });
    }
});

router.post('/admin/users/:id/snapshots', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const state = readAppState();
        const snapshot = buildUserAccountSnapshot(state, targetId, {
            actorId: req.user.id,
            reason: normalizeText(req.body.reason || 'Manual admin snapshot').slice(0, 160),
            label: normalizeText(req.body.label || 'Manual snapshot').slice(0, 80)
        });
        if (!snapshot) return res.status(404).json({ error: 'User not found' });
        pushAuditLog(state, req.user, 'snapshot_created', { type: 'user', id: targetId, label: snapshot.username }, { snapshot_id: snapshot.id, reason: snapshot.reason, label: snapshot.label });
        writeJson(appDataPath, state);
        res.json({ success: true, snapshot: { id: snapshot.id, created_at: snapshot.created_at, reason: snapshot.reason, label: snapshot.label } });
    } catch (error) {
        console.error('Admin snapshot create error:', error);
        res.status(500).json({ error: 'Failed to create account snapshot' });
    }
});

router.post('/admin/users/:id/rollback/:snapshotId', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const snapshotId = Number(req.params.snapshotId);
        const state = readAppState();
        const restored = restoreUserAccountSnapshot(state, targetId, snapshotId);
        if (!restored) return res.status(404).json({ error: 'Snapshot not found' });
        pushAuditLog(state, req.user, 'account_restored', { type: 'user', id: targetId, label: restored.username }, { snapshot_id: snapshotId, reason: restored.reason, label: restored.label });
        writeJson(appDataPath, state);
        notifyUser(targetId, 'account_rollback', 'Account restored', 'Your account was restored to a previous backup version by the site owner.', '/profile');
        res.json({ success: true, restored: { id: restored.id, created_at: restored.created_at, reason: restored.reason, label: restored.label } });
    } catch (error) {
        console.error('Admin rollback error:', error);
        res.status(500).json({ error: 'Failed to restore account snapshot' });
    }
});

router.get('/admin/users/search', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const query = String(req.query.query ?? req.query.q ?? '').trim();
        const users = searchUsersList(query, null, 12);
        res.json({ users });
    } catch (error) {
        console.error('Admin user search error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

router.get('/admin/security/ban-evasion', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const state = readAppState();
        res.json({ flags: listBanEvasionFlags(state, 40) });
    } catch (error) {
        console.error('Ban evasion flags error:', error);
        res.status(500).json({ error: 'Failed to load ban evasion flags' });
    }
});

router.post('/admin/users/:id/balance', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const amount = Number(req.body.amount || 0);
        const mode = String(req.body.mode || 'add').toLowerCase();
        const reason = String(req.body.reason || 'Owner balance adjustment').trim().slice(0, 120) || 'Owner balance adjustment';
        const target = getUserById(targetId);
        if (!target) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!Number.isFinite(amount)) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }
        let newBalance = Number(target.balance || 0);
        if (mode === 'set') {
            if (amount < 0) return res.status(400).json({ error: 'Balance cannot be negative' });
            newBalance = Number(amount.toFixed(2));
        } else {
            newBalance = Number((newBalance + amount).toFixed(2));
            if (newBalance < 0) {
                return res.status(400).json({ error: 'Adjustment would make the balance negative' });
            }
        }
        const changeAmount = mode === 'set' ? Number((newBalance - Number(target.balance || 0)).toFixed(2)) : Number(amount.toFixed(2));
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(targetId, 'admin_adjustment', changeAmount, reason);
        const state = readAppState();
        const usersTable = Array.isArray(state.tables?.users) ? state.tables.users : [];
        const targetRow = usersTable.find((user) => Number(user.id) === Number(targetId));
        if (!targetRow) {
            return res.status(404).json({ error: 'User not found' });
        }
        buildUserAccountSnapshot(state, targetId, { actorId: req.user.id, reason: reason, label: 'Balance adjustment' });
        targetRow.balance = newBalance;
        pushAuditLog(state, req.user, 'user_balance_updated', { type: 'user', id: targetId, username: target.username }, { mode, change_amount: changeAmount, new_balance: newBalance, reason });
        writeJson(appDataPath, state);
        notifyUser(targetId, 'admin_balance', 'Balance updated', `Your balance was ${mode === 'set' ? 'set' : 'adjusted'} by the site owner.`, '/', { amount: changeAmount, mode, reason });
        res.json({ success: true, user: { id: targetId, username: target.username, balance: newBalance } });
    } catch (error) {
        console.error('Admin balance error:', error);
        res.status(500).json({ error: 'Failed to adjust balance' });
    }
});


router.post('/admin/users/:id/roles', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const state = readAppState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === targetId);
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        const badge = normalizeBadgeKey(req.body.badge || '');
        const customRole = normalizeText(req.body.custom_role || req.body.customRole || '').slice(0, 32);
        const requestedSiteRoleRaw = req.body.site_role !== undefined ? req.body.site_role : req.body.siteRole;
        const requestedSiteRole = requestedSiteRoleRaw === undefined ? null : normalizeSiteRole(requestedSiteRoleRaw);
        const isRequesterOwner = isOwnerUserId(req.user.id);
        const targetSiteRole = getUserSiteRole(userRow);
        if (requestedSiteRole !== null && !isRequesterOwner) {
            return res.status(403).json({ error: 'Only the site owner can change admin access levels' });
        }
        if (Number(targetId) === Number(getOwnerUserId()) && requestedSiteRole !== null) {
            return res.status(400).json({ error: 'The site owner role is locked and cannot be changed' });
        }
        if (!isRequesterOwner && (targetSiteRole === 'admin' || targetSiteRole === 'co_owner' || targetSiteRole === 'owner')) {
            return res.status(403).json({ error: 'Only the site owner can change elevated staff accounts' });
        }
        buildUserAccountSnapshot(state, targetId, { actorId: req.user.id, reason: 'Admin user meta update', label: 'User role update' });
        const region = normalizeText(req.body.region || '').slice(0, 40);
        const freeRolls = req.body.free_rolls === undefined ? null : Math.max(0, parseInt(req.body.free_rolls, 10) || 0);
        const mode = normalizeText(req.body.mode || 'add').toLowerCase();
        userRow.badges = safeArray(userRow.badges);
        saveUserPityState(userRow, getUserPityState(userRow));
        if (badge) {
            if (mode === 'remove') {
                userRow.badges = userRow.badges.filter((entry) => normalizeBadgeKey(entry) !== badge);
            } else if (!userRow.badges.some((entry) => normalizeBadgeKey(entry) === badge)) {
                userRow.badges.push(badge);
            }
        }
        if (customRole) userRow.custom_role = customRole;
        if (req.body.clear_custom_role) userRow.custom_role = '';
        if (region) userRow.region = region;
        if (req.body.clear_region) userRow.region = '';
        if (freeRolls !== null) userRow.free_rolls = freeRolls;
        if (requestedSiteRole !== null) userRow.site_role = requestedSiteRole;
        pushAuditLog(state, req.user, 'user_role_updated', { type: 'user', id: targetId, username: userRow.username }, { badge, customRole, region, freeRolls, site_role: getUserSiteRole(userRow) });
        writeJson(appDataPath, state);
        notifyUser(targetId, 'admin_role', 'Profile role updated', 'Your account badges, role, or admin access were updated by the site owner.', '/profile', { badge, customRole, region, freeRolls, siteRole: getUserSiteRole(userRow) });
        res.json({ success: true, user: { ...userRow, site_role: getUserSiteRole(userRow), is_owner: isOwnerUserId(userRow.id), is_admin: hasAdminAccess(userRow), pity: getPitySummaryForUser(userRow) } });
    } catch (error) {
        console.error('Admin role update error:', error);
        res.status(500).json({ error: 'Failed to update user badges or role' });
    }
});

router.post('/admin/users/:id/pity/reset', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const state = readAppState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(targetId));
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        saveUserPityState(userRow, {});
        writeJson(appDataPath, state);
        notifyUser(targetId, 'admin_pity', 'Pity reset', 'Your pity meters were reset by the site owner.', '/cases');
        res.json({ success: true, user: { id: userRow.id, username: userRow.username, pity: getPitySummaryForUser(userRow) } });
    } catch (error) {
        console.error('Admin pity reset error:', error);
        res.status(500).json({ error: 'Failed to reset pity counters' });
    }
});


router.post('/admin/users/:id/status', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const status = normalizeText(req.body.status || 'active').toLowerCase();
        const requestedByOwner = isOwnerUserId(req.user.id);
        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ error: 'Invalid account status' });
        }
        if (Number(targetId) === Number(getOwnerUserId())) {
            return res.status(400).json({ error: 'The site owner cannot suspend or ban their own account' });
        }
        const state = readAppState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === targetId);
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        ensureUserAccountDefaults(userRow);
        refreshExpiredAccountStatus(userRow);
        const targetRole = getUserSiteRole(userRow);
        if (!requestedByOwner && (targetRole === 'admin' || targetRole === 'co_owner' || targetRole === 'owner')) {
            return res.status(403).json({ error: 'Only the site owner can moderate elevated staff accounts' });
        }

        const defaultReason = status === 'suspended' ? 'Suspended from owner security console' : 'Reactivated from owner security console';
        const reason = normalizeText(req.body.reason || defaultReason).slice(0, 240) || defaultReason;
        let expiresAt = null;
        if (status === 'suspended') {
            expiresAt = parseAccountStatusExpiresAt(req.body.expires_at || req.body.until || req.body.ends_at || '');
            if ((req.body.expires_at || req.body.until || req.body.ends_at) && !expiresAt) {
                return res.status(400).json({ error: 'Suspension end time is invalid' });
            }
            if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
                return res.status(400).json({ error: 'Suspension end time must be in the future' });
            }
        }

        buildUserAccountSnapshot(state, targetId, { actorId: req.user.id, reason, label: 'Account status change' });
        const wasElevated = ['admin', 'co_owner', 'owner'].includes(targetRole);
        let demotedToPlayer = false;
        if (status === 'suspended') {
            userRow.account_status = 'suspended';
            userRow.account_status_reason = reason;
            userRow.account_status_expires_at = expiresAt;
            userRow.account_status_set_at = new Date().toISOString();
            userRow.account_status_set_by = Number(req.user.id) || null;
        } else {
            clearAccountStatusMetadata(userRow);
        }
        userRow.force_logout_at = new Date().toISOString();
        userRow.force_logout_reason = status === 'suspended' ? 'staff_ban' : 'staff_session_reset';
        if (status === 'suspended' && requestedByOwner && wasElevated && !isOwnerUserId(userRow.id)) {
            userRow.site_role = 'player';
            demotedToPlayer = true;
        }
        pushAuditLog(state, req.user, 'user_status_updated', { type: 'user', id: targetId, username: userRow.username }, { status, reason, expires_at: expiresAt, demoted_to_player: demotedToPlayer });
        writeJson(appDataPath, state);

        if (status === 'suspended') {
            const untilText = expiresAt ? ` Until ${new Date(expiresAt).toLocaleString()}.` : ' This suspension does not expire automatically.';
            const baseMessage = demotedToPlayer
                ? 'Your account was suspended and demoted back to player access by the site owner.'
                : 'Your account was suspended by the site owner.';
            notifyUser(targetId, 'account_status', 'Account suspended', `${baseMessage} Reason: ${reason}.${untilText}`, '/support', { reason, expires_at: expiresAt, demoted_to_player: demotedToPlayer });
        } else {
            notifyUser(targetId, 'account_status', 'Account reactivated', `Your account is active again. Reason: ${reason}.`, '/profile', { reason });
        }
        res.json({
            success: true,
            demoted_to_player: demotedToPlayer,
            user: {
                id: userRow.id,
                username: userRow.username,
                account_status: userRow.account_status,
                account_status_reason: userRow.account_status_reason || '',
                account_status_expires_at: userRow.account_status_expires_at || null,
                site_role: getUserSiteRole(userRow)
            }
        });
    } catch (error) {
        console.error('Admin account status error:', error);
        res.status(500).json({ error: 'Failed to update account status' });
    }
});

router.get('/admin/trades', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const status = normalizeText(req.query.status || '').toLowerCase();
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), 60);
        const trades = getTable('trades')
            .filter((trade) => !status || String(trade.status || '').toLowerCase() === status)
            .slice()
            .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
            .slice(0, limit)
            .map((trade) => {
                const items = getTable('trade_items').filter((item) => Number(item.trade_id) === Number(trade.id));
                const offeredItems = items.filter((item) => Number(item.from_user) === Number(trade.sender_id));
                const requestedItems = items.filter((item) => Number(item.from_user) === Number(trade.receiver_id));
                const fairness = computeTradeSummaryFromItems(
                    offeredItems.map((item) => enrichInventoryLikeItem(item, { odds: item.odds })),
                    requestedItems.map((item) => enrichInventoryLikeItem(item, { odds: item.odds }))
                );
                return {
                    ...trade,
                    offeredItems,
                    requestedItems,
                    offer_count: offeredItems.length,
                    request_count: requestedItems.length,
                    fairness
                };
            });
        res.json({ trades });
    } catch (error) {
        console.error('Admin trades load error:', error);
        res.status(500).json({ error: 'Failed to load trades' });
    }
});

router.post('/admin/trades/:id/cancel', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const tradeId = Number(req.params.id);
        const reason = normalizeText(req.body.reason || 'Cancelled by site owner').slice(0, 160) || 'Cancelled by site owner';
        const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
        if (!trade) return res.status(404).json({ error: 'Trade not found' });
        if (String(trade.status || '').toLowerCase() !== 'pending') {
            return res.status(400).json({ error: 'Only pending trades can be cancelled' });
        }
        const state = readAppState();
        const row = safeArray(state.tables?.trades).find((entry) => Number(entry.id) === tradeId);
        if (!row) return res.status(404).json({ error: 'Trade not found' });
        row.status = 'cancelled';
        row.updated_at = new Date().toISOString();
        pushAuditLog(state, req.user, 'trade_cancelled', { type: 'trade', id: tradeId, label: `Trade #${tradeId}` }, { reason, sender_id: trade.sender_id, receiver_id: trade.receiver_id });
        writeJson(appDataPath, state);
        notifyUser(trade.sender_id, 'trade_cancelled', 'Trade cancelled', `Trade #${tradeId} was cancelled by the site owner.`, '/trading', { tradeId, reason });
        notifyUser(trade.receiver_id, 'trade_cancelled', 'Trade cancelled', `Trade #${tradeId} was cancelled by the site owner.`, '/trading', { tradeId, reason });
        res.json({ success: true, trade: row });
    } catch (error) {
        console.error('Admin trade cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel trade' });
    }
});

router.post('/admin/users/:id/password-reset', isAuthenticated, requireAdmin, async (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const state = readAppState();
        ensureStateMeta(state);
        if (!Array.isArray(state.meta.password_reset_tokens)) state.meta.password_reset_tokens = [];
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === targetId);
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        const otp = crypto.randomBytes(4).toString('hex').toUpperCase();
        const token = crypto.randomBytes(24).toString('hex');
        const entry = {
            token,
            otp,
            user_id: targetId,
            actor: 'admin',
            kind: 'owner-otp-reset',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            used_at: null
        };
        state.meta.password_reset_tokens = safeArray(state.meta.password_reset_tokens).filter((existing) => Number(existing.user_id) !== targetId || existing.used_at);
        state.meta.password_reset_tokens.push(entry);
        pushAuditLog(state, req.user, 'password_reset_issued', { type: 'user', id: targetId, username: userRow.username }, { kind: 'owner-otp-reset' });
        writeJson(appDataPath, state);
        notifyUser(targetId, 'password_reset', 'Password reset issued', 'A temporary password reset code was issued for your account by the site owner.', '/reset-password');
        res.json({
            success: true,
            otp,
            token,
            reset_url: `/reset-password?token=${encodeURIComponent(token)}`,
            expires_at: entry.expires_at,
            user: { id: userRow.id, username: userRow.username, email: userRow.email }
        });
    } catch (error) {
        console.error('Admin password reset error:', error);
        res.status(500).json({ error: 'Failed to create password reset OTP' });
    }
});


router.get('/admin/cases/manage', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const cases = getTable('cases')
            .slice()
            .sort((a, b) => Number(b.is_featured || 0) - Number(a.is_featured || 0) || String(a.name || '').localeCompare(String(b.name || '')))
            .map((caseRow) => ({
                ...caseRow,
                total_items: dedupeCaseContents(getTable('case_contents').filter((entry) => Number(entry.case_id) === Number(caseRow.id))).length,
                is_live: isCaseLive(caseRow)
            }));
        res.json({ cases });
    } catch (error) {
        console.error('Admin case manager load error:', error);
        res.status(500).json({ error: 'Failed to load admin case manager' });
    }
});

router.post('/admin/cases/:id/update', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const caseId = Number(req.params.id);
        const state = readAppState();
        const caseRow = safeArray(state.tables?.cases).find((row) => Number(row.id) === caseId);
        if (!caseRow) return res.status(404).json({ error: 'Case not found' });

        const name = normalizeText(req.body.name).slice(0, 80);
        const description = normalizeText(req.body.description).slice(0, 180);
        const category = normalizeText(req.body.category).slice(0, 40);
        const priceValue = req.body.price === undefined || req.body.price === null || req.body.price === '' ? null : Number(req.body.price);
        const launchAtRaw = normalizeText(req.body.launch_at || req.body.launchAt || '');
        const imageColor = normalizeText(req.body.image_color || req.body.imageColor || '').slice(0, 20);
        const rotationName = normalizeText(req.body.rotation_name || req.body.rotationName || '').slice(0, 40);
        const rotationStartsAt = normalizeText(req.body.rotation_starts_at || req.body.rotationStartsAt || '');
        const rotationEndsAt = normalizeText(req.body.rotation_ends_at || req.body.rotationEndsAt || '');

        if (name) caseRow.name = name;
        if (description) caseRow.description = description;
        if (category) caseRow.category = category;
        if (priceValue !== null) {
            if (!(priceValue > 0)) return res.status(400).json({ error: 'Case price must be greater than 0' });
            caseRow.price = Number(priceValue.toFixed(2));
        }
        if (launchAtRaw || req.body.clear_launch_at) {
            caseRow.launch_at = req.body.clear_launch_at ? null : launchAtRaw;
        }
        if (imageColor) caseRow.image_color = imageColor;
        if (rotationName || req.body.clear_rotation_name) caseRow.rotation_name = req.body.clear_rotation_name ? '' : rotationName;
        if (rotationStartsAt || req.body.clear_rotation_starts_at) caseRow.rotation_starts_at = req.body.clear_rotation_starts_at ? null : rotationStartsAt;
        if (rotationEndsAt || req.body.clear_rotation_ends_at) caseRow.rotation_ends_at = req.body.clear_rotation_ends_at ? null : rotationEndsAt;
        if (req.body.is_featured !== undefined) caseRow.is_featured = Number(req.body.is_featured ? 1 : 0);
        if (req.body.is_hidden !== undefined) caseRow.is_hidden = Number(req.body.is_hidden ? 1 : 0);

        writeJson(appDataPath, state);
        res.json({ success: true, case: { ...caseRow, is_live: isCaseLive(caseRow) } });
    } catch (error) {
        console.error('Admin case update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update case' });
    }
});


router.post('/admin/cases/:id/clone', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const caseId = Number(req.params.id);
        const state = readAppState();
        ensureStateMeta(state);
        const sourceCase = safeArray(state.tables?.cases).find((row) => Number(row.id) === caseId);
        if (!sourceCase) return res.status(404).json({ error: 'Case not found' });
        const sourceContents = dedupeCaseContents(safeArray(state.tables?.case_contents).filter((row) => Number(row.case_id) === caseId));
        const newCaseId = nextStateId(state, 'cases');
        const cloneName = normalizeText(req.body.name || `${sourceCase.name} Clone`).slice(0, 80) || `${sourceCase.name} Clone`;
        const clonedCase = {
            ...JSON.parse(JSON.stringify(sourceCase)),
            id: newCaseId,
            name: cloneName,
            times_opened: 0,
            created_at: new Date().toISOString(),
            launch_at: null,
            is_hidden: 1,
            is_featured: 0
        };
        state.tables.cases = safeArray(state.tables.cases);
        state.tables.case_contents = safeArray(state.tables.case_contents);
        state.tables.cases.push(clonedCase);
        sourceContents.forEach((item) => {
            state.tables.case_contents.push({
                ...JSON.parse(JSON.stringify(item)),
                id: nextStateId(state, 'case_contents'),
                case_id: newCaseId
            });
        });
        writeJson(appDataPath, state);
        res.json({ success: true, case: clonedCase });
    } catch (error) {
        console.error('Admin case clone error:', error);
        res.status(500).json({ error: 'Failed to clone case' });
    }
});

router.post('/admin/cases/:id/dedupe', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const caseId = Number(req.params.id);
        const state = readAppState();
        const contents = safeArray(state.tables?.case_contents).filter((row) => Number(row.case_id) === caseId);
        const deduped = dedupeCaseContents(contents);
        if (!deduped.length) return res.status(404).json({ error: 'Case not found or no case contents available' });
        const removed = contents.length - deduped.length;
        state.tables.case_contents = safeArray(state.tables.case_contents).filter((row) => Number(row.case_id) !== caseId).concat(deduped);
        writeJson(appDataPath, state);
        res.json({ success: true, removed_duplicates: Math.max(0, removed), total_items: deduped.length });
    } catch (error) {
        console.error('Admin case dedupe error:', error);
        res.status(500).json({ error: 'Failed to dedupe case contents' });
    }
});

router.post('/admin/cases/:id/delete', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const caseId = Number(req.params.id);
        const state = readAppState();
        const caseRow = safeArray(state.tables?.cases).find((row) => Number(row.id) === caseId);
        if (!caseRow) return res.status(404).json({ error: 'Case not found' });
        state.tables.cases = safeArray(state.tables.cases).filter((row) => Number(row.id) !== caseId);
        state.tables.case_contents = safeArray(state.tables.case_contents).filter((row) => Number(row.case_id) !== caseId);
        writeJson(appDataPath, state);
        res.json({ success: true, deleted_case_id: caseId });
    } catch (error) {
        console.error('Admin case delete error:', error);
        res.status(500).json({ error: 'Failed to delete case' });
    }
});

router.post('/admin/users/:id/grant-item', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const targetId = Number(req.params.id);
        const state = readAppState();
        const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === targetId);
        if (!userRow) return res.status(404).json({ error: 'User not found' });
        buildUserAccountSnapshot(state, targetId, { actorId: req.user.id, reason: 'Admin item grant', label: 'Item grant' });

        const pokemonName = normalizeText(req.body.pokemon_name || req.body.pokemonName).slice(0, 60);
        const pokemonForm = normalizeText(req.body.pokemon_form || req.body.pokemonForm || '').slice(0, 40) || null;
        const rarity = normalizeText(req.body.rarity || 'rare').toLowerCase();
        const odds = Math.max(1, Number(req.body.odds || 100));
        const isShiny = Number(req.body.is_shiny || req.body.isShiny || 0) ? 1 : 0;
        const sourceLabel = normalizeText(req.body.source_label || req.body.sourceLabel || 'Admin grant').slice(0, 80) || 'Admin grant';
        const spriteUrl = buildSpriteUrl(pokemonName, req.body.sprite_url || req.body.spriteUrl || '');

        if (!pokemonName) return res.status(400).json({ error: 'Pokémon name is required' });

        if (!state.meta) state.meta = { nextIds: {} };
        if (!state.meta.nextIds) state.meta.nextIds = {};
        state.tables.inventory = safeArray(state.tables.inventory);
        state.tables.openings = safeArray(state.tables.openings);

        const inventoryId = Number(state.meta.nextIds.inventory || 1);
        state.meta.nextIds.inventory = inventoryId + 1;
        const openingId = Number(state.meta.nextIds.openings || 1);
        state.meta.nextIds.openings = openingId + 1;
        const acquiredAt = new Date().toISOString();
        const value = computeEstimatedValue({ odds, rarity, is_shiny: isShiny, casePrice: 6.99 });

        state.tables.inventory.push({
            id: inventoryId,
            user_id: targetId,
            case_id: 0,
            pokemon_name: pokemonName,
            pokemon_form: pokemonForm,
            rarity,
            sprite_url: spriteUrl,
            is_shiny: isShiny,
            is_listed: 0,
            listed_price: null,
            acquired_at: acquiredAt,
            estimated_value: value,
            original_owner_id: targetId,
            original_owner_username: userRow.username,
            odds
        });

        state.tables.openings.push({
            id: openingId,
            user_id: targetId,
            username: userRow.username,
            case_id: 0,
            case_name: sourceLabel,
            item_id: inventoryId,
            pokemon_name: pokemonName,
            pokemon_form: pokemonForm,
            rarity,
            sprite_url: spriteUrl,
            is_shiny: isShiny,
            amount_paid: 0,
            is_public: 1,
            opened_at: acquiredAt,
            seed: `admin-${Date.now()}-${inventoryId}`
        });

        writeJson(appDataPath, state);
        notifyUser(targetId, 'admin_grant', 'Pokémon added', `${pokemonName}${pokemonForm ? ` (${pokemonForm})` : ''} was added to your inventory by the site owner.`, '/inventory', { rarity, isShiny, sourceLabel });
        res.json({ success: true, item: enrichInventoryLikeItem(state.tables.inventory.find((entry) => Number(entry.id) === inventoryId), { odds, case_id: 0 }) });
    } catch (error) {
        console.error('Admin grant item error:', error);
        res.status(500).json({ error: error.message || 'Failed to grant Pokémon item' });
    }
});

router.post('/admin/cases', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const name = normalizeText(req.body.name).slice(0, 60);
        const description = normalizeText(req.body.description).slice(0, 180);
        const category = normalizeText(req.body.category || 'special') || 'special';
        const imageColor = normalizeText(req.body.image_color || req.body.imageColor || '#8b5cf6') || '#8b5cf6';
        const price = Number(req.body.price || 0);
        const launchAt = normalizeText(req.body.launch_at || req.body.launchAt || '');
        const rotationName = normalizeText(req.body.rotation_name || req.body.rotationName || '').slice(0, 40);
        const rotationStartsAt = normalizeText(req.body.rotation_starts_at || req.body.rotationStartsAt || '');
        const rotationEndsAt = normalizeText(req.body.rotation_ends_at || req.body.rotationEndsAt || '');
        const itemsText = String(req.body.items_text || req.body.itemsText || '').trim();
        if (!name || !(price > 0)) {
            return res.status(400).json({ error: 'Case name and positive price are required' });
        }
        const lines = itemsText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        if (lines.length < 3) {
            return res.status(400).json({ error: 'Add at least 3 case item lines using Name|rarity|odds|shiny(optional)|form(optional)' });
        }
        const parsedItems = dedupeCaseContents(lines.map((line) => {
            const parts = line.split('|').map((part) => part.trim());
            const pokemon_name = parts[0];
            const rarity = (parts[1] || 'rare').toLowerCase();
            const odds = Math.max(Number(parts[2] || 100), 1);
            const is_shiny = /^(1|true|yes|shiny)$/i.test(parts[3] || '') ? 1 : 0;
            const pokemon_form = parts[4] || null;
            if (!pokemon_name) throw new Error('Every line needs a Pokémon name');
            return { pokemon_name, rarity, odds, is_shiny, pokemon_form };
        })).map((item) => ({
            pokemonName: item.pokemon_name,
            rarity: item.rarity,
            odds: item.odds,
            shiny: item.is_shiny,
            form: item.pokemon_form
        }));
        const state = readAppState();
        if (!state.meta) state.meta = { nextIds: {} };
        if (!state.meta.nextIds) state.meta.nextIds = {};
        const caseId = Number(state.meta.nextIds.cases || 1);
        state.meta.nextIds.cases = caseId + 1;
        const contentStartId = Number(state.meta.nextIds.case_contents || 1);
        state.meta.nextIds.case_contents = contentStartId + parsedItems.length;
        state.tables.cases = safeArray(state.tables.cases);
        state.tables.case_contents = safeArray(state.tables.case_contents);
        const caseRow = {
            id: caseId,
            name,
            description,
            price: Number(price.toFixed(2)),
            image_color: imageColor,
            is_featured: Number(req.body.is_featured ? 1 : 0),
            category,
            min_odds: Math.min(...parsedItems.map((item) => item.odds)),
            max_odds: Math.max(...parsedItems.map((item) => item.odds)),
            times_opened: 0,
            created_at: new Date().toISOString(),
            launch_at: launchAt || null,
            rotation_name: rotationName || '',
            rotation_starts_at: rotationStartsAt || null,
            rotation_ends_at: rotationEndsAt || null,
            is_hidden: 0
        };
        state.tables.cases.push(caseRow);
        parsedItems.forEach((item, index) => {
            state.tables.case_contents.push({
                id: contentStartId + index,
                case_id: caseId,
                pokemon_id: 0,
                pokemon_name: item.pokemonName,
                pokemon_form: item.form,
                rarity: item.rarity,
                sprite_url: buildSpriteUrl(item.pokemonName),
                odds: item.odds,
                is_shiny: item.shiny,
                estimated_value: computeEstimatedValue({ odds: item.odds, rarity: item.rarity, is_shiny: item.shiny, casePrice: caseRow.price })
            });
        });
        writeJson(appDataPath, state);
        const store = readCommunityStore();
        store.announcements.unshift({
            id: store.nextAnnouncementId++,
            type: 'case_drop',
            created_at: new Date().toISOString(),
            expires_at: launchAt ? new Date(new Date(launchAt).getTime() + 30 * 60 * 1000).toISOString() : new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            message: launchAt ? `${name} is scheduled for launch.` : `${name} is now live.`,
            link: '/cases',
            meta: { case_id: caseId, launch_at: launchAt || null }
        });
        writeCommunityStore(store);
        res.json({ success: true, case: caseRow });
    } catch (error) {
        console.error('Admin case create error:', error);
        res.status(500).json({ error: error.message || 'Failed to create case' });
    }
});

router.post('/admin/claims', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const type = normalizeText(req.body.type || 'balance').toLowerCase();
        const title = normalizeText(req.body.title || 'KatsuCases Drop').slice(0, 60) || 'KatsuCases Drop';
        const maxClaims = Math.max(1, parseInt(req.body.max_claims || req.body.maxClaims || 1, 10) || 1);
        const expiresMinutes = Math.max(1, parseInt(req.body.expires_minutes || req.body.expiresMinutes || 60, 10) || 60);
        const lockedUserId = req.body.locked_user_id ? Number(req.body.locked_user_id) : null;
        const details = { ...req.body.details };
        if (type === 'balance') details.amount = Number(req.body.amount || details.amount || 0);
        if (type === 'rolls') details.rolls = Math.max(1, parseInt(req.body.rolls || details.rolls || 1, 10));
        if (type === 'badge') details.badge = normalizeBadgeKey(req.body.badge || details.badge || 'vip');
        if (type === 'pokemon') {
            details.pokemon_name = normalizeText(req.body.pokemon_name || details.pokemon_name || 'Eevee');
            details.rarity = normalizeText(req.body.rarity || details.rarity || 'epic').toLowerCase();
            details.is_shiny = Number(req.body.is_shiny || details.is_shiny || 0);
            details.odds = Math.max(Number(req.body.odds || details.odds || 5000), 1);
        }
        const store = readCommunityStore();
        const code = Math.random().toString(36).slice(2, 10).toUpperCase();
        const claim = {
            id: store.nextClaimId++,
            code,
            type,
            title,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString(),
            max_claims: maxClaims,
            locked_user_id: lockedUserId,
            details,
            claimed_by: [],
            status: 'active'
        };
        store.claimDrops.unshift(claim);
        addCommunityMessage(store, {
            type: 'system',
            username: 'KatsuCases',
            message: `${title} claim link is live. Use code ${code}.`,
            meta: { code, type }
        });
        writeCommunityStore(store);
        res.json({ success: true, claim, url: `/claims/${code}`, api_url: `/api/claims/${code}` });
    } catch (error) {
        console.error('Admin claim create error:', error);
        res.status(500).json({ error: 'Failed to create claim link' });
    }
});

router.post('/admin/rain', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const amount = Number(req.body.amount || 0);
        const durationMinutes = Math.min(Math.max(parseInt(req.body.durationMinutes, 10) || 5, 1), 120);
        const title = String(req.body.title || 'Owner Rain').trim().slice(0, 60) || 'Owner Rain';

        if (!Number.isFinite(amount) || amount < 1) {
            return res.status(400).json({ error: 'Rain amount must be at least $1.00' });
        }

        const { store } = finalizeExpiredRain(false);
        if (store.activeRain && store.activeRain.status === 'active') {
            return res.status(400).json({ error: 'Finish the current rain before starting a new one' });
        }

        const rain = {
            id: store.nextRainId++,
            title,
            amount: Number(amount.toFixed(2)),
            duration_minutes: durationMinutes,
            status: 'active',
            created_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
            created_by_user_id: req.user.id,
            created_by_username: req.user.username,
            entrants: []
        };
        store.activeRain = rain;
        addCommunityMessage(store, {
            type: 'announcement',
            user_id: req.user.id,
            username: req.user.username,
            is_admin: true,
            message: `${title} is live. Enter now for a free split of $${formatAmount(rain.amount)}.`
        });
        writeCommunityStore(store);
        res.json({ success: true, activeRain: getRainPublic(rain, req.user.id) });
    } catch (error) {
        console.error('Create rain error:', error);
        res.status(500).json({ error: 'Failed to create rain' });
    }
});

router.post('/admin/rain/:id/finalize', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const { store } = finalizeExpiredRain(false);
        if (!store.activeRain || Number(store.activeRain.id) !== Number(req.params.id)) {
            return res.status(404).json({ error: 'Active rain not found' });
        }
        const result = finalizeExpiredRain(true);
        res.json({ success: true, finalizedRain: result.finalized });
    } catch (error) {
        console.error('Finalize rain error:', error);
        res.status(500).json({ error: 'Failed to finalize rain' });
    }
});

router.post('/admin/announcement', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const text = String(req.body.message || '').trim().replace(/\s+/g, ' ');
        const expiresMinutes = Math.max(5, parseInt(req.body.expires_minutes || req.body.expiresMinutes || 60, 10) || 60);
        const link = normalizeText(req.body.link || '');
        if (!text) {
            return res.status(400).json({ error: 'Announcement text is required' });
        }
        if (text.length > 240) {
            return res.status(400).json({ error: 'Announcement must be 240 characters or less' });
        }
        const store = readCommunityStore();
        const announcement = {
            id: store.nextAnnouncementId++,
            type: 'owner_notice',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString(),
            message: text,
            link: link || null,
            created_by_user_id: req.user.id,
            created_by_username: req.user.username
        };
        store.announcements.unshift(announcement);
        store.announcements = store.announcements.slice(0, 12);
        writeCommunityStore(store);
        res.json({ success: true, announcement });
    } catch (error) {
        console.error('Announcement error:', error);
        res.status(500).json({ error: 'Failed to post announcement' });
    }
});

// Get platform statistics
router.get('/stats', (req, res) => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const stats = {
            totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            totalCasesOpened: db.prepare('SELECT SUM(cases_opened) as total FROM users').get().total || 0,
            totalValue: db.prepare('SELECT SUM(price) as total FROM marketplace WHERE status = ?').get('sold').total || 0,
            activeListings: db.prepare('SELECT COUNT(*) as count FROM marketplace WHERE status = ?').get('active').count,
            recentPulls: db.prepare('SELECT COUNT(*) as count FROM openings WHERE opened_at > ?').get(oneDayAgo).count
        };

        res.json(stats);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get user transactions
router.get('/transactions', isAuthenticated, (req, res) => {
    try {
        const transactions = db.prepare(`
            SELECT * FROM transactions 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `).all(req.user.id);
        
        res.json({ transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Remove marketplace listing
router.delete('/marketplace/:id', isAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        let listing = db.prepare('SELECT * FROM marketplace WHERE id = ?').get(id);
        if (!listing) {
            const activeListings = db.prepare('SELECT * FROM marketplace WHERE status = ?').all('active');
            listing = activeListings.find((row) => Number(row.item_id) === Number(id) && Number(row.seller_id) === Number(userId));
        }

        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.seller_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Remove listing
        db.prepare('DELETE FROM marketplace WHERE id = ?').run(listing.id);
        
        // Update inventory
        db.prepare('UPDATE inventory SET is_listed = 0, listed_price = NULL WHERE id = ?').run(listing.item_id);

        notifyUser(userId, 'marketplace_removed', 'Listing removed', `${listing.pokemon_name} was removed from the marketplace.`, '/inventory', { listingId: listing.id, itemId: listing.item_id });

        res.json({ success: true });
    } catch (error) {
        console.error('Remove listing error:', error);
        res.status(500).json({ error: 'Failed to remove listing' });
    }
});

module.exports = router;
