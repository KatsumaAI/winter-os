const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dataPath = path.join(dataDir, 'katsucases.json');

const DEFAULT_TABLES = {
    users: [],
    inventory: [],
    cases: [],
    case_contents: [],
    openings: [],
    marketplace: [],
    trades: [],
    trade_items: [],
    transactions: [],
    notifications: []
};

const ID_TABLES = ['users', 'inventory', 'cases', 'case_contents', 'openings', 'marketplace', 'trades', 'trade_items', 'transactions', 'notifications'];
const RARITY_SORT_ORDER = {
    mythical: 1,
    legendary: 2,
    epic: 3,
    rare: 4,
    uncommon: 5,
    common: 6
};

function nowIso() {
    return new Date().toISOString();
}

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function createEmptyState() {
    return {
        meta: {
            version: 1,
            nextIds: Object.fromEntries(ID_TABLES.map((table) => [table, 1]))
        },
        tables: clone(DEFAULT_TABLES)
    };
}

let state = createEmptyState();

function loadState() {
    ensureDataDir();

    if (!fs.existsSync(dataPath)) {
        state = createEmptyState();
        return;
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        state = {
            meta: {
                version: 1,
                nextIds: {
                    ...Object.fromEntries(ID_TABLES.map((table) => [table, 1])),
                    ...(parsed.meta && parsed.meta.nextIds ? parsed.meta.nextIds : {})
                }
            },
            tables: {
                ...clone(DEFAULT_TABLES),
                ...(parsed.tables || {})
            }
        };
    } catch (error) {
        console.warn('Failed to read existing JSON data store. Starting fresh.', error.message);
        state = createEmptyState();
    }

    for (const table of ID_TABLES) {
        const rows = state.tables[table] || [];
        const maxId = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
        state.meta.nextIds[table] = Math.max(maxId + 1, state.meta.nextIds[table] || 1);
    }

    let mutated = false;
    for (const user of table('users')) {
        if (user.display_name === undefined) { user.display_name = user.username || ''; mutated = true; }
        if (user.avatar_url === undefined) { user.avatar_url = null; mutated = true; }
        if (user.pronouns === undefined) { user.pronouns = ''; mutated = true; }
        if (user.region === undefined) { user.region = ''; mutated = true; }
        if (!Array.isArray(user.badges)) { user.badges = []; mutated = true; }
        if (user.custom_role === undefined) { user.custom_role = ''; mutated = true; }
        if (user.free_rolls === undefined) { user.free_rolls = 0; mutated = true; }
        if (user.hide_inventory === undefined) { user.hide_inventory = 0; mutated = true; }
        if (!Array.isArray(user.username_history)) { user.username_history = []; mutated = true; }
    }
    for (const caseRow of table('cases')) {
        if (caseRow.launch_at === undefined) { caseRow.launch_at = null; mutated = true; }
        if (caseRow.is_hidden === undefined) { caseRow.is_hidden = 0; mutated = true; }
    }
    if (mutated) saveState();
}

function saveState() {
    ensureDataDir();
    fs.writeFileSync(dataPath, JSON.stringify(state, null, 2));
}

function table(name) {
    if (!state.tables[name]) {
        state.tables[name] = [];
    }
    return state.tables[name];
}

function insertRow(tableName, row) {
    const record = { ...row };
    if (ID_TABLES.includes(tableName)) {
        record.id = state.meta.nextIds[tableName]++;
    }
    table(tableName).push(record);
    saveState();
    return record;
}

function updateRows(tableName, predicate, updater) {
    let changes = 0;
    for (const row of table(tableName)) {
        if (predicate(row)) {
            updater(row);
            changes += 1;
        }
    }
    if (changes > 0) {
        saveState();
    }
    return { changes };
}

function deleteRows(tableName, predicate) {
    const rows = table(tableName);
    const before = rows.length;
    state.tables[tableName] = rows.filter((row) => !predicate(row));
    const changes = before - state.tables[tableName].length;
    if (changes > 0) {
        saveState();
    }
    return { changes };
}

function normalizeSql(sql) {
    return sql.replace(/\s+/g, ' ').trim();
}

function mapUserPublic(user) {
    if (!user) return undefined;
    return {
        id: user.id,
        username: user.username,
        display_name: user.display_name || user.username,
        email: user.email,
        balance: user.balance,
        total_spent: user.total_spent,
        total_earned: user.total_earned,
        cases_opened: user.cases_opened,
        avatar_url: user.avatar_url || null,
        pronouns: user.pronouns || '',
        region: user.region || '',
        badges: Array.isArray(user.badges) ? user.badges : [],
        custom_role: user.custom_role || '',
        free_rolls: Number(user.free_rolls || 0)
    };
}

function mapUserPublicWithCreatedAt(user) {
    if (!user) return undefined;
    return {
        ...mapUserPublic(user),
        created_at: user.created_at
    };
}

function getCaseRarityBreakdown(caseId) {
    const rows = table('case_contents').filter((row) => Number(row.case_id) === Number(caseId));
    const grouped = new Map();

    for (const row of rows) {
        if (!grouped.has(row.rarity)) {
            grouped.set(row.rarity, {
                rarity: row.rarity,
                count: 0,
                min_odds: row.odds,
                max_odds: row.odds
            });
        }
        const entry = grouped.get(row.rarity);
        entry.count += 1;
        entry.min_odds = Math.min(entry.min_odds, row.odds);
        entry.max_odds = Math.max(entry.max_odds, row.odds);
    }

    return Array.from(grouped.values()).sort((a, b) => (RARITY_SORT_ORDER[a.rarity] || 999) - (RARITY_SORT_ORDER[b.rarity] || 999));
}

function queryCasesList(normalized, params) {
    let rows = [...table('cases')];
    let paramIndex = 0;

    if (normalized.includes('WHERE')) {
        if (normalized.includes('category = ?')) {
            const category = params[paramIndex++];
            rows = rows.filter((row) => row.category === category);
        }
        if (normalized.includes('is_featured = ?')) {
            const featured = Number(params[paramIndex++]);
            rows = rows.filter((row) => Number(row.is_featured) === featured);
        }
    }

    rows.sort((a, b) => {
        if (Number(b.is_featured) !== Number(a.is_featured)) {
            return Number(b.is_featured) - Number(a.is_featured);
        }
        return Number(b.times_opened) - Number(a.times_opened);
    });

    return clone(rows);
}

function queryMarketplaceList(normalized, params) {
    let paramIndex = 0;
    let rows = [...table('marketplace')].filter((row) => row.status === params[paramIndex++]);

    if (normalized.includes('AND rarity = ?')) {
        const rarity = params[paramIndex++];
        rows = rows.filter((row) => row.rarity === rarity);
    }

    if (normalized.includes('AND pokemon_name LIKE ?')) {
        const searchValue = String(params[paramIndex++] || '').replace(/^%|%$/g, '').toLowerCase();
        rows = rows.filter((row) => String(row.pokemon_name || '').toLowerCase().includes(searchValue));
    }

    if (normalized.endsWith('ORDER BY price ASC')) {
        rows.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (normalized.endsWith('ORDER BY price DESC')) {
        rows.sort((a, b) => Number(b.price) - Number(a.price));
    } else {
        rows.sort((a, b) => String(b.listed_at).localeCompare(String(a.listed_at)));
    }

    return clone(rows);
}

function queryInventoryList(normalized, params) {
    let paramIndex = 0;
    const userId = Number(params[paramIndex++]);
    let rows = [...table('inventory')].filter((row) => Number(row.user_id) === userId);

    if (normalized.includes('AND rarity = ?')) {
        const rarity = params[paramIndex++];
        rows = rows.filter((row) => row.rarity === rarity);
    }

    if (normalized.includes('AND is_listed = ?')) {
        const listed = Number(params[paramIndex++]);
        rows = rows.filter((row) => Number(row.is_listed) === listed);
    }

    if (normalized.includes('ORDER BY is_listed DESC, listed_price DESC')) {
        rows.sort((a, b) => {
            if (Number(b.is_listed) !== Number(a.is_listed)) {
                return Number(b.is_listed) - Number(a.is_listed);
            }
            return Number(b.listed_price || 0) - Number(a.listed_price || 0);
        });
    } else if (normalized.includes("ORDER BY CASE rarity")) {
        rows.sort((a, b) => (RARITY_SORT_ORDER[a.rarity] || 999) - (RARITY_SORT_ORDER[b.rarity] || 999));
    } else {
        rows.sort((a, b) => String(b.acquired_at).localeCompare(String(a.acquired_at)));
    }

    return clone(rows);
}

function queryTradesList(normalized, params) {
    let paramIndex = 0;
    const senderId = Number(params[paramIndex++]);
    const receiverId = Number(params[paramIndex++]);
    let rows = [...table('trades')].filter((row) => Number(row.sender_id) === senderId || Number(row.receiver_id) === receiverId);

    if (normalized.includes('AND status = ?')) {
        const status = params[paramIndex++];
        rows = rows.filter((row) => row.status === status);
    }

    rows = rows
        .map((row) => ({
            ...row,
            item_count: table('trade_items').filter((item) => Number(item.trade_id) === Number(row.id)).length
        }))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

    return clone(rows);
}

function selectOne(normalized, params) {
    switch (normalized) {
        case 'SELECT COUNT(*) as count FROM cases':
            return { count: table('cases').length };
        case 'SELECT * FROM cases WHERE id = ?':
            return clone(table('cases').find((row) => Number(row.id) === Number(params[0])));
        case 'SELECT name, price FROM cases WHERE id = ?': {
            const row = table('cases').find((item) => Number(item.id) === Number(params[0]));
            return row ? { name: row.name, price: row.price } : undefined;
        }
        case 'SELECT COUNT(*) as count FROM case_contents WHERE case_id = ?':
            return { count: table('case_contents').filter((row) => Number(row.case_id) === Number(params[0])).length };
        case 'SELECT balance FROM users WHERE id = ?': {
            const user = table('users').find((row) => Number(row.id) === Number(params[0]));
            return user ? { balance: user.balance } : undefined;
        }
        case 'SELECT id FROM users WHERE email = ? OR username = ?': {
            const [email, username] = params;
            const user = table('users').find((row) => row.email === email || row.username === username);
            return user ? { id: user.id } : undefined;
        }
        case 'SELECT * FROM users WHERE email = ?':
            return clone(table('users').find((row) => row.email === params[0]));
        case 'SELECT id, username FROM users WHERE id = ?': {
            const user = table('users').find((row) => Number(row.id) === Number(params[0]));
            return user ? { id: user.id, username: user.username } : undefined;
        }
        case 'SELECT id, username, email, balance, total_spent, total_earned, cases_opened FROM users WHERE id = ?':
            return mapUserPublic(table('users').find((row) => Number(row.id) === Number(params[0])));
        case 'SELECT id, username, email, balance, total_spent, total_earned, cases_opened, created_at FROM users WHERE id = ?':
            return mapUserPublicWithCreatedAt(table('users').find((row) => Number(row.id) === Number(params[0])));
        case 'SELECT * FROM inventory WHERE id = ? AND user_id = ?':
            return clone(table('inventory').find((row) => Number(row.id) === Number(params[0]) && Number(row.user_id) === Number(params[1])));
        case 'SELECT * FROM marketplace WHERE id = ? AND status = ?':
            return clone(table('marketplace').find((row) => Number(row.id) === Number(params[0]) && row.status === params[1]));
        case 'SELECT * FROM marketplace WHERE id = ?':
            return clone(table('marketplace').find((row) => Number(row.id) === Number(params[0])));
        case 'SELECT * FROM trades WHERE id = ?':
            return clone(table('trades').find((row) => Number(row.id) === Number(params[0])));
        case 'SELECT COUNT(*) as count FROM users':
            return { count: table('users').length };
        case 'SELECT SUM(cases_opened) as total FROM users':
            return { total: table('users').reduce((sum, row) => sum + Number(row.cases_opened || 0), 0) };
        case 'SELECT SUM(price) as total FROM marketplace WHERE status = ?':
            return { total: table('marketplace').filter((row) => row.status === params[0]).reduce((sum, row) => sum + Number(row.price || 0), 0) };
        case 'SELECT COUNT(*) as count FROM marketplace WHERE status = ?':
            return { count: table('marketplace').filter((row) => row.status === params[0]).length };
        case 'SELECT COUNT(*) as count FROM openings WHERE opened_at > ?':
            return { count: table('openings').filter((row) => String(row.opened_at) > String(params[0])).length };
        default:
            if (normalized.startsWith('SELECT * FROM cases') && normalized.includes('ORDER BY is_featured DESC, times_opened DESC')) {
                const rows = queryCasesList(normalized, params);
                return rows[0];
            }
            if (normalized.startsWith('SELECT * FROM marketplace WHERE status = ?')) {
                const rows = queryMarketplaceList(normalized, params);
                return rows[0];
            }
            if (normalized.startsWith('SELECT * FROM inventory WHERE user_id = ?')) {
                const rows = queryInventoryList(normalized, params);
                return rows[0];
            }
            if (normalized.startsWith('SELECT t.*, (SELECT COUNT(*) FROM trade_items WHERE trade_id = t.id) as item_count FROM trades t')) {
                const rows = queryTradesList(normalized, params);
                return rows[0];
            }
            throw new Error(`Unsupported SELECT get query: ${normalized}`);
    }
}

function selectAll(normalized, params) {
    switch (normalized) {
        case 'SELECT * FROM case_contents WHERE case_id = ?':
            return clone(table('case_contents').filter((row) => Number(row.case_id) === Number(params[0])));
        case 'SELECT * FROM case_contents WHERE case_id = ? ORDER BY odds ASC':
            return clone(table('case_contents').filter((row) => Number(row.case_id) === Number(params[0])).sort((a, b) => Number(a.odds) - Number(b.odds)));
        case 'SELECT rarity, COUNT(*) as count, MIN(odds) as min_odds, MAX(odds) as max_odds FROM case_contents WHERE case_id = ? GROUP BY rarity':
            return clone(getCaseRarityBreakdown(params[0]));
        case 'SELECT * FROM openings WHERE is_public = 1 ORDER BY opened_at DESC LIMIT ?':
            return clone(table('openings').filter((row) => Number(row.is_public) === 1).sort((a, b) => String(b.opened_at).localeCompare(String(a.opened_at))).slice(0, Number(params[0])));
        case 'SELECT * FROM trade_items WHERE trade_id = ?':
            return clone(table('trade_items').filter((row) => Number(row.trade_id) === Number(params[0])));
        case 'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50':
            return clone(table('transactions').filter((row) => Number(row.user_id) === Number(params[0])).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 50));
        default:
            if (normalized.startsWith('SELECT * FROM cases') && normalized.includes('ORDER BY is_featured DESC, times_opened DESC')) {
                return queryCasesList(normalized, params);
            }
            if (normalized.startsWith('SELECT * FROM marketplace WHERE status = ?')) {
                return queryMarketplaceList(normalized, params);
            }
            if (normalized.startsWith('SELECT * FROM inventory WHERE user_id = ?')) {
                return queryInventoryList(normalized, params);
            }
            if (normalized.startsWith('SELECT t.*, (SELECT COUNT(*) FROM trade_items WHERE trade_id = t.id) as item_count FROM trades t')) {
                return queryTradesList(normalized, params);
            }
            throw new Error(`Unsupported SELECT all query: ${normalized}`);
    }
}

function runStatement(normalized, params) {
    switch (normalized) {
        case 'INSERT INTO users (username, email, password_hash, balance) VALUES (?, ?, ?, ?)': {
            const row = insertRow('users', {
                username: params[0],
                display_name: params[0],
                email: params[1],
                password_hash: params[2],
                balance: Number(params[3]),
                total_spent: 0,
                total_earned: 0,
                cases_opened: 0,
                avatar_url: null,
                pronouns: '',
                region: '',
                badges: [],
                custom_role: '',
                free_rolls: 0,
                hide_inventory: 0,
                username_history: [],
                created_at: nowIso()
            });
            return { lastInsertRowid: row.id, changes: 1 };
        }
        case 'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)': {
            const row = insertRow('transactions', {
                user_id: Number(params[0]),
                type: params[1],
                amount: Number(params[2]),
                description: params[3],
                created_at: nowIso()
            });
            return { lastInsertRowid: row.id, changes: 1 };
        }
        case 'INSERT INTO inventory (user_id, pokemon_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny) VALUES (?, ?, ?, ?, ?, ?, ?)': {
            const row = insertRow('inventory', {
                user_id: Number(params[0]),
                pokemon_id: Number(params[1]),
                pokemon_name: params[2],
                pokemon_form: params[3] ?? null,
                rarity: params[4],
                sprite_url: params[5] ?? null,
                is_shiny: Number(params[6] || 0),
                is_listed: 0,
                listed_price: null,
                acquired_at: nowIso()
            });
            return { lastInsertRowid: row.id, changes: 1 };
        }
        case 'INSERT INTO openings (user_id, username, case_id, case_name, item_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny, amount_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)': {
            const row = insertRow('openings', {
                user_id: Number(params[0]),
                username: params[1],
                case_id: Number(params[2]),
                case_name: params[3],
                item_id: Number(params[4]),
                pokemon_name: params[5],
                pokemon_form: params[6] ?? null,
                rarity: params[7],
                sprite_url: params[8] ?? null,
                is_shiny: Number(params[9] || 0),
                amount_paid: Number(params[10]),
                is_public: 1,
                opened_at: nowIso()
            });
            return { lastInsertRowid: row.id, changes: 1 };
        }
        case 'INSERT INTO marketplace (seller_id, seller_username, item_id, pokemon_name, pokemon_form, rarity, sprite_url, is_shiny, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)': {
            const row = insertRow('marketplace', {
                seller_id: Number(params[0]),
                seller_username: params[1],
                item_id: Number(params[2]),
                pokemon_name: params[3],
                pokemon_form: params[4] ?? null,
                rarity: params[5],
                sprite_url: params[6] ?? null,
                is_shiny: Number(params[7] || 0),
                price: Number(params[8]),
                status: 'active',
                listed_at: nowIso()
            });
            return { lastInsertRowid: row.id, changes: 1 };
        }
        case 'UPDATE inventory SET is_listed = 1, listed_price = ? WHERE id = ?':
            return updateRows('inventory', (row) => Number(row.id) === Number(params[1]), (row) => {
                row.is_listed = 1;
                row.listed_price = Number(params[0]);
            });
        case 'UPDATE inventory SET is_listed = 0, listed_price = NULL WHERE id = ?':
            return updateRows('inventory', (row) => Number(row.id) === Number(params[0]), (row) => {
                row.is_listed = 0;
                row.listed_price = null;
            });
        case 'UPDATE users SET balance = balance - ? WHERE id = ?':
            return updateRows('users', (row) => Number(row.id) === Number(params[1]), (row) => {
                row.balance = Number(row.balance) - Number(params[0]);
                row.total_spent = Number(row.total_spent || 0) + Number(params[0]);
            });
        case 'UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?':
            return updateRows('users', (row) => Number(row.id) === Number(params[2]), (row) => {
                row.balance = Number(row.balance) + Number(params[0]);
                row.total_earned = Number(row.total_earned || 0) + Number(params[1]);
            });
        case 'UPDATE marketplace SET status = ? WHERE id = ?':
            return updateRows('marketplace', (row) => Number(row.id) === Number(params[1]), (row) => {
                row.status = params[0];
            });
        case 'UPDATE inventory SET user_id = ?, is_listed = 0, listed_price = NULL WHERE id = ?':
            return updateRows('inventory', (row) => Number(row.id) === Number(params[1]), (row) => {
                row.user_id = Number(params[0]);
                row.is_listed = 0;
                row.listed_price = null;
            });
        case 'UPDATE inventory SET user_id = ? WHERE id = ?':
            return updateRows('inventory', (row) => Number(row.id) === Number(params[1]), (row) => {
                row.user_id = Number(params[0]);
            });
        case 'UPDATE cases SET times_opened = times_opened + 1 WHERE id = ?':
            return updateRows('cases', (row) => Number(row.id) === Number(params[0]), (row) => {
                row.times_opened = Number(row.times_opened || 0) + 1;
            });
        case 'UPDATE users SET balance = balance - ?, cases_opened = cases_opened + ? WHERE id = ?':
            return updateRows('users', (row) => Number(row.id) === Number(params[2]), (row) => {
                row.balance = Number(row.balance) - Number(params[0]);
                row.cases_opened = Number(row.cases_opened || 0) + Number(params[1]);
                row.total_spent = Number(row.total_spent || 0) + Number(params[0]);
            });
        case 'INSERT INTO trades (sender_id, sender_username, receiver_id, receiver_username) VALUES (?, ?, ?, ?)': {
            const row = insertRow('trades', {
                sender_id: Number(params[0]),
                sender_username: params[1],
                receiver_id: Number(params[2]),
                receiver_username: params[3],
                status: 'pending',
                created_at: nowIso(),
                updated_at: nowIso()
            });
            return { lastInsertRowid: row.id, changes: 1 };
        }
        case 'INSERT INTO trade_items (trade_id, item_id, pokemon_name, rarity, sprite_url, is_shiny, from_user) VALUES (?, ?, ?, ?, ?, ?, ?)': {
            const row = insertRow('trade_items', {
                trade_id: Number(params[0]),
                item_id: Number(params[1]),
                pokemon_name: params[2],
                rarity: params[3],
                sprite_url: params[4] ?? null,
                is_shiny: Number(params[5] || 0),
                from_user: Number(params[6])
            });
            return { lastInsertRowid: row.id, changes: 1 };
        }
        case 'UPDATE trades SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?':
            return updateRows('trades', (row) => Number(row.id) === Number(params[1]), (row) => {
                row.status = params[0];
                row.updated_at = nowIso();
            });
        case 'DELETE FROM marketplace WHERE id = ?':
            return deleteRows('marketplace', (row) => Number(row.id) === Number(params[0]));
        default:
            throw new Error(`Unsupported run query: ${normalized}`);
    }
}

const db = {
    pragma() {
        return undefined;
    },
    exec() {
        return undefined;
    },
    reload() {
        loadState();
        return true;
    },
    prepare(sql) {
        const normalized = normalizeSql(sql);
        return {
            get(...params) {
                return selectOne(normalized, params);
            },
            all(...params) {
                return selectAll(normalized, params);
            },
            run(...params) {
                return runStatement(normalized, params);
            }
        };
    }
};



const notifications = {
    create(userId, payload = {}) {
        const row = insertRow('notifications', {
            user_id: Number(userId),
            type: payload.type || 'activity',
            title: payload.title || 'Notification',
            message: payload.message || '',
            link: payload.link || null,
            meta: clone(payload.meta || {}),
            is_read: 0,
            created_at: nowIso(),
            read_at: null
        });
        return clone(row);
    },
    listForUser(userId, limit = 20) {
        return clone(
            table('notifications')
                .filter((row) => Number(row.user_id) === Number(userId))
                .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
                .slice(0, Number(limit))
        );
    },
    unreadCount(userId) {
        return table('notifications').filter((row) => Number(row.user_id) === Number(userId) && !Number(row.is_read)).length;
    },
    markRead(userId, notificationId) {
        return updateRows('notifications', (row) => Number(row.user_id) === Number(userId) && Number(row.id) === Number(notificationId), (row) => {
            row.is_read = 1;
            row.read_at = row.read_at || nowIso();
        });
    },
    markAllRead(userId) {
        return updateRows('notifications', (row) => Number(row.user_id) === Number(userId) && !Number(row.is_read), (row) => {
            row.is_read = 1;
            row.read_at = row.read_at || nowIso();
        });
    }
};

function seedInitialData() {
    if (table('cases').length > 0) {
        return;
    }

    const cases = [
        { name: 'Kanto Starter Case', description: 'Classic Pokémon from the Kanto region', price: 2.99, image_color: '#3b82f6', is_featured: 1, category: 'featured', min_odds: 10, max_odds: 100 },
        { name: 'Johto Legends Case', description: 'Rare finds from the Johto region', price: 4.99, image_color: '#8b5cf6', is_featured: 1, category: 'featured', min_odds: 100, max_odds: 10000 },
        { name: 'Hoenn Adventures Case', description: 'Exotic Pokémon from Hoenn', price: 3.99, image_color: '#10b981', is_featured: 1, category: 'daily', min_odds: 50, max_odds: 5000 },
        { name: 'Sinnoh Elite Case', description: 'Premium Sinnoh discoveries', price: 7.99, image_color: '#f59e0b', is_featured: 1, category: 'featured', min_odds: 500, max_odds: 50000 },
        { name: 'Unova Collection Case', description: 'Unique Unova Pokémon', price: 5.99, image_color: '#ec4899', is_featured: 0, category: 'standard', min_odds: 100, max_odds: 10000 },
        { name: 'Galar Champions Case', description: 'High-tier Galar Pokémon', price: 9.99, image_color: '#06b6d4', is_featured: 1, category: 'featured', min_odds: 1000, max_odds: 100000 },
        { name: 'Alola Tropics Case', description: 'Rare Alola variants', price: 6.99, image_color: '#f97316', is_featured: 0, category: 'daily', min_odds: 200, max_odds: 20000 },
        { name: 'Mythical Mystery Case', description: 'Legendary and Mythical Pokémon', price: 14.99, image_color: '#ec4899', is_featured: 1, category: 'special', min_odds: 10000, max_odds: 1000000 },
        { name: 'Shiny Hunter Case', description: 'Increased shiny odds', price: 8.99, image_color: '#fbbf24', is_featured: 0, category: 'special', min_odds: 500, max_odds: 50000 },
        { name: 'Community Favorites Case', description: 'Fan-favorite Pokémon', price: 3.49, image_color: '#3b82f6', is_featured: 0, category: 'standard', min_odds: 20, max_odds: 2000 }
    ];

    const insertedCases = cases.map((item) => insertRow('cases', {
        ...item,
        times_opened: 0,
        created_at: nowIso()
    }));

    const pokemonPool = [
        { id: 1, name: 'Bulbasaur', rarity: 'common', odds: 8, sprite: 'bulbasaur' },
        { id: 4, name: 'Charmander', rarity: 'common', odds: 8, sprite: 'charmander' },
        { id: 7, name: 'Squirtle', rarity: 'common', odds: 8, sprite: 'squirtle' },
        { id: 10, name: 'Caterpie', rarity: 'common', odds: 10, sprite: 'caterpie' },
        { id: 13, name: 'Weedle', rarity: 'common', odds: 10, sprite: 'weedle' },
        { id: 16, name: 'Pidgey', rarity: 'common', odds: 9, sprite: 'pidgey' },
        { id: 19, name: 'Rattata', rarity: 'common', odds: 10, sprite: 'rattata' },
        { id: 23, name: 'Ekans', rarity: 'common', odds: 9, sprite: 'ekans' },
        { id: 27, name: 'Sandshrew', rarity: 'common', odds: 8, sprite: 'sandshrew' },
        { id: 37, name: 'Vulpix', rarity: 'common', odds: 7, sprite: 'vulpix' },
        { id: 25, name: 'Pikachu', rarity: 'uncommon', odds: 25, sprite: 'pikachu' },
        { id: 39, name: 'Jigglypuff', rarity: 'uncommon', odds: 30, sprite: 'jigglypuff' },
        { id: 54, name: 'Psyduck', rarity: 'uncommon', odds: 35, sprite: 'psyduck' },
        { id: 63, name: 'Abra', rarity: 'uncommon', odds: 28, sprite: 'abra' },
        { id: 74, name: 'Geodude', rarity: 'uncommon', odds: 32, sprite: 'geodude' },
        { id: 92, name: 'Gastly', rarity: 'uncommon', odds: 40, sprite: 'gastly' },
        { id: 129, name: 'Magikarp', rarity: 'uncommon', odds: 45, sprite: 'magikarp' },
        { id: 133, name: 'Eevee', rarity: 'uncommon', odds: 20, sprite: 'eevee' },
        { id: 147, name: 'Dratini', rarity: 'uncommon', odds: 48, sprite: 'dratini' },
        { id: 175, name: 'Togepi', rarity: 'uncommon', odds: 50, sprite: 'togepi' },
        { id: 6, name: 'Charizard', rarity: 'rare', odds: 200, sprite: 'charizard' },
        { id: 9, name: 'Blastoise', rarity: 'rare', odds: 180, sprite: 'blastoise' },
        { id: 94, name: 'Gengar', rarity: 'rare', odds: 150, sprite: 'gengar' },
        { id: 130, name: 'Gyarados', rarity: 'rare', odds: 160, sprite: 'gyarados' },
        { id: 131, name: 'Lapras', rarity: 'rare', odds: 175, sprite: 'lapras' },
        { id: 134, name: 'Vaporeon', rarity: 'rare', odds: 140, sprite: 'vaporeon' },
        { id: 135, name: 'Jolteon', rarity: 'rare', odds: 140, sprite: 'jolteon' },
        { id: 136, name: 'Flareon', rarity: 'rare', odds: 140, sprite: 'flareon' },
        { id: 143, name: 'Snorlax', rarity: 'rare', odds: 120, sprite: 'snorlax' },
        { id: 149, name: 'Dragonite', rarity: 'rare', odds: 400, sprite: 'dragonite' },
        { id: 150, name: 'Mewtwo', rarity: 'rare', odds: 500, sprite: 'mewtwo' },
        { id: 151, name: 'Mew', rarity: 'rare', odds: 450, sprite: 'mew' },
        { id: 150, name: 'Mewtwo', form: 'Armored', rarity: 'epic', odds: 2000, sprite: 'mewtwo-armored' },
        { id: 249, name: 'Lugia', rarity: 'epic', odds: 3000, sprite: 'lugia' },
        { id: 250, name: 'Ho-Oh', rarity: 'epic', odds: 3500, sprite: 'ho-oh' },
        { id: 282, name: 'Gardevoir', rarity: 'epic', odds: 2500, sprite: 'gardevoir' },
        { id: 359, name: 'Absol', rarity: 'epic', odds: 2800, sprite: 'absol' },
        { id: 384, name: 'Rayquaza', rarity: 'epic', odds: 5000, sprite: 'rayquaza' },
        { id: 445, name: 'Garchomp', rarity: 'epic', odds: 2200, sprite: 'garchomp' },
        { id: 448, name: 'Lucario', rarity: 'epic', odds: 2400, sprite: 'lucario' },
        { id: 483, name: 'Dialga', rarity: 'epic', odds: 8000, sprite: 'dialga' },
        { id: 484, name: 'Palkia', rarity: 'epic', odds: 8000, sprite: 'palkia' },
        { id: 244, name: 'Entei', rarity: 'legendary', odds: 15000, sprite: 'entei' },
        { id: 245, name: 'Suicune', rarity: 'legendary', odds: 15000, sprite: 'suicune' },
        { id: 248, name: 'Tyranitar', rarity: 'legendary', odds: 12000, sprite: 'tyranitar' },
        { id: 380, name: 'Latias', rarity: 'legendary', odds: 25000, sprite: 'latias' },
        { id: 381, name: 'Latios', rarity: 'legendary', odds: 25000, sprite: 'latios' },
        { id: 382, name: 'Kyogre', rarity: 'legendary', odds: 40000, sprite: 'kyogre' },
        { id: 383, name: 'Groudon', rarity: 'legendary', odds: 40000, sprite: 'groudon' },
        { id: 385, name: 'Jirachi', rarity: 'legendary', odds: 75000, sprite: 'jirachi' },
        { id: 386, name: 'Deoxys', rarity: 'legendary', odds: 60000, sprite: 'deoxys' },
        { id: 489, name: 'Phione', rarity: 'legendary', odds: 80000, sprite: 'phione' },
        { id: 151, name: 'Mew', form: 'Shiny', rarity: 'mythical', odds: 500000, sprite: 'mew-shiny' },
        { id: 150, name: 'Mewtwo', form: 'Shiny', rarity: 'mythical', odds: 750000, sprite: 'mewtwo-shiny' },
        { id: 249, name: 'Lugia', form: 'Shiny', rarity: 'mythical', odds: 800000, sprite: 'lugia-shiny' },
        { id: 384, name: 'Rayquaza', form: 'Shiny', rarity: 'mythical', odds: 1000000, sprite: 'rayquaza-shiny' },
        { id: 382, name: 'Kyogre', form: 'Primal', rarity: 'mythical', odds: 5000000, sprite: 'kyogre-primal' },
        { id: 383, name: 'Groudon', form: 'Primal', rarity: 'mythical', odds: 5000000, sprite: 'groudon-primal' },
        { id: 483, name: 'Dialga', form: 'Shiny', rarity: 'mythical', odds: 10000000, sprite: 'dialga-shiny' },
        { id: 484, name: 'Palkia', form: 'Shiny', rarity: 'mythical', odds: 10000000, sprite: 'palkia-shiny' }
    ];

    for (const caseInfo of insertedCases) {
        const selectedPokemon = [];
        const targetCounts = {
            common: 15,
            uncommon: 10,
            rare: 6,
            epic: 4,
            legendary: 3,
            mythical: 2
        };

        for (const [rarity, count] of Object.entries(targetCounts)) {
            const pool = pokemonPool.filter((pokemon) => pokemon.rarity === rarity);
            for (let i = 0; i < count; i += 1) {
                const base = pool[Math.floor(Math.random() * pool.length)];
                const isShiny = Math.random() < (rarity === 'common' ? 0.03 : 0.08);
                let odds = base.odds;
                if (caseInfo.category === 'featured') odds = Math.max(1, Math.floor(odds * 0.8));
                if (caseInfo.category === 'daily') odds = Math.max(1, Math.floor(odds * 1.2));
                if (caseInfo.category === 'special') odds = Math.max(1, Math.floor(odds * 0.5));
                selectedPokemon.push({
                    ...base,
                    odds,
                    is_shiny: isShiny ? 1 : 0,
                    sprite_variant: isShiny ? `${base.sprite}-shiny` : base.sprite
                });
            }
        }

        while (selectedPokemon.length < 60) {
            const pool = Math.random() < 0.6 ? pokemonPool.filter((pokemon) => pokemon.rarity === 'common') : pokemonPool.filter((pokemon) => pokemon.rarity === 'uncommon');
            const base = pool[Math.floor(Math.random() * pool.length)];
            selectedPokemon.push({
                ...base,
                is_shiny: Math.random() < 0.05 ? 1 : 0,
                sprite_variant: base.sprite
            });
        }

        for (const pokemon of selectedPokemon) {
            insertRow('case_contents', {
                case_id: caseInfo.id,
                pokemon_id: pokemon.id,
                pokemon_name: pokemon.name,
                pokemon_form: pokemon.form || null,
                rarity: pokemon.rarity,
                sprite_url: `https://play.pokemonshowdown.com/sprites/ani/${String(pokemon.sprite_variant || pokemon.sprite).toLowerCase().replace(/-shiny$/,'')}.gif`,
                odds: pokemon.odds,
                is_shiny: pokemon.is_shiny
            });
        }
    }

    const demoPulls = [
        { user: 'PokemonMaster99', caseId: 1, pokemon: 'Pikachu', rarity: 'uncommon' },
        { user: 'TrainerRed', caseId: 4, pokemon: 'Mewtwo', rarity: 'rare' },
        { user: 'AshKetchum22', caseId: 8, pokemon: 'Rayquaza', form: 'Shiny', rarity: 'mythical' },
        { user: 'EliteFour_Pro', caseId: 6, pokemon: 'Dragonite', rarity: 'rare' },
        { user: 'GymLeader_Celia', caseId: 2, pokemon: 'Lugia', rarity: 'epic' },
        { user: 'PokemonBreeder_JP', caseId: 3, pokemon: 'Gardevoir', rarity: 'epic' },
        { user: 'Rival_Silver', caseId: 5, pokemon: 'Gengar', rarity: 'rare' },
        { user: 'Champion_Diamond', caseId: 7, pokemon: 'Lucario', rarity: 'epic' },
        { user: 'Prof_Oak', caseId: 1, pokemon: 'Bulbasaur', rarity: 'common' },
        { user: 'TeamRocket_Grunt', caseId: 9, pokemon: 'Charizard', form: 'Shiny', rarity: 'rare' },
        { user: 'NurseJoy_Official', caseId: 2, pokemon: 'Ho-Oh', rarity: 'epic' },
        { user: 'ProfessorBirch', caseId: 4, pokemon: 'Kyogre', rarity: 'legendary' },
        { user: 'R Seymour', caseId: 8, pokemon: 'Mewtwo', form: 'Shiny', rarity: 'mythical' },
        { user: 'MistyWaterType', caseId: 3, pokemon: 'Vaporeon', rarity: 'rare' },
        { user: 'BrockRockType', caseId: 6, pokemon: 'Tyranitar', rarity: 'legendary' }
    ];

    for (const pull of demoPulls) {
        const caseInfo = table('cases').find((item) => Number(item.id) === Number(pull.caseId));
        if (!caseInfo) continue;
        insertRow('openings', {
            user_id: 0,
            username: pull.user,
            case_id: pull.caseId,
            case_name: caseInfo.name,
            item_id: null,
            pokemon_name: pull.pokemon,
            pokemon_form: pull.form || null,
            rarity: pull.rarity,
            sprite_url: `https://play.pokemonshowdown.com/sprites/ani/${String(pull.pokemon).toLowerCase()}.gif`,
            is_shiny: pull.form ? 1 : 0,
            amount_paid: caseInfo.price,
            is_public: 1,
            opened_at: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24)).toISOString()
        });
    }
}

function initializeDatabase() {
    loadState();
    seedInitialData();
}

module.exports = {
    db,
    notifications,
    initializeDatabase
};
