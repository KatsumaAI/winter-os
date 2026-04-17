/* KatsuCases - Main JavaScript */

// Global state
const state = {
    user: null,
    isLoading: false,
    notifications: [],
    unreadNotifications: 0,
    notificationPoll: null,
    notificationDropdownOpen: false,
    notificationsReady: false,
    communityMessages: [],
    activeRain: null,
    rainHistory: [],
    announcements: [],
    activeClaimDrops: [],
    onlineCount: 0,
    typingUsers: [],
    siteStatePoll: null,
    communityPoll: null,
    communityUiReady: false,
    communityOpen: (() => { try { const saved = window.localStorage.getItem('katsucases.community.open'); return saved === null ? window.innerWidth > 1100 : saved === '1'; } catch (e) { return window.innerWidth > 1100; } })(),
    typingTimeout: null,
    authRefreshPoll: null,
    seenAnnouncementIds: [],
    activeAnnouncementFlashId: null
};

// API helper
const api = {
    async request(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(url) {
        return this.request(url, { method: 'GET' });
    },

    post(url, body) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    put(url, body) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
};

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'ri-check-line',
        error: 'ri-close-line',
        info: 'ri-information-line'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icons[type] || icons.info}"></i>
        </div>
        <div class="toast-message">${escapeHtml(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(Number(amount || 0));
}

// Format relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}

// Get rarity color
function getRarityColor(rarity) {
    const colors = {
        common: '#9ca3af',
        uncommon: '#10b981',
        rare: '#3b82f6',
        epic: '#8b5cf6',
        legendary: '#fbbf24',
        mythical: '#ec4899'
    };
    return colors[rarity] || colors.common;
}

function slugPokemonName(pokemonName) {
    return String(pokemonName || 'pokemon').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Always use the regular showdown sprite. Shiny visuals are handled with CSS.
function getSpriteUrl(pokemonName) {
    const name = slugPokemonName(pokemonName);
    return `https://play.pokemonshowdown.com/sprites/ani/${name}.gif`;
}

function inferShinyState({ isShiny = false, spriteUrl = '', form = '' } = {}) {
    if (Boolean(isShiny)) return true;
    const source = `${spriteUrl || ''} ${form || ''}`.toLowerCase();
    return source.includes('shiny');
}

function resolveSpriteUrl(spriteUrl, pokemonName) {
    if (spriteUrl && typeof spriteUrl === 'string') {
        let normalized = spriteUrl.replace('/sprites/ani-shiny/', '/sprites/ani/');
        normalized = normalized.replace(/-shiny(?=\.gif(?:\?|$))/, '');
        if (normalized.includes('/sprites/ani/')) {
            return normalized;
        }
    }
    return getSpriteUrl(pokemonName);
}

function buildSpriteImg({ pokemonName, isShiny = false, spriteUrl = '', form = '', alt = '', className = '', style = '', attrs = '' }) {
    const shinyState = inferShinyState({ isShiny, spriteUrl, form });
    const classes = ['pokemon-sprite', className, shinyState ? 'sprite-shiny' : ''].filter(Boolean).join(' ');
    return `<img class="${classes}" src="${resolveSpriteUrl(spriteUrl, pokemonName)}" alt="${escapeHtml(alt || pokemonName || 'Pokemon')}" data-pokemon="${escapeHtml(pokemonName || 'pokemon')}" style="${style}" onerror="this.onerror=null;this.src='https://play.pokemonshowdown.com/sprites/ani/pokemon.gif'" ${attrs}>`;
}

function applySpriteState(img, isShiny, spriteUrl = '', form = '') {
    if (!img) return;
    img.src = resolveSpriteUrl(spriteUrl || img.src, img.dataset.pokemon || img.alt || 'pokemon');
    img.classList.toggle('sprite-shiny', inferShinyState({ isShiny, spriteUrl, form }));
    if (!img.dataset.pokemon && img.alt) {
        img.dataset.pokemon = img.alt;
    }
}

function applyBranding() {
    document.querySelectorAll('.logo').forEach((logo) => {
        if (logo.dataset.brandApplied === '1') return;
        logo.dataset.brandApplied = '1';
        logo.innerHTML = `
            <img src="/assets/katsucases-topbar-logo.png" alt="KatsuCases" class="brand-logo-img">
            <span class="sr-only">KatsuCases</span>
        `;
    });
}


function ensureMobileNavigation() {
    const header = document.querySelector('.header');
    if (!header) return;

    let button = header.querySelector('.mobile-menu-toggle');
    const nav = header.querySelector('.nav');
    if (!nav) return;

    if (!button) {
        const actions = header.querySelector('.header-actions');
        if (!actions) return;
        button = document.createElement('button');
        button.className = 'mobile-menu-toggle';
        button.setAttribute('aria-label', 'Toggle navigation');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = '<i class="ri-menu-line"></i>';
        actions.appendChild(button);
    }

    if (button.dataset.mobileBound === '1') return;
    button.dataset.mobileBound = '1';

    const setOpen = (open) => {
        header.classList.toggle('mobile-open', open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('mobile-nav-open', open);
    };

    const toggle = () => setOpen(!header.classList.contains('mobile-open'));
    window.toggleMobileMenu = toggle;
    button.addEventListener('click', (event) => {
        event.preventDefault();
        toggle();
    });

    nav.querySelectorAll('.nav-dropdown-trigger').forEach((trigger) => {
        if (trigger.dataset.mobileBound === '1') return;
        trigger.dataset.mobileBound = '1';
        trigger.addEventListener('click', (event) => {
            if (window.innerWidth > 992) return;
            event.preventDefault();
            const dropdown = trigger.closest('.nav-dropdown');
            if (!dropdown) return;
            const willOpen = !dropdown.classList.contains('mobile-open');
            nav.querySelectorAll('.nav-dropdown.mobile-open').forEach((item) => {
                if (item !== dropdown) item.classList.remove('mobile-open');
            });
            dropdown.classList.toggle('mobile-open', willOpen);
        });
    });

    nav.querySelectorAll('a[href]').forEach((link) => {
        if (link.dataset.mobileCloseBound === '1') return;
        link.dataset.mobileCloseBound = '1';
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992 && !link.classList.contains('nav-dropdown-trigger')) {
                setOpen(false);
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (!header.classList.contains('mobile-open') || window.innerWidth > 992) return;
        if (!header.contains(event.target)) {
            setOpen(false);
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) {
            setOpen(false);
            nav.querySelectorAll('.nav-dropdown.mobile-open').forEach((item) => item.classList.remove('mobile-open'));
        }
    });
}


function buildAvatarMarkup(user, className = 'community-avatar') {
    const displayName = user?.display_name || user?.username || 'User';
    const initial = escapeHtml(displayName.charAt(0).toUpperCase());
    if (user?.avatar_url) {
        return `<img class="${className}" src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(displayName)}" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'${className} fallback',textContent:'${displayName.charAt(0).toUpperCase()}'}));">`;
    }
    return `<span class="${className} fallback">${initial}</span>`;
}

function badgeMarkup(badges = []) {
    return (Array.isArray(badges) ? badges : []).map((badge) => `<span class="badge ${escapeHtml(badge.className || 'badge-common')} community-message-badge">${escapeHtml(badge.label || badge.key || 'TAG')}</span>`).join('');
}

function canDeleteCommunityMessage(message) {
    if (!state.user || !message) return false;
    if (Boolean(state.user.is_admin)) return true;

    const isAuthor = Number(message.user_id) === Number(state.user.id);
    if (!isAuthor) return false;

    const createdAt = new Date(message.created_at || 0).getTime();
    if (!Number.isFinite(createdAt) || createdAt <= 0) return false;

    return Date.now() - createdAt < 5 * 60 * 1000;
}

function announcementDismissKey(announcement) {
    return `katsucases.announcement.dismiss.${announcement?.id || announcement?.created_at || announcement?.message || 'unknown'}`;
}

function isAnnouncementDismissed(announcement) {
    try {
        return window.localStorage.getItem(announcementDismissKey(announcement)) === '1';
    } catch (error) {
        return false;
    }
}

function dismissAnnouncement(announcementId) {
    const announcement = (state.announcements || []).find((entry) => Number(entry.id) === Number(announcementId));
    if (!announcement) return;
    try {
        window.localStorage.setItem(announcementDismissKey(announcement), '1');
    } catch (error) {
        console.warn('Announcement dismissal could not be saved', error);
    }
    renderSiteAnnouncements();
}

function ensureSiteAnnouncementUI() {
    let bar = document.querySelector('.site-announcement-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.className = 'site-announcement-bar';
        document.body.prepend(bar);
    }
    return bar;
}


function triggerAnnouncementFlash(announcement) {
    const key = Number(announcement?.id || 0);
    if (!key || state.activeAnnouncementFlashId === key) return;
    state.activeAnnouncementFlashId = key;
    let flash = document.querySelector('.site-announcement-flash');
    if (!flash) {
        flash = document.createElement('div');
        flash.className = 'site-announcement-flash';
        document.body.appendChild(flash);
    }
    const isJackpot = announcement?.priority === 'jackpot' || announcement?.type === 'rare_roll';
    flash.className = `site-announcement-flash${isJackpot ? ' jackpot' : ''}`;
    flash.innerHTML = `
        <div class="site-announcement-flash-inner">
            <div class="site-announcement-flash-eyebrow">${isJackpot ? 'Global Roll Alert' : 'Site Alert'}</div>
            <div class="site-announcement-flash-text">${escapeHtml(announcement?.message || '')}</div>
        </div>
    `;
    flash.classList.add('active');
    window.clearTimeout(flash._dismissTimer);
    flash._dismissTimer = window.setTimeout(() => {
        flash.classList.remove('active');
        state.activeAnnouncementFlashId = null;
    }, isJackpot ? 8500 : 5200);
}

function syncAnnouncementFlash() {
    const visible = state.announcements.filter((announcement) => !isAnnouncementDismissed(announcement));
    const latest = visible.find((entry) => entry?.priority === 'jackpot' || entry?.type === 'rare_roll');
    if (!latest) return;
    if (!state.seenAnnouncementIds.includes(Number(latest.id || 0))) {
        state.seenAnnouncementIds.push(Number(latest.id || 0));
        state.seenAnnouncementIds = state.seenAnnouncementIds.slice(-20);
        triggerAnnouncementFlash(latest);
    }
}

function renderSiteAnnouncements() {
    const bar = ensureSiteAnnouncementUI();
    const visibleAnnouncements = state.announcements.filter((announcement) => !isAnnouncementDismissed(announcement));
    if (!visibleAnnouncements.length) {
        bar.innerHTML = '';
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'block';
    bar.innerHTML = visibleAnnouncements.slice(0, 2).map((announcement) => {
        const itemClass = `site-announcement-item ${(announcement.priority === 'jackpot' || announcement.type === 'rare_roll') ? 'jackpot' : ''}`.trim();
        return `
        <div class="site-announcement-item-wrap">
            <a class="${itemClass}" href="${escapeHtml(announcement.link || '#')}" ${announcement.link ? '' : 'onclick="return false;"'}>
                <span class="site-announcement-icon"><i class="${announcement.priority === 'jackpot' || announcement.type === 'rare_roll' ? 'ri-vip-diamond-line' : 'ri-megaphone-line'}"></i></span>
                <span>${escapeHtml(announcement.message || '')}</span>
            </a>
            <button class="site-announcement-dismiss" type="button" aria-label="Dismiss announcement" onclick="KatsuCases.dismissAnnouncement(${Number(announcement.id || 0)})">
                <i class="ri-close-line"></i>
            </button>
        </div>`;
    }).join('');
    syncAnnouncementFlash();
}

async function loadSiteState(silent = true) {
    try {
        const data = await api.get('/api/site/state');
        state.announcements = Array.isArray(data.announcements) ? data.announcements : [];
        state.onlineCount = Number(data.onlineCount || 0);
        state.typingUsers = Array.isArray(data.typingUsers) ? data.typingUsers : [];
        if (data.activeRain) state.activeRain = data.activeRain;
        renderSiteAnnouncements();
        renderCommunityUI();
        return data;
    } catch (error) {
        if (!silent) showToast(error.message || 'Failed to load site state', 'error');
        return null;
    }
}

function startSiteStatePolling() {
    if (state.siteStatePoll) clearInterval(state.siteStatePoll);
    loadSiteState(true).catch(() => undefined);
    state.siteStatePoll = window.setInterval(async () => {
        await loadSiteState(true);
        if (state.user) {
            try {
                const auth = await api.get('/api/auth/me');
                if (auth.user) updateUserUI(auth.user);
            } catch (error) {
                console.error('Auth refresh failed', error);
            }
        }
    }, 15000);
}


function updateUserUI(user) {
    state.user = user;

    const authButtons = document.querySelector('.auth-buttons');
    const userArea = document.querySelector('.user-area');
    const balanceDisplay = document.querySelector('.balance-value');

    if (user) {
        if (authButtons) authButtons.style.display = 'none';
        if (userArea) {
            userArea.style.display = 'flex';
            const userNames = userArea.querySelectorAll('.user-name');
            const userInitial = userArea.querySelector('.user-initial');
            const userEmail = userArea.querySelector('.user-email');
            const avatars = userArea.querySelectorAll('.user-avatar');
            userNames.forEach((node) => {
                node.textContent = user.display_name || user.username;
            });
            if (userInitial) userInitial.textContent = (user.display_name || user.username).charAt(0).toUpperCase();
            if (userEmail) userEmail.textContent = user.email || '';
            avatars.forEach((avatar) => {
                if (user.avatar_url) {
                    avatar.innerHTML = `<img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.display_name || user.username)}">`;
                } else {
                    avatar.innerHTML = `<span class="user-initial">${escapeHtml((user.display_name || user.username).charAt(0).toUpperCase())}</span>`;
                }
            });
        }
        if (balanceDisplay) balanceDisplay.textContent = formatCurrency(user.balance);
        ensureNotificationUI();
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userArea) userArea.style.display = 'none';
        teardownNotifications();
    }

    ensureAdminUI();
    ensureCommunityUI();
    renderSiteAnnouncements();
    renderCommunityUI();
}

function ensureNotificationUI() {
    if (!state.user) return;
    const userArea = document.querySelector('.user-area');
    if (!userArea) return;

    let wrapper = userArea.querySelector('.site-notifications');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'site-notifications';
        wrapper.innerHTML = `
            <button class="btn btn-icon btn-ghost notification-trigger" type="button" aria-label="Notifications">
                <i class="ri-notification-3-line"></i>
                <span class="notification-badge" style="display:none;">0</span>
            </button>
            <div class="notification-dropdown">
                <div class="notification-dropdown-header">
                    <div>
                        <h4>Notifications</h4>
                        <p>Marketplace and trade activity</p>
                    </div>
                    <button class="notification-read-all" type="button">Mark all read</button>
                </div>
                <div class="notification-list">
                    <div class="notification-empty">Nothing new yet.</div>
                </div>
            </div>
        `;
        userArea.insertBefore(wrapper, userArea.firstElementChild || null);

        const trigger = wrapper.querySelector('.notification-trigger');
        const readAll = wrapper.querySelector('.notification-read-all');

        trigger.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.notificationDropdownOpen = !state.notificationDropdownOpen;
            wrapper.classList.toggle('open', state.notificationDropdownOpen);
            if (state.notificationDropdownOpen) {
                await loadNotifications({ silent: true });
            }
        });

        readAll.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await markAllNotificationsRead();
        });
    }

    startNotificationPolling();
    renderNotifications();
}

function teardownNotifications() {
    state.notifications = [];
    state.unreadNotifications = 0;
    state.notificationsReady = false;
    state.notificationDropdownOpen = false;
    if (state.notificationPoll) {
        clearInterval(state.notificationPoll);
        state.notificationPoll = null;
    }
    document.querySelectorAll('.site-notifications').forEach((node) => node.remove());
}

function startNotificationPolling() {
    if (state.notificationPoll) {
        clearInterval(state.notificationPoll);
    }

    loadNotifications({ silent: true }).catch(() => undefined);
    state.notificationPoll = window.setInterval(() => {
        if (state.user) {
            loadNotifications({ silent: true }).catch(() => undefined);
        }
    }, 15000);
}

async function loadNotifications({ silent = false } = {}) {
    if (!state.user) return [];
    try {
        const data = await api.get('/api/notifications?limit=20');
        state.notifications = Array.isArray(data.notifications) ? data.notifications : [];
        state.unreadNotifications = Number(data.unreadCount || 0);
        state.notificationsReady = true;
        renderNotifications();
        return state.notifications;
    } catch (error) {
        if (!silent) {
            showToast('Failed to load notifications', 'error');
        }
        return [];
    }
}

function renderNotifications() {
    const wrapper = document.querySelector('.site-notifications');
    if (!wrapper) return;

    const badge = wrapper.querySelector('.notification-badge');
    const list = wrapper.querySelector('.notification-list');

    if (badge) {
        if (state.unreadNotifications > 0) {
            badge.textContent = state.unreadNotifications > 99 ? '99+' : String(state.unreadNotifications);
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    if (!list) return;

    if (!state.notificationsReady) {
        list.innerHTML = '<div class="notification-empty">Loading notifications…</div>';
        return;
    }

    if (!state.notifications.length) {
        list.innerHTML = '<div class="notification-empty">Nothing new yet.</div>';
        return;
    }

    list.innerHTML = state.notifications.map((notification) => {
        const tag = notification.link ? 'a' : 'button';
        const href = notification.link ? `href="${escapeHtml(notification.link)}"` : '';
        const unreadClass = notification.is_read ? '' : ' unread';
        const iconClass = {
            trade_request: 'ri-exchange-box-line',
            trade_accepted: 'ri-check-double-line',
            trade_declined: 'ri-close-circle-line',
            trade_sent: 'ri-send-plane-line',
            marketplace_sold: 'ri-coins-line',
            marketplace_bought: 'ri-shopping-cart-line',
            marketplace_listed: 'ri-price-tag-3-line',
            marketplace_removed: 'ri-eye-off-line'
        }[notification.type] || 'ri-notification-3-line';

        return `
            <${tag} class="notification-item${unreadClass}" data-notification-id="${notification.id}" ${href}>
                <div class="notification-icon"><i class="${iconClass}"></i></div>
                <div class="notification-content">
                    <div class="notification-title-row">
                        <span class="notification-title">${escapeHtml(notification.title)}</span>
                        <span class="notification-time">${escapeHtml(formatRelativeTime(notification.created_at))}</span>
                    </div>
                    <p class="notification-message">${escapeHtml(notification.message)}</p>
                </div>
            </${tag}>
        `;
    }).join('');

    list.querySelectorAll('.notification-item').forEach((item) => {
        item.addEventListener('click', async (event) => {
            const id = Number(item.dataset.notificationId);
            const notification = state.notifications.find((entry) => Number(entry.id) === id);
            const href = item.getAttribute('href');

            if (notification && !notification.is_read) {
                try {
                    await markNotificationRead(id, true);
                } catch (error) {
                    console.error('Failed to mark notification read:', error);
                }
            }

            if (href) {
                event.preventDefault();
                window.location.href = href;
            }
        });
    });
}

async function markNotificationRead(notificationId, silent = false) {
    if (!state.user || !notificationId) return;
    try {
        const data = await api.post(`/api/notifications/${notificationId}/read`, {});
        state.unreadNotifications = Number(data.unreadCount || 0);
        state.notifications = state.notifications.map((notification) => (
            Number(notification.id) === Number(notificationId)
                ? { ...notification, is_read: 1 }
                : notification
        ));
        renderNotifications();
    } catch (error) {
        if (!silent) showToast('Failed to update notification', 'error');
        throw error;
    }
}

async function markAllNotificationsRead() {
    if (!state.user) return;
    try {
        await api.post('/api/notifications/read-all', {});
        state.unreadNotifications = 0;
        state.notifications = state.notifications.map((notification) => ({ ...notification, is_read: 1 }));
        renderNotifications();
    } catch (error) {
        showToast('Failed to mark notifications read', 'error');
    }
}


function ensureAdminUI() {
    const nav = document.querySelector('.nav');
    if (nav) {
        let navLink = nav.querySelector('.nav-link-admin') || nav.querySelector('a[href="/admin"]');
        if (state.user && state.user.is_admin) {
            if (!navLink) {
                navLink = document.createElement('a');
                navLink.href = '/admin';
                navLink.className = 'nav-link nav-link-admin';
                navLink.innerHTML = 'Admin';
                nav.appendChild(navLink);
            }
        } else if (navLink) {
            navLink.remove();
        }
    }

    const userMenu = document.querySelector('.user-menu-dropdown');
    if (userMenu) {
        let menuItem = userMenu.querySelector('.user-menu-item-admin');
        if (state.user && state.user.is_admin) {
            if (!menuItem) {
                menuItem = document.createElement('a');
                menuItem.href = '/admin';
                menuItem.className = 'user-menu-item user-menu-item-admin';
                menuItem.innerHTML = '<i class="ri-shield-star-line"></i> Admin';
                const logoutItem = Array.from(userMenu.querySelectorAll('.user-menu-item')).find((node) => /logout/i.test(node.textContent || ''));
                if (logoutItem) {
                    userMenu.insertBefore(menuItem, logoutItem);
                } else {
                    userMenu.appendChild(menuItem);
                }
            }
        } else if (menuItem) {
            menuItem.remove();
        }
    }

    const shortcut = document.querySelector('.community-admin-shortcut');
    if (shortcut) {
        shortcut.style.display = state.user && state.user.is_admin ? 'inline-flex' : 'none';
    }
}

function getRainCountdown(endAt) {
    if (!endAt) return 'No timer';
    const diff = new Date(endAt).getTime() - Date.now();
    if (diff <= 0) return 'Ending now';
    const minutes = Math.ceil(diff / 60000);
    if (minutes < 60) return `${minutes}m remaining`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours}h ${remainder}m remaining`;
}


function ensureCommunityUI() {
    let sidebar = document.querySelector('.community-sidebar');
    if (!sidebar) {
        sidebar = document.createElement('aside');
        sidebar.className = 'community-sidebar';
        sidebar.innerHTML = `
            <button class="community-sidebar-toggle" type="button" aria-label="Toggle community chat">
                <i class="ri-discuss-line"></i>
            </button>
            <div class="community-sidebar-inner">
                <div class="community-sidebar-header">
                    <div>
                        <h3>Community</h3>
                        <p><span class="community-online-count">0 online</span> · <span class="community-typing-summary">Nobody typing</span></p>
                    </div>
                    <div class="community-sidebar-actions">
                        <a href="/admin" class="btn btn-ghost btn-sm community-admin-shortcut" style="display:none;">Owner</a>
                        <button class="btn btn-ghost btn-sm community-sidebar-close" type="button"><i class="ri-close-line"></i></button>
                    </div>
                </div>
                <div class="community-rain-panel"></div>
                <div class="community-claim-panel"></div>
                <div class="community-message-list"></div>
                <div class="community-auth-hint"></div>
                <form class="community-chat-form">
                    <input class="community-chat-input" type="text" maxlength="240" placeholder="Send a message to everyone">
                    <button class="btn btn-primary" type="submit"><i class="ri-send-plane-line"></i></button>
                </form>
            </div>
        `;
        document.body.appendChild(sidebar);
        document.body.classList.add('has-community-sidebar');

        const toggleSidebar = (nextState = !state.communityOpen) => {
            state.communityOpen = Boolean(nextState);
            sidebar.classList.toggle('closed', !state.communityOpen);
            const toggle = sidebar.querySelector('.community-sidebar-toggle');
            if (toggle) toggle.setAttribute('aria-expanded', state.communityOpen ? 'true' : 'false');
            try { window.localStorage.setItem('katsucases.community.open', state.communityOpen ? '1' : '0'); } catch (error) {}
        };

        const toggle = sidebar.querySelector('.community-sidebar-toggle');
        if (toggle) toggle.addEventListener('click', () => toggleSidebar());
        const closeButton = sidebar.querySelector('.community-sidebar-close');
        if (closeButton) closeButton.addEventListener('click', () => toggleSidebar(false));

        window.addEventListener('resize', () => {
            if (window.innerWidth < 900 && state.communityOpen) {
                toggleSidebar(false);
            }
        });

        document.addEventListener('click', (event) => {
            if (!sidebar.contains(event.target) && window.innerWidth < 900 && state.communityOpen) {
                toggleSidebar(false);
            }
        });

        const form = sidebar.querySelector('.community-chat-form');
        const input = sidebar.querySelector('.community-chat-input');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const message = String(input.value || '').trim();
            if (!state.user) {
                window.location.href = '/signin';
                return;
            }
            if (!message) return;
            try {
                await api.post('/api/community/chat', { message });
                input.value = '';
                await api.post('/api/community/presence', { typing: false }).catch(() => undefined);
                await loadCommunityChat(true);
            } catch (error) {
                showToast(error.message || 'Failed to send message', 'error');
            }
        });
        input.addEventListener('input', debounce(() => {
            if (!state.user) return;
            api.post('/api/community/presence', { typing: input.value.trim().length > 0 }).catch(() => undefined);
        }, 350));
    }

    state.communityUiReady = true;
    sidebar.classList.toggle('closed', !state.communityOpen);
    const toggle = sidebar.querySelector('.community-sidebar-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', state.communityOpen ? 'true' : 'false');
    ensureAdminUI();
    startCommunityPolling();
}


function renderCommunityUI() {
    const sidebar = document.querySelector('.community-sidebar');
    if (!sidebar) return;

    const rainPanel = sidebar.querySelector('.community-rain-panel');
    const claimPanel = sidebar.querySelector('.community-claim-panel');
    const messageList = sidebar.querySelector('.community-message-list');
    const authHint = sidebar.querySelector('.community-auth-hint');
    const input = sidebar.querySelector('.community-chat-input');
    const form = sidebar.querySelector('.community-chat-form');
    const onlineCount = sidebar.querySelector('.community-online-count');
    const typingSummary = sidebar.querySelector('.community-typing-summary');

    if (onlineCount) onlineCount.textContent = `${state.onlineCount || 0} online`;
    if (typingSummary) {
        const typers = (state.typingUsers || []).filter((entry) => !state.user || Number(entry.user_id) !== Number(state.user.id));
        if (!typers.length) {
            typingSummary.textContent = 'Nobody typing';
        } else if (typers.length === 1) {
            typingSummary.textContent = `${typers[0].display_name || typers[0].username} is typing…`;
        } else {
            typingSummary.textContent = `${typers.length} people typing…`;
        }
    }

    if (rainPanel) {
        if (state.activeRain) {
            const entrants = Array.isArray(state.activeRain.entrants) ? state.activeRain.entrants : [];
            rainPanel.innerHTML = `
                <div class="community-rain-card">
                    <div class="community-rain-top">
                        <div>
                            <div class="community-rain-title">${escapeHtml(state.activeRain.title)}</div>
                            <div class="community-rain-meta">$${Number(state.activeRain.amount || 0).toFixed(2)} split · ${Number(state.activeRain.entrant_count || entrants.length)} entered</div>
                        </div>
                        <span class="badge badge-legendary">${escapeHtml(getRainCountdown(state.activeRain.ends_at))}</span>
                    </div>
                    <div class="community-rain-entrants">${entrants.length ? entrants.map((entry) => `<span>${escapeHtml(entry.display_name || entry.username)}</span>`).join('') : '<span>No entrants yet</span>'}</div>
                    <div class="community-rain-actions">
                        ${state.user ? `<button class="btn ${state.activeRain.entered ? 'btn-secondary' : 'btn-primary'}" type="button" ${state.activeRain.entered ? 'disabled' : ''} onclick="KatsuCases.enterActiveRain()">${state.activeRain.entered ? 'Entered' : 'Enter Rain'}</button>` : '<a href="/signin" class="btn btn-primary">Sign In to Enter</a>'}
                    </div>
                </div>
            `;
        } else {
            rainPanel.innerHTML = '<div class="community-rain-card empty">No active rain right now.</div>';
        }
    }

    if (claimPanel) {
        if (state.activeClaimDrops.length) {
            claimPanel.innerHTML = state.activeClaimDrops.slice(0, 2).map((claim) => `
                <div class="community-rain-card claim-card">
                    <div class="community-rain-top">
                        <div>
                            <div class="community-rain-title">${escapeHtml(claim.title)}</div>
                            <div class="community-rain-meta">${escapeHtml(claim.type)} · ${Number(claim.claimed_count || 0)}/${Number(claim.max_claims || 1)} used</div>
                        </div>
                        <span class="badge badge-rare">${escapeHtml(claim.code)}</span>
                    </div>
                    <div class="community-rain-actions">
                        ${state.user ? `<button class="btn btn-secondary" type="button" onclick="KatsuCases.claimDrop('${String(claim.code).replace(/'/g, "\'")}')">Claim</button>` : '<a href="/signin" class="btn btn-secondary">Sign In</a>'}
                    </div>
                </div>
            `).join('');
        } else {
            claimPanel.innerHTML = '';
        }
    }

    if (messageList) {
        const stickToBottom = messageList.scrollTop + messageList.clientHeight >= messageList.scrollHeight - 40;
        if (!state.communityMessages.length) {
            messageList.innerHTML = '<div class="community-empty">No messages yet.</div>';
        } else {
            messageList.innerHTML = state.communityMessages.map((message) => `
                <article class="community-message community-message-${escapeHtml(message.type || 'user')}">
                    <div class="community-message-avatar-wrap">${buildAvatarMarkup(message, 'community-avatar')}</div>
                    <div class="community-message-main">
                        <div class="community-message-head">
                            ${(message.user_id || message.type !== 'system') ? `<a class="community-message-author" href="/profile?user=${encodeURIComponent(message.username || '')}">${escapeHtml(message.display_name || message.username || 'KatsuCases')}</a>` : `<span class="community-message-author">${escapeHtml(message.display_name || message.username || 'KatsuCases')}</span>`}
                            ${badgeMarkup(message.badges || [])}
                            ${message.region ? `<span class="community-message-region">${escapeHtml(message.region)}</span>` : ''}
                            <span class="community-message-time">${escapeHtml(formatRelativeTime(message.created_at))}</span>
                            ${canDeleteCommunityMessage(message) ? `<button class="community-message-delete" type="button" onclick="KatsuCases.deleteCommunityMessage(${Number(message.id)})">Delete</button>` : ''}
                        </div>
                        <div class="community-message-body">${escapeHtml(message.message || '')}</div>
                    </div>
                </article>
            `).join('');
        }
        if (stickToBottom) messageList.scrollTop = messageList.scrollHeight;
    }

    if (authHint) {
        authHint.innerHTML = state.user
            ? `<span>Signed in as <strong>${escapeHtml(state.user.display_name || state.user.username)}</strong>${state.user.free_rolls ? ` · ${escapeHtml(String(state.user.free_rolls))} free rolls` : ''}</span>`
            : '<a href="/signin">Sign in</a> to chat, claim drops, and enter rain.';
    }

    if (input) {
        input.disabled = !state.user;
        input.placeholder = state.user ? 'Send a message to everyone' : 'Sign in to join the chat';
    }
    if (form) form.classList.toggle('disabled', !state.user);
}

async function deleteCommunityMessage(messageId) {
    try {
        await api.delete(`/api/community/chat/${messageId}`);
        state.communityMessages = state.communityMessages.filter((message) => Number(message.id) !== Number(messageId));
        renderCommunityUI();
        showToast('Message removed', 'success');
    } catch (error) {
        showToast(error.message || 'Could not remove message', 'error');
    }
}

function startCommunityPolling() {
    if (state.communityPoll) return;
    loadCommunityChat(true).catch(() => undefined);
    state.communityPoll = window.setInterval(() => {
        loadCommunityChat(true).catch(() => undefined);
        renderCommunityUI();
    }, 6000);
    if (!state.communityTicker) {
        state.communityTicker = window.setInterval(() => {
            renderCommunityUI();
        }, 1000);
    }
}

async function loadCommunityChat(silent = false) {
    try {
        const data = await api.get('/api/community/chat?limit=60');
        state.communityMessages = Array.isArray(data.messages) ? data.messages : [];
        state.activeRain = data.activeRain || null;
        state.rainHistory = Array.isArray(data.rainHistory) ? data.rainHistory : [];
        state.announcements = Array.isArray(data.announcements) ? data.announcements : state.announcements;
        state.activeClaimDrops = Array.isArray(data.claimDrops) ? data.claimDrops : [];
        state.onlineCount = Number(data.onlineCount || 0);
        state.typingUsers = Array.isArray(data.typingUsers) ? data.typingUsers : [];
        renderSiteAnnouncements();
        renderCommunityUI();
        return data;
    } catch (error) {
        if (!silent) showToast(error.message || 'Failed to load community chat', 'error');
        return null;
    }
}

async function enterActiveRain() {
    if (!state.user) {
        window.location.href = '/signin';
        return;
    }
    try {
        await api.post('/api/community/rain/enter', {});
        showToast('You entered the rain', 'success');
        await loadCommunityChat(true);
    } catch (error) {
        showToast(error.message || 'Could not enter the rain', 'error');
    }
}

async function claimDrop(code) {
    if (!state.user) {
        window.location.href = '/signin';
        return;
    }
    try {
        await api.post(`/api/claims/${encodeURIComponent(code)}/claim`, {});
        showToast('Drop claimed', 'success');
        await checkAuth();
        await loadCommunityChat(true);
    } catch (error) {
        showToast(error.message || 'Could not claim drop', 'error');
    }
}


function startAuthRefreshPolling() {
    if (state.authRefreshPoll) return;
    state.authRefreshPoll = window.setInterval(async () => {
        if (!state.user) return;
        try {
            const data = await api.get('/api/auth/me');
            updateUserUI(data.user);
        } catch (error) {
            updateUserUI(null);
        }
    }, 15000);
}

// Check authentication status
async function checkAuth() {
    try {
        const data = await api.get('/api/auth/me');
        updateUserUI(data.user);
        await loadSiteState(true);
        return data.user;
    } catch (error) {
        updateUserUI(null);
        return null;
    }
}

// Logout
async function logout() {
    try {
        await api.post('/api/auth/logout', {});
        showToast('Logged out successfully', 'success');
        updateUserUI(null);
        loadCommunityChat(true).catch(() => undefined);
        window.location.href = '/';
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }

    const wrapper = document.querySelector('.site-notifications');
    if (wrapper && !wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
        state.notificationDropdownOpen = false;
    }
});

// Escape key closes modals and dropdowns
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach((modal) => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';

        const wrapper = document.querySelector('.site-notifications');
        if (wrapper) {
            wrapper.classList.remove('open');
            state.notificationDropdownOpen = false;
        }
    }
});

// FAQ accordion
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach((button) => {
        button.addEventListener('click', () => {
            const item = button.closest('.faq-item');
            const isActive = item.classList.contains('active');

            document.querySelectorAll('.faq-item').forEach((faqItem) => {
                faqItem.classList.remove('active');
            });

            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// Tabs functionality
function initTabs() {
    document.querySelectorAll('.tabs').forEach((tabGroup) => {
        const tabs = tabGroup.querySelectorAll('.tab');
        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const targetId = tab.dataset.tab;

                tabs.forEach((tabEl) => tabEl.classList.remove('active'));
                tab.classList.add('active');

                const parent = tabGroup.closest('.section');
                if (parent) {
                    parent.querySelectorAll('.tab-content').forEach((content) => {
                        content.style.display = 'none';
                    });
                    const target = parent.querySelector(`#${targetId}`);
                    if (target) {
                        target.style.display = 'block';
                    }
                }
            });
        });
    });
}

// Pills/filter functionality
function initPills() {
    document.querySelectorAll('.pills').forEach((pillGroup) => {
        const pills = pillGroup.querySelectorAll('.pill');
        pills.forEach((pill) => {
            pill.addEventListener('click', () => {
                pills.forEach((pillEl) => pillEl.classList.remove('active'));
                pill.classList.add('active');

                const filter = pill.dataset.filter;
                const callback = pillGroup.dataset_callback;

                if (window[callback]) {
                    window[callback](filter);
                }
            });
        });
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeIn');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
        observer.observe(el);
    });
}

function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function setLoading(isLoading, element) {
    if (isLoading) {
        element.disabled = true;
        element.dataset.originalText = element.textContent;
        element.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Loading...';
    } else {
        element.disabled = false;
        element.textContent = element.dataset.originalText || 'Submit';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    applyBranding();
    ensureMobileNavigation();
    ensureSiteAnnouncementUI();
    ensureCommunityUI();
    await checkAuth();
    startSiteStatePolling();
    startAuthRefreshPolling();
    initFAQ();
    initTabs();
    initPills();
    initScrollAnimations();

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

window.KatsuCases = {
    api,
    state,
    showToast,
    formatCurrency,
    formatRelativeTime,
    getRarityColor,
    getSpriteUrl,
    resolveSpriteUrl,
    buildSpriteImg,
    applySpriteState,
    inferShinyState,
    updateUserUI,
    checkAuth,
    loadNotifications,
    refreshNotifications: loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    openModal,
    closeModal,
    debounce,
    formatNumber,
    setLoading,
    escapeHtml,
    applyBranding,
    ensureMobileNavigation,
    buildAvatarMarkup,
    dismissAnnouncement,
    ensureCommunityUI,
    ensureSiteAnnouncementUI,
    loadCommunityChat,
    loadSiteState,
    renderCommunityUI,
    enterActiveRain,
    claimDrop,
    deleteCommunityMessage,
    logout
};
