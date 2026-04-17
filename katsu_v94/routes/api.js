const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { db, notifications } = require('../database');
const { isAuthenticated, optionalAuth } = require('../middleware/auth');
const { isAdminUserId, getOwnerUserId } = require('../utils/roles');

const dataDir = path.join(__dirname, '..', 'data');
const appDataPath = path.join(dataDir, 'katsucases.json');
const replayDataPath = path.join(dataDir, 'replays.json');
const caseVsDataPath = path.join(dataDir, 'casevs.json');
const communityDataPath = path.join(dataDir, 'community.json');

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
    owner: { label: 'OWNER', className: 'badge-legendary' },
    vip: { label: 'VIP', className: 'badge-epic' },
    beta: { label: 'BETA', className: 'badge-rare' },
    'beta tester': { label: 'BETA', className: 'badge-rare' },
    moderator: { label: 'MOD', className: 'badge-uncommon' },
    creator: { label: 'CREATOR', className: 'badge-mythical' }
};

const POKEMON_CACHE = { fetchedAt: 0, names: [] };
const POKEMON_CACHE_TTL = 1000 * 60 * 60 * 12;

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
    return String(value ?? '').trim();
}

function normalizeBadgeKey(value) {
    return normalizeText(value).toLowerCase();
}

function slugifyPokemonName(value) {
    return String(value || 'pokemon').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildSpriteUrl(pokemonName, spriteUrl = '') {
    if (spriteUrl && typeof spriteUrl === 'string') {
        let normalized = spriteUrl.replace('/sprites/ani-shiny/', '/sprites/ani/');
        normalized = normalized.replace(/-shiny(?=\.gif(?:\?|$))/, '');
        if (normalized.includes('/sprites/ani/')) {
            return normalized;
        }
    }
    return `https://play.pokemonshowdown.com/sprites/ani/${slugifyPokemonName(pokemonName)}.gif`;
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
    return getAllUsers().find((row) => String(row.username || '').toLowerCase() === needle || String(row.display_name || '').toLowerCase() === needle) || null;
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
    if (caseInfo.launch_at && new Date(caseInfo.launch_at).getTime() > Date.now()) return false;
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
    return store;
}

function writeCommunityStore(value) {
    writeJson(communityDataPath, value);
}

function requireAdmin(req, res, next) {
    if (!req.user || !isAdminUserId(req.user.id)) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

function addCommunityMessage(store, payload) {
    const linkedUser = payload.user_id ? getUserById(payload.user_id) : null;
    const profile = buildUserTagPayload(linkedUser || payload.user || null);
    const message = {
        id: store.nextMessageId++,
        created_at: new Date().toISOString(),
        type: payload.type || 'user',
        user_id: payload.user_id || linkedUser?.id || null,
        username: payload.username || linkedUser?.username || 'KatsuCases',
        display_name: payload.display_name || profile.display_name || payload.username || 'KatsuCases',
        is_admin: Boolean(payload.is_admin || (linkedUser && isAdminUserId(linkedUser.id))),
        avatar_url: payload.avatar_url !== undefined ? payload.avatar_url : profile.avatar_url,
        region: payload.region !== undefined ? payload.region : profile.region,
        pronouns: payload.pronouns !== undefined ? payload.pronouns : profile.pronouns,
        badges: Array.isArray(payload.badges) ? payload.badges : profile.badges,
        custom_role: payload.custom_role !== undefined ? payload.custom_role : profile.custom_role,
        message: String(payload.message || '').trim(),
        meta: payload.meta || null
    };
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

function pickCaseResult(contents) {
    const enriched = safeArray(contents).map((item) => enrichCaseContent(item));
    const totalWeight = enriched.reduce((sum, row) => sum + Number(row.weight || getItemWeight(row)), 0);
    let random = Math.random() * totalWeight;
    let selected = enriched[enriched.length - 1] || null;
    for (const item of enriched) {
        random -= Number(item.weight || getItemWeight(item));
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

function buildReplayTrack(contents, winner, slots = 48) {
    const enriched = safeArray(contents).map((item) => enrichCaseContent(item));
    if (!enriched.length) return { track: [], winnerIndex: 0 };
    const track = [];
    const winnerIndex = Number.isFinite(Number(winner?.winning_index)) ? Number(winner.winning_index) : Math.max(8, slots - 7);
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
            is_admin: isAdminUserId(user.id),
            avatar_url: user.avatar_url || null,
            region: user.region || '',
            badges: getUserBadges(user).map(serializeBadge),
            custom_role: user.custom_role || ''
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
    const shouldBroadcast = ['legendary', 'mythical'].includes(String(result?.rarity || '').toLowerCase()) || odds >= 1000000;
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
    store.announcements.unshift({
        id: store.nextAnnouncementId++,
        type: 'rare_roll',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        message,
        link: '/livepulls',
        meta: { seed, case_name: caseInfo.name, username: user.username, pokemon_name: result.pokemon_name }
    });
    store.announcements = store.announcements.slice(0, 12);
    writeCommunityStore(store);
}

function openCaseForUser({ userId, username, caseInfo, contents, seed, source = 'case_open', roomId = null }) {
    const selectedItem = enrichCaseContent(pickCaseResult(contents), caseInfo);
    const inventoryResult = db.prepare(`
        INSERT INTO inventory (user_id, pokemon_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        selectedItem.pokemon_id,
        selectedItem.pokemon_name,
        selectedItem.pokemon_form,
        selectedItem.rarity,
        buildSpriteUrl(selectedItem.pokemon_name, selectedItem.sprite_url),
        selectedItem.is_shiny
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
        selectedItem.pokemon_name,
        selectedItem.pokemon_form,
        selectedItem.rarity,
        buildSpriteUrl(selectedItem.pokemon_name, selectedItem.sprite_url),
        selectedItem.is_shiny,
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
        pokemon_id: selectedItem.pokemon_id,
        pokemon_name: selectedItem.pokemon_name,
        pokemon_form: selectedItem.pokemon_form || null,
        rarity: selectedItem.rarity,
        sprite_url: buildSpriteUrl(selectedItem.pokemon_name, selectedItem.sprite_url),
        is_shiny: selectedItem.is_shiny,
        odds: Math.max(Number(selectedItem.odds || 1), 1),
        estimated_value: Number(selectedItem.estimated_value || computeEstimatedValue({ odds: selectedItem.odds, rarity: selectedItem.rarity, is_shiny: selectedItem.is_shiny, casePrice: caseInfo.price }))
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

    const finalResult = { ...enrichedResult, replayId: replay.id, track: replayTrack, winning_index: winningIndex };
    const user = getUserById(userId) || { id: userId, username };
    maybeCreateRareRollAnnouncement({ user, result: finalResult, caseInfo, seed });
    return finalResult;
}

function notifyUser(userId, type, title, message, link = null, meta = null) {
    if (!userId) return;
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

// Get all cases
router.get('/cases', (req, res) => {
    try {
        const { category, featured } = req.query;
        const viewer = req.session?.userId ? getUserById(req.session.userId) : null;
        const canSeeHidden = Boolean(viewer && isAdminUserId(viewer.id));

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

        const casesWithCounts = cases.map((c) => {
            const contents = db.prepare('SELECT COUNT(*) as count FROM case_contents WHERE case_id = ?').get(c.id);
            const contentRows = db.prepare('SELECT * FROM case_contents WHERE case_id = ? ORDER BY odds ASC').all(c.id).map((row) => enrichCaseContent(row, c));
            const rarities = db.prepare(`
                SELECT rarity, COUNT(*) as count, MIN(odds) as min_odds, MAX(odds) as max_odds 
                FROM case_contents 
                WHERE case_id = ? 
                GROUP BY rarity
            `).all(c.id);
            return {
                ...c,
                total_items: contents.count,
                rarity_breakdown: rarities,
                is_live: isCaseLive(c),
                next_launch_at: c.launch_at || null,
                top_items: contentRows.slice(0, 5)
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
        const canSeeHidden = Boolean(viewer && isAdminUserId(viewer.id));

        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
        if (!caseInfo) {
            return res.status(404).json({ error: 'Case not found' });
        }
        if (!canSeeHidden && !isCaseLive(caseInfo)) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const contents = db.prepare('SELECT * FROM case_contents WHERE case_id = ? ORDER BY odds ASC').all(id).map((row) => enrichCaseContent(row, caseInfo));
        const byRarity = {};
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];

        for (const rarity of rarities) {
            byRarity[rarity] = contents.filter((c) => c.rarity === rarity);
        }

        res.json({
            case: { ...caseInfo, is_live: isCaseLive(caseInfo) },
            contents,
            byRarity,
            totalItems: contents.length
        });
    } catch (error) {
        console.error('Get case error:', error);
        res.status(500).json({ error: 'Failed to fetch case' });
    }
});

// Open case
router.post('/cases/:id/open', isAuthenticated, (req, res) => {
    try {
        const { id } = req.params;
        const amount = Math.min(Math.max(parseInt(req.body.amount, 10) || 1, 1), 10);
        const userId = req.user.id;

        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
        if (!caseInfo || !isCaseLive(caseInfo)) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const liveUser = getUserById(userId);
        const freeRolls = Math.max(0, Number(liveUser?.free_rolls || 0));
        const paidRolls = Math.max(0, amount - freeRolls);
        const freeRollsUsed = Math.min(amount, freeRolls);
        const totalCost = Number(caseInfo.price) * paidRolls;
        if (Number(req.user.balance) < totalCost) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const contents = db.prepare('SELECT * FROM case_contents WHERE case_id = ?').all(id).map((row) => enrichCaseContent(row, caseInfo));
        const baseSeed = createSeed();
        const results = [];

        for (let i = 0; i < amount; i += 1) {
            const seed = `${baseSeed}-${i + 1}`;
            const result = openCaseForUser({
                userId,
                username: req.user.username,
                caseInfo,
                contents,
                seed,
                source: 'case_open'
            });
            db.prepare('UPDATE cases SET times_opened = times_opened + 1 WHERE id = ?').run(id);
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
            const state = readAppState();
            const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(userId));
            if (userRow) {
                userRow.cases_opened = Number(userRow.cases_opened || 0) + amount;
            }
            writeJson(appDataPath, state);
            db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
                userId,
                'free_roll',
                0,
                `Opened ${amount}x ${caseInfo.name} with free rolls`
            );
        }

        if (freeRollsUsed > 0) {
            const state = readAppState();
            const userRow = safeArray(state.tables?.users).find((row) => Number(row.id) === Number(userId));
            if (userRow) userRow.free_rolls = Math.max(0, Number(userRow.free_rolls || 0) - freeRollsUsed);
            writeJson(appDataPath, state);
        }

        const updatedUser = getUserById(userId);

        res.json({
            success: true,
            results,
            newBalance: Number(updatedUser?.balance || 0),
            freeRolls: Number(updatedUser?.free_rolls || 0),
            freeRollsUsed,
            paidRolls,
            seed: baseSeed
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

        const items = db.prepare(query).all(...params).map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
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

        if (item.is_listed) {
            return res.status(400).json({ error: 'Item is already listed' });
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
        const { receiverId, receiverUsername, items, requestedItemIds = [] } = req.body;
        const senderId = req.user.id;

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

        const validItems = [];
        for (const itemId of selectedItemIds) {
            const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, senderId);
            if (item && !Number(item.is_listed)) {
                validItems.push(item);
            }
        }

        if (validItems.length === 0) {
            return res.status(400).json({ error: 'No valid trade items were selected' });
        }

        const requestedItems = [];
        for (const itemId of requestedIds) {
            const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, receiver.id);
            if (item && !Number(item.is_listed)) {
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
            receiver_accepts_free: 0
        });

        notifyUser(receiver.id, 'trade_request', 'New trade request', `${req.user.username} sent you a trade request with ${validItems.length} offered item(s)${requestedItems.length ? ` and requested ${requestedItems.length} item(s) from you` : ''}${fairness.isFreeTrade ? '. This is a one-sided trade and requires your confirmation.' : ''}.`, '/trading', { tradeId: result.lastInsertRowid, senderId, fairness });
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
                if (!item || Number(item.is_listed)) {
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
                if (!stillOwned || Number(stillOwned.is_listed)) {
                    return res.status(400).json({ error: 'The sender no longer owns one of the offered items' });
                }
            }

            for (const item of nextReceiverItems) {
                const stillOwned = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(item.id, trade.receiver_id);
                if (!stillOwned || Number(stillOwned.is_listed)) {
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
            user: { id: user.id, username: user.username, display_name: getUserDisplayName(user), avatar_url: user.avatar_url || null, badges: getUserBadges(user).map(serializeBadge), region: user.region || '' },
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
        const inventory = getTable('inventory').filter((item) => Number(item.user_id) === Number(user.id)).map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
        const openings = getTable('openings').filter((item) => Number(item.user_id) === Number(user.id)).slice().sort((a, b) => String(b.opened_at || '').localeCompare(String(a.opened_at || ''))).slice(0, 10).map((item) => enrichInventoryLikeItem(item, { case_id: item.case_id, odds: item.odds }));
        const publicUser = {
            id: user.id,
            username: user.username,
            display_name: getUserDisplayName(user),
            email: req.user && Number(req.user.id) === Number(user.id) ? user.email : null,
            avatar_url: user.avatar_url || null,
            pronouns: user.pronouns || '',
            region: user.region || '',
            badges: getUserBadges(user).map(serializeBadge),
            custom_role: user.custom_role || '',
            created_at: user.created_at,
            balance: Number(user.balance || 0),
            cases_opened: Number(user.cases_opened || 0),
            total_spent: Number(user.total_spent || 0),
            total_earned: Number(user.total_earned || 0),
            free_rolls: Number(user.free_rolls || 0),
            inventory_count: inventory.length,
            inventory_value: Number(inventory.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2)),
            profile_link: getProfileLink(user)
        };
        res.json({
            user: publicUser,
            featuredInventory: inventory.slice().sort((a, b) => Number(b.estimated_value || 0) - Number(a.estimated_value || 0)).slice(0, 12),
            recentOpens: openings,
            canTrade: Boolean(req.user && Number(req.user.id) !== Number(user.id))
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
        const avatarUrl = normalizeText(req.body.avatar_url || req.body.avatarUrl || '').slice(0, 300);
        const pronouns = normalizeText(req.body.pronouns || '').slice(0, 24);
        const region = normalizeText(req.body.region || '').slice(0, 48);
        const state = readAppState();
        const users = safeArray(state.tables?.users);
        const currentUser = users.find((row) => Number(row.id) === Number(req.user.id));
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-20 characters using letters, numbers, or underscores' });
        }
        const conflict = users.find((row) => Number(row.id) !== Number(req.user.id) && (String(row.username).toLowerCase() === username.toLowerCase()));
        if (conflict) {
            return res.status(400).json({ error: 'That username is already taken' });
        }
        currentUser.username = username;
        currentUser.display_name = displayName || username;
        currentUser.avatar_url = avatarUrl || null;
        currentUser.pronouns = pronouns;
        currentUser.region = region;
        writeJson(appDataPath, state);
        res.json({ success: true, user: getUserById(req.user.id) });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Case Vs lobby rooms
router.get('/casevs/rooms', (req, res) => {
    try {
        const store = readCaseVsStore();
        const rooms = store.rooms
            .slice()
            .sort((a, b) => String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)))
            .map((room) => ({
                ...room,
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
        res.json({ room });
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
        res.json({ success: true, room });
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
        room.updated_at = new Date().toISOString();

        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(room.case_id);
        const contents = db.prepare('SELECT * FROM case_contents WHERE case_id = ?').all(room.case_id);
        const roundWins = {};
        let bestPull = null;

        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(entryCost, creator.id);
        db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(entryCost, joiner.id);
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(creator.id, 'purchase', -entryCost, `Joined Case Vs room #${room.id}`);
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(joiner.id, 'purchase', -entryCost, `Joined Case Vs room #${room.id}`);

        for (let round = 1; round <= Number(room.rounds); round += 1) {
            const pulls = room.players.map((player, index) => {
                const seed = `${room.seed}-r${round}-p${index + 1}`;
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
            pulls.sort((a, b) => b.score - a.score || (RARITY_SCORE[b.rarity] - RARITY_SCORE[a.rarity]));
            const roundWinner = pulls[0];
            roundWins[roundWinner.user_id] = (roundWins[roundWinner.user_id] || 0) + 1;
            if (!bestPull || roundWinner.score > bestPull.score) bestPull = roundWinner;
            room.rounds_data.push({ round, winner_user_id: roundWinner.user_id, winner_username: roundWinner.username, pulls });
        }

        const [playerA, playerB] = room.players;
        const winsA = roundWins[playerA.user_id] || 0;
        const winsB = roundWins[playerB.user_id] || 0;
        const winner = winsA === winsB ? bestPull : (winsA > winsB ? playerA : playerB);

        room.winner_user_id = winner.user_id;
        room.winner_username = winner.username;
        room.status = 'finished';
        room.updated_at = new Date().toISOString();
        const totalPot = Number((entryCost * room.players.length).toFixed(2));
        const winnerUserId = Number(winner.user_id);
        const loserUserId = Number(playerA.user_id) === winnerUserId ? Number(playerB.user_id) : Number(playerA.user_id);
        const state = readAppState();
        const winningUser = safeArray(state.tables?.users).find((row) => Number(row.id) === winnerUserId);
        if (winningUser) {
            winningUser.balance = Number((Number(winningUser.balance || 0) + totalPot).toFixed(2));
            winningUser.total_earned = Number((Number(winningUser.total_earned || 0) + totalPot).toFixed(2));
            writeJson(appDataPath, state);
        }
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(winnerUserId, 'casevs_win', totalPot, `Won Case Vs room #${room.id}`);
        room.summary = {
            wins: { [playerA.user_id]: winsA, [playerB.user_id]: winsB },
            best_pull: bestPull,
            pot_amount: totalPot,
            loser_user_id: loserUserId
        };

        notifyUser(playerA.user_id, 'casevs_joined', 'Case Vs started', `${joiner.username} joined your room for ${room.case_name}.`, '/casevs', { roomId: room.id });
        notifyUser(playerA.user_id, 'casevs_finished', 'Case Vs finished', `${room.winner_username} won room #${room.id}${winnerUserId === Number(playerA.user_id) ? ` and banked $${formatAmount(totalPot)}.` : '.'}`, '/casevs', { roomId: room.id, pot_amount: totalPot });
        notifyUser(playerB.user_id, 'casevs_finished', 'Case Vs finished', `${room.winner_username} won room #${room.id}${winnerUserId === Number(playerB.user_id) ? ` and banked $${formatAmount(totalPot)}.` : '.'}`, '/casevs', { roomId: room.id, pot_amount: totalPot });

        writeCaseVsStore(store);
        res.json({ success: true, room });
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
            viewerIsAdmin: Boolean(req.user && isAdminUserId(req.user.id)),
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
        touchPresence(store, liveUser, { typing: false });
        clearTyping(store, req.user.id);
        const message = addCommunityMessage(store, {
            type: 'user',
            user_id: req.user.id,
            username: req.user.username,
            display_name: getUserDisplayName(liveUser),
            is_admin: isAdminUserId(req.user.id),
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
        const isOwner = Boolean(req.user && isAdminUserId(req.user.id));
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
            is_admin: isAdminUserId(user.id)
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
            cases: getTable('cases').slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 12)
        });
    } catch (error) {
        console.error('Admin summary error:', error);
        res.status(500).json({ error: 'Failed to fetch admin summary' });
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
        targetRow.balance = newBalance;
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
        const region = normalizeText(req.body.region || '').slice(0, 40);
        const freeRolls = req.body.free_rolls === undefined ? null : Math.max(0, parseInt(req.body.free_rolls, 10) || 0);
        const mode = normalizeText(req.body.mode || 'add').toLowerCase();
        userRow.badges = safeArray(userRow.badges);
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
        writeJson(appDataPath, state);
        notifyUser(targetId, 'admin_role', 'Profile role updated', 'Your account badges, role, or bonus rolls were updated by the site owner.', '/profile', { badge, customRole, region, freeRolls });
        res.json({ success: true, user: userRow });
    } catch (error) {
        console.error('Admin role update error:', error);
        res.status(500).json({ error: 'Failed to update user badges or role' });
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
        const itemsText = String(req.body.items_text || req.body.itemsText || '').trim();
        if (!name || !(price > 0)) {
            return res.status(400).json({ error: 'Case name and positive price are required' });
        }
        const lines = itemsText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
        if (lines.length < 3) {
            return res.status(400).json({ error: 'Add at least 3 case item lines using Name|rarity|odds|shiny(optional)|form(optional)' });
        }
        const parsedItems = lines.map((line) => {
            const parts = line.split('|').map((part) => part.trim());
            const pokemonName = parts[0];
            const rarity = (parts[1] || 'rare').toLowerCase();
            const odds = Math.max(Number(parts[2] || 100), 1);
            const shiny = /^(1|true|yes|shiny)$/i.test(parts[3] || '') ? 1 : 0;
            const form = parts[4] || null;
            if (!pokemonName) throw new Error('Every line needs a Pokémon name');
            return { pokemonName, rarity, odds, shiny, form };
        });
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
        res.json({ success: true, claim, url: `/api/claims/${code}` });
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
