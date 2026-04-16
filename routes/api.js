const express = require('express');
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

function readCaseVsStore() {
    return readJson(caseVsDataPath, { nextId: 1, rooms: [] });
}

function writeCaseVsStore(value) {
    writeJson(caseVsDataPath, value);
}


function readCommunityStore() {
    const store = readJson(communityDataPath, { nextMessageId: 1, nextRainId: 1, messages: [], activeRain: null, rainHistory: [] });
    store.nextMessageId = Math.max(Number(store.nextMessageId) || 1, 1);
    store.nextRainId = Math.max(Number(store.nextRainId) || 1, 1);
    store.messages = Array.isArray(store.messages) ? store.messages : [];
    store.rainHistory = Array.isArray(store.rainHistory) ? store.rainHistory : [];
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
    const message = {
        id: store.nextMessageId++,
        created_at: new Date().toISOString(),
        type: payload.type || 'user',
        user_id: payload.user_id || null,
        username: payload.username || 'KatsuCases',
        is_admin: Boolean(payload.is_admin),
        message: String(payload.message || '').trim(),
        meta: payload.meta || null
    };
    store.messages.push(message);
    store.messages = store.messages.slice(-180);
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
    const totalWeight = contents.reduce((sum, row) => sum + Number(row.odds || 0), 0);
    let random = Math.random() * totalWeight;
    let selected = contents[contents.length - 1] || null;
    for (const item of contents) {
        random -= Number(item.odds || 0);
        if (random <= 0) {
            selected = item;
            break;
        }
    }
    return selected;
}

function buildReplayTrack(contents, winner, slots = 36) {
    if (!contents.length) return [];
    const track = [];
    const filler = contents.slice(0);
    for (let i = 0; i < slots - 1; i += 1) {
        const item = filler[Math.floor(Math.random() * filler.length)];
        track.push({
            pokemon_name: item.pokemon_name,
            pokemon_form: item.pokemon_form || null,
            rarity: item.rarity,
            sprite_url: item.sprite_url,
            is_shiny: item.is_shiny
        });
    }
    track.push({
        pokemon_name: winner.pokemon_name,
        pokemon_form: winner.pokemon_form || null,
        rarity: winner.rarity,
        sprite_url: winner.sprite_url,
        is_shiny: winner.is_shiny
    });
    return track;
}

function saveReplay(payload) {
    const store = readReplayStore();
    const replay = { id: store.nextId++, created_at: new Date().toISOString(), ...payload };
    store.replays.unshift(replay);
    store.replays = store.replays.slice(0, 500);
    writeReplayStore(store);
    return replay;
}

function getReplayByOpeningId(openingId) {
    const store = readReplayStore();
    return store.replays.find((row) => Number(row.opening_id) === Number(openingId)) || null;
}

function getOpenings() {
    return getTable('openings');
}

function getUsers() {
    return getTable('users');
}

function getUserById(userId) {
    return getUsers().find((row) => Number(row.id) === Number(userId)) || null;
}

function findUserByUsername(username) {
    return getUsers().find((row) => String(row.username).toLowerCase() === String(username).toLowerCase()) || null;
}

function openCaseForUser({ userId, username, caseInfo, contents, seed, source = 'case_open', roomId = null }) {
    const selectedItem = pickCaseResult(contents);
    const inventoryResult = db.prepare(`
        INSERT INTO inventory (user_id, pokemon_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        selectedItem.pokemon_id,
        selectedItem.pokemon_name,
        selectedItem.pokemon_form,
        selectedItem.rarity,
        selectedItem.sprite_url,
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
        selectedItem.sprite_url,
        selectedItem.is_shiny,
        caseInfo.price
    );

    const replay = saveReplay({
        type: source,
        room_id: roomId,
        opening_id: openingResult.lastInsertRowid,
        user_id: userId,
        username,
        case_id: caseInfo.id,
        case_name: caseInfo.name,
        seed,
        track: buildReplayTrack(contents, selectedItem),
        result: {
            inventoryId: inventoryResult.lastInsertRowid,
            ...selectedItem
        }
    });

    return {
        inventoryId: inventoryResult.lastInsertRowid,
        openingId: openingResult.lastInsertRowid,
        replayId: replay.id,
        seed,
        ...selectedItem
    };
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

        const cases = db.prepare(query).all(...params);
        
        // Add contents count to each case
        const casesWithCounts = cases.map(c => {
            const contents = db.prepare('SELECT COUNT(*) as count FROM case_contents WHERE case_id = ?').get(c.id);
            const rarities = db.prepare(`
                SELECT rarity, COUNT(*) as count, MIN(odds) as min_odds, MAX(odds) as max_odds 
                FROM case_contents 
                WHERE case_id = ? 
                GROUP BY rarity
            `).all(c.id);
            
            return {
                ...c,
                total_items: contents.count,
                rarity_breakdown: rarities
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
        
        const caseInfo = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
        if (!caseInfo) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const contents = db.prepare('SELECT * FROM case_contents WHERE case_id = ? ORDER BY odds ASC').all(id);
        
        // Group by rarity
        const byRarity = {};
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'];
        
        for (const rarity of rarities) {
            byRarity[rarity] = contents.filter(c => c.rarity === rarity);
        }

        res.json({
            case: caseInfo,
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
        if (!caseInfo) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const totalCost = Number(caseInfo.price) * amount;
        if (Number(req.user.balance) < totalCost) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        const contents = db.prepare('SELECT * FROM case_contents WHERE case_id = ?').all(id);
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

        db.prepare('UPDATE users SET balance = balance - ?, cases_opened = cases_opened + ? WHERE id = ?').run(totalCost, amount, userId);
        db.prepare('INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)').run(
            userId,
            'purchase',
            -totalCost,
            `Opened ${amount}x ${caseInfo.name}`
        );

        const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId);

        res.json({
            success: true,
            results,
            newBalance: updatedUser.balance,
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

        const items = db.prepare(query).all(...params);
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

        const items = db.prepare(query).all(...params);
        res.json({ items });
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
        `).all(limit);
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
        const opening = getOpenings().find((row) => Number(row.id) == openingId);
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
                track: [{
                    pokemon_name: opening.pokemon_name,
                    pokemon_form: opening.pokemon_form || null,
                    rarity: opening.rarity,
                    sprite_url: opening.sprite_url,
                    is_shiny: opening.is_shiny
                }],
                result: {
                    inventoryId: opening.item_id,
                    pokemon_id: null,
                    pokemon_name: opening.pokemon_name,
                    pokemon_form: opening.pokemon_form,
                    rarity: opening.rarity,
                    sprite_url: opening.sprite_url,
                    is_shiny: opening.is_shiny
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
            const items = db.prepare('SELECT * FROM trade_items WHERE trade_id = ?').all(trade.id);
            return { ...trade, items };
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
        const { receiverId, receiverUsername, items } = req.body;
        const senderId = req.user.id;

        const selectedItemIds = Array.isArray(items) ? items.map((value) => Number(value)).filter(Boolean) : [];
        if ((!receiverId && !receiverUsername) || selectedItemIds.length === 0) {
            return res.status(400).json({ error: 'A target user and at least one item are required' });
        }

        const receiver = receiverId
            ? db.prepare('SELECT id, username FROM users WHERE id = ?').get(receiverId)
            : (() => {
                const user = findUserByUsername(receiverUsername);
                return user ? { id: user.id, username: user.username } : null;
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

        notifyUser(receiver.id, 'trade_request', 'New trade request', `${req.user.username} sent you a trade request with ${validItems.length} item(s).`, '/trading', { tradeId: result.lastInsertRowid, senderId });
        notifyUser(senderId, 'trade_sent', 'Trade request sent', `Your trade request to ${receiver.username} is pending.`, '/trading', { tradeId: result.lastInsertRowid, receiverId: receiver.id });

        res.json({ success: true, tradeId: result.lastInsertRowid });
    } catch (error) {
        console.error('Create trade error:', error);
        res.status(500).json({ error: 'Failed to create trade' });
    }
});

// Update trade status
router.put('/trades/:id', isAuthenticated, (req, res) => {
    try {
        const tradeId = Number(req.params.id);
        const { status, receiverItemIds = [] } = req.body;
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
        const currentReceiverItems = existingTradeItems.filter((item) => Number(item.from_user) === Number(trade.receiver_id));

        if (status === 'accepted') {
            const requestedReceiverIds = Array.isArray(receiverItemIds) ? receiverItemIds.map((value) => Number(value)).filter(Boolean) : [];
            const addItem = db.prepare(`
                INSERT INTO trade_items (trade_id, item_id, pokemon_name, rarity, sprite_url, is_shiny, from_user)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            for (const itemId of requestedReceiverIds) {
                const exists = currentReceiverItems.find((row) => Number(row.item_id) === Number(itemId));
                if (exists) continue;
                const item = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(itemId, userId);
                if (!item || Number(item.is_listed)) {
                    return res.status(400).json({ error: 'One of your selected return items is unavailable' });
                }
                addItem.run(tradeId, item.id, item.pokemon_name, item.rarity, item.sprite_url, item.is_shiny, userId);
                currentReceiverItems.push({ ...item, trade_id: tradeId, item_id: item.id, from_user: userId });
            }

            for (const item of senderItems) {
                const stillOwned = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(item.item_id, trade.sender_id);
                if (!stillOwned || Number(stillOwned.is_listed)) {
                    return res.status(400).json({ error: 'The sender no longer owns one of the offered items' });
                }
            }

            for (const item of currentReceiverItems) {
                const stillOwned = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(item.item_id, trade.receiver_id);
                if (!stillOwned || Number(stillOwned.is_listed)) {
                    return res.status(400).json({ error: 'One of your selected return items is unavailable' });
                }
            }

            for (const item of senderItems) {
                db.prepare('UPDATE inventory SET user_id = ?, is_listed = 0, listed_price = NULL WHERE id = ?').run(trade.receiver_id, item.item_id);
            }
            for (const item of currentReceiverItems) {
                db.prepare('UPDATE inventory SET user_id = ?, is_listed = 0, listed_price = NULL WHERE id = ?').run(trade.sender_id, item.item_id);
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
        const query = String(req.query.query || '').trim().toLowerCase();
        const users = getUsers()
            .filter((user) => Number(user.id) !== Number(req.user.id))
            .filter((user) => !query || String(user.username).toLowerCase().includes(query))
            .slice(0, 8)
            .map((user) => ({ id: user.id, username: user.username }));
        res.json({ users });
    } catch (error) {
        console.error('User search error:', error);
        res.status(500).json({ error: 'Failed to search users' });
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
        room.summary = {
            wins: { [playerA.user_id]: winsA, [playerB.user_id]: winsB },
            best_pull: bestPull
        };

        notifyUser(playerA.user_id, 'casevs_joined', 'Case Vs started', `${joiner.username} joined your room for ${room.case_name}.`, '/casevs', { roomId: room.id });
        notifyUser(playerA.user_id, 'casevs_finished', 'Case Vs finished', `${room.winner_username} won room #${room.id}.`, '/casevs', { roomId: room.id });
        notifyUser(playerB.user_id, 'casevs_finished', 'Case Vs finished', `${room.winner_username} won room #${room.id}.`, '/casevs', { roomId: room.id });

        writeCaseVsStore(store);
        res.json({ success: true, room });
    } catch (error) {
        console.error('Case Vs join error:', error);
        res.status(500).json({ error: 'Failed to join room' });
    }
});


router.get('/community/chat', optionalAuth, (req, res) => {
    try {
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 10), 100);
        const { store, finalized } = finalizeExpiredRain(false);
        const messages = store.messages.slice(-limit).map((message) => ({ ...message }));
        res.json({
            messages,
            activeRain: getRainPublic(store.activeRain, req.user ? req.user.id : null),
            rainHistory: store.rainHistory.slice(0, 8),
            ownerUserId: getOwnerUserId(),
            viewerIsAdmin: Boolean(req.user && isAdminUserId(req.user.id)),
            finalizedRain: finalized ? { id: finalized.id, title: finalized.title, entrant_count: finalized.entrant_count, distributed_amount: finalized.distributed_amount } : null
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
        if (Date.now() - lastMessageAt < 2500) {
            return res.status(429).json({ error: 'Slow down a little before sending another message' });
        }

        const { store } = finalizeExpiredRain(false);
        const message = addCommunityMessage(store, {
            type: 'user',
            user_id: req.user.id,
            username: req.user.username,
            is_admin: isAdminUserId(req.user.id),
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
        rain.entrants.push({ user_id: req.user.id, username: req.user.username, entered_at: new Date().toISOString() });
        addCommunityMessage(store, {
            type: 'system',
            username: 'KatsuCases',
            message: `${req.user.username} entered ${rain.title}.`
        });
        writeCommunityStore(store);
        res.json({ success: true, activeRain: getRainPublic(rain, req.user.id) });
    } catch (error) {
        console.error('Rain entry error:', error);
        res.status(500).json({ error: 'Failed to join rain' });
    }
});

router.get('/admin/summary', isAuthenticated, requireAdmin, (req, res) => {
    try {
        const { store } = finalizeExpiredRain(false);
        const roomStore = readCaseVsStore();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const stats = {
            totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            totalCasesOpened: db.prepare('SELECT SUM(cases_opened) as total FROM users').get().total || 0,
            activeListings: db.prepare('SELECT COUNT(*) as count FROM marketplace WHERE status = ?').get('active').count,
            recentPulls: db.prepare('SELECT COUNT(*) as count FROM openings WHERE opened_at > ?').get(oneDayAgo).count,
            activeRooms: roomStore.rooms.filter((room) => ['waiting', 'rolling'].includes(room.status)).length,
            unreadNotifications: notifications.unreadCount(req.user.id)
        };
        res.json({
            stats,
            activeRain: getRainPublic(store.activeRain, req.user.id),
            rainHistory: store.rainHistory.slice(0, 10),
            recentMessages: store.messages.slice(-12),
            ownerUserId: getOwnerUserId()
        });
    } catch (error) {
        console.error('Admin summary error:', error);
        res.status(500).json({ error: 'Failed to fetch admin summary' });
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
        if (!text) {
            return res.status(400).json({ error: 'Announcement text is required' });
        }
        if (text.length > 240) {
            return res.status(400).json({ error: 'Announcement must be 240 characters or less' });
        }
        const { store } = finalizeExpiredRain(false);
        const message = addCommunityMessage(store, {
            type: 'announcement',
            user_id: req.user.id,
            username: req.user.username,
            is_admin: true,
            message: text
        });
        writeCommunityStore(store);
        res.json({ success: true, message });
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
