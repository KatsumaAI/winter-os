/* KatsuCases - Animations using anime.js */

function getAnimeLib() {
    if (typeof window !== 'undefined' && typeof window.anime === 'function') {
        return window.anime;
    }
    console.warn('anime.js is not available on this page. Animations were skipped.');
    return null;
}

function playAnimation(options) {
    const anime = getAnimeLib();
    if (!anime) {
        if (typeof options.complete === 'function') {
            try { options.complete(); } catch (error) { console.error(error); }
        }
        return { finished: Promise.resolve(), instance: null };
    }

    let resolveFinished;
    const finished = new Promise((resolve) => { resolveFinished = resolve; });
    const originalComplete = options.complete;

    const instance = anime({
        ...options,
        complete: (...args) => {
            if (typeof originalComplete === 'function') originalComplete(...args);
            resolveFinished(...args);
        }
    });

    return { finished, instance };
}

function createTimeline(config = {}) {
    const anime = getAnimeLib();
    if (!anime || typeof anime.timeline !== 'function') {
        return { add() { return this; }, finished: Promise.resolve(), duration: 0, seek() {} };
    }

    let resolveFinished;
    const finished = new Promise((resolve) => { resolveFinished = resolve; });
    const originalComplete = config.complete;

    const timeline = anime.timeline({
        ...config,
        complete: (...args) => {
            if (typeof originalComplete === 'function') originalComplete(...args);
            resolveFinished(...args);
        }
    });

    timeline.finished = finished;
    return timeline;
}

let caseAnimationPool = [];
let activeRollTimeline = null;
let activeRevealOverlay = null;
let currentOpenAnotherHandler = null;

function setOpeningShellBadge(text) {
    const badge = document.getElementById('openingShellBadge');
    if (badge) badge.textContent = text;
}

function clearOpeningImpactClasses() {
    const openingModal = document.getElementById('opening-modal');
    if (!openingModal) return;
    openingModal.classList.remove('rolling', 'impact-epic', 'impact-legendary', 'impact-mythical');
}

function triggerOpeningImpact(rarity) {
    const openingModal = document.getElementById('opening-modal');
    if (!openingModal) return;
    clearOpeningImpactClasses();
    if (!rarity || !['epic', 'legendary', 'mythical'].includes(rarity)) return;
    openingModal.classList.add(`impact-${rarity}`);
    window.setTimeout(() => {
        openingModal.classList.remove(`impact-${rarity}`);
    }, 1400);
}

function setAnimationPool(items) {
    caseAnimationPool = Array.isArray(items) ? items.slice() : [];
}

function setOpeningHint(text) {
    const hintEl = document.getElementById('openingStageHint');
    if (hintEl) hintEl.textContent = text;
}

function rarityScore(item) {
    const order = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythical: 5 };
    return order[item?.rarity] || 0;
}

function buildReplayTrack(pool, winner, slots = 56) {
    const source = (Array.isArray(pool) ? pool : []).filter(Boolean);
    if (!source.length && winner) {
        return Array.from({ length: slots }, () => ({ ...winner }));
    }

    const sorted = source.slice().sort((a, b) => {
        const rarityDelta = rarityScore(a) - rarityScore(b);
        if (rarityDelta !== 0) return rarityDelta;
        return (a.estimated_value || 0) - (b.estimated_value || 0);
    });

    const winnerIndex = Math.max(16, slots - 10);
    const track = [];
    for (let index = 0; index < slots; index += 1) {
        if (index === winnerIndex) {
            track.push({ ...winner });
            continue;
        }
        let poolIndex = (index * 7 + index * index) % sorted.length;
        if (index > winnerIndex - 5 && index < winnerIndex) {
            poolIndex = (sorted.length - 1) - ((winnerIndex - index) % Math.min(sorted.length, 6));
        }
        track.push({ ...sorted[poolIndex] });
    }
    return track;
}

function createSlotElement(result, isPlaceholder = false, isWinner = false) {
    const slot = document.createElement('div');
    slot.className = `roller-slot rarity-glow-${result?.rarity || 'common'}${isPlaceholder ? ' roller-slot-placeholder' : ''}${isWinner ? ' winner' : ''}`;

    if (isPlaceholder) {
        slot.innerHTML = '<span class="roller-slot-placeholder">?</span>';
    } else if (result) {
        slot.innerHTML = `
            ${KatsuCases.buildSpriteImg({ pokemonName: result.pokemon_name, isShiny: result.is_shiny, spriteUrl: result.sprite_url, alt: result.pokemon_name })}
            <span class="roller-slot-name">${result.pokemon_name}</span>
            <span class="roller-slot-value">${KatsuCases.formatCurrency(result.estimated_value || 0)}</span>
            ${result.odds ? `<span class="roller-slot-odds">1 in ${KatsuCases.formatNumber(result.odds)}</span>` : ''}
        `;
    }
    return slot;
}

function getWinnerIndex(trackLength) {
    return Math.max(16, trackLength - 10);
}

function clearActiveOverlay() {
    if (activeRevealOverlay && activeRevealOverlay.remove) {
        activeRevealOverlay.remove();
    }
    activeRevealOverlay = null;
}

async function animateCaseOpen(results, rollerElement, revealElement) {
    rollerElement.innerHTML = '';
    rollerElement.style.opacity = '1';
    revealElement.classList.remove('active');
    revealElement.innerHTML = '';
    clearOpeningImpactClasses();
    const openingModal = document.getElementById('opening-modal');
    if (openingModal) openingModal.classList.add('rolling');
    setOpeningShellBadge('Live Roll Chamber');
    setOpeningHint('Shuffling the reel and lining up the final result…');

    const winner = results[results.length - 1];
    const trackData = Array.isArray(winner?.track) && winner.track.length
        ? winner.track
        : buildReplayTrack(caseAnimationPool.length ? caseAnimationPool : results, winner);
    const winnerIndex = typeof winner?.winning_index === 'number' ? winner.winning_index : getWinnerIndex(trackData.length);

    const track = document.createElement('div');
    track.className = 'roller-track';
    rollerElement.appendChild(track);

    trackData.forEach((item, index) => {
        track.appendChild(createSlotElement(item, false, index === winnerIndex));
    });

    const slots = Array.from(track.querySelectorAll('.roller-slot'));
    if (!slots.length) return winner;

    const firstRect = slots[0].getBoundingClientRect();
    const secondRect = slots[1] ? slots[1].getBoundingClientRect() : null;
    const step = secondRect ? (secondRect.left - firstRect.left) : (firstRect.width + 18);
    const trackPaddingLeft = parseFloat(window.getComputedStyle(track).paddingLeft || '0') || 0;
    const slotWidth = firstRect.width;
    const centerOffset = Math.max(0, (rollerElement.clientWidth / 2) - (slotWidth / 2));
    const targetX = -(winnerIndex * step) - trackPaddingLeft + centerOffset;

    const timeline = createTimeline({ easing: 'easeOutQuart' });
    activeRollTimeline = timeline;

    timeline.add({
        targets: track,
        scale: [0.985, 1],
        duration: 320,
        easing: 'easeOutQuad'
    }).add({
        targets: track,
        translateX: [0, targetX],
        duration: 6200,
        easing: 'cubicBezier(.08,.8,.14,1)',
        update() {
            const lineX = rollerElement.getBoundingClientRect().left + (rollerElement.clientWidth / 2);
            let closest = null;
            let closestDistance = Number.POSITIVE_INFINITY;
            slots.forEach((slot) => {
                slot.classList.remove('highlight');
                const rect = slot.getBoundingClientRect();
                const distance = Math.abs((rect.left + rect.width / 2) - lineX);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closest = slot;
                }
            });
            if (closest) closest.classList.add('highlight');
        },
        begin() {
            setOpeningShellBadge('Roll In Progress');
            setOpeningHint('Rolling through the drop pool… watch the center marker.');
        }
    });

    try {
        await timeline.finished;
    } finally {
        activeRollTimeline = null;
    }

    const winnerSlot = slots[winnerIndex];
    setOpeningShellBadge('Target Locked');
    setOpeningHint('Locking the result and revealing the pull…');
    triggerOpeningImpact(winner?.rarity);
    if (winnerSlot) {
        winnerSlot.classList.add('winner');
        await playAnimation({
            targets: winnerSlot,
            scale: [1, 1.075, 1],
            translateY: [0, -10, 0],
            duration: 540,
            easing: 'easeOutElastic(1, .55)'
        }).finished;
        await playAnimation({
            targets: track,
            translateX: [targetX - 10, targetX],
            duration: 260,
            easing: 'easeOutExpo'
        }).finished;
    }

    if (winner && ['epic', 'legendary', 'mythical'].includes(winner.rarity)) {
        await showSpecialReveal(winner, revealElement, track);
    } else {
        await new Promise((resolve) => setTimeout(resolve, 240));
        revealElement.classList.add('active');
        updateRevealContent(revealElement, results);
        setOpeningShellBadge('Result Confirmed');
        setOpeningHint('Result locked. Replay-ready and added to inventory.');
    }

    if (openingModal) openingModal.classList.remove('rolling');
    return winner;
}

async function showSpecialReveal(result, revealElement, rollerTrack) {
    clearActiveOverlay();
    const rarityTitles = { epic: 'Rare Hit', legendary: 'Jackpot Pull', mythical: 'Ultra Jackpot' };
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; display:grid; place-items:center; background:radial-gradient(circle at center, rgba(21,32,62,0.55), rgba(0,0,0,0.92)); z-index:1999; opacity:0; overflow:hidden;';
    overlay.innerHTML = `<div style="padding:18px 26px;border-radius:999px;border:1px solid rgba(255,255,255,0.14);background:rgba(8,12,22,0.72);color:#f8fafc;font-weight:800;letter-spacing:.16em;text-transform:uppercase;box-shadow:0 20px 50px rgba(0,0,0,.35);">${rarityTitles[result.rarity] || 'Special Pull'}</div>`;
    activeRevealOverlay = overlay;
    document.body.appendChild(overlay);

    setOpeningShellBadge(rarityTitles[result.rarity] || 'Special Pull');
    setOpeningHint('Charging the reveal chamber…');
    await playAnimation({ targets: overlay, opacity: [0, 1], duration: 400, easing: 'easeOutQuad' }).finished;
    rollerTrack.style.opacity = '0';

    revealElement.classList.add('active');
    updateRevealContent(revealElement, [result]);

    const spriteElement = revealElement.querySelector('.reward-sprite');
    if (spriteElement && result.rarity === 'legendary') {
        spriteElement.classList.add('legendary');
        await playAnimation({ targets: spriteElement, scale: [0.72, 1.02, 1], rotate: [8, 0], duration: 880, easing: 'easeOutElastic(1, .5)' }).finished;
        createParticles(spriteElement, '#fbbf24', 22);
    } else if (spriteElement && result.rarity === 'mythical') {
        spriteElement.classList.add('mythical');
        await playAnimation({ targets: spriteElement, scale: [0.58, 1.12, 1], rotate: [14, -4, 0], duration: 1000, easing: 'easeOutElastic(1, .42)' }).finished;
        createParticles(spriteElement, '#ec4899', 28);
        createParticles(spriteElement, '#8b5cf6', 20);
    } else if (spriteElement) {
        await playAnimation({ targets: spriteElement, scale: [0.72, 1], duration: 600, easing: 'easeOutBack' }).finished;
        createParticles(spriteElement, '#8b5cf6', 16);
    }

    await new Promise((resolve) => setTimeout(resolve, 760));
    setOpeningShellBadge('Result Confirmed');
    setOpeningHint('Result locked. Replay-ready and added to inventory.');
    await playAnimation({ targets: overlay, opacity: 0, duration: 420 }).finished;
    clearActiveOverlay();
}

function createParticles(container, color, count) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < count; i += 1) {
        const particle = document.createElement('div');
        particle.style.cssText = `position:fixed; left:${centerX}px; top:${centerY}px; width:8px; height:8px; background:${color}; border-radius:50%; pointer-events:none; z-index:2000;`;
        document.body.appendChild(particle);

        const angle = (Math.PI * 2 / count) * i;
        const distance = 100 + Math.random() * 100;
        playAnimation({
            targets: particle,
            translateX: Math.cos(angle) * distance,
            translateY: Math.sin(angle) * distance,
            opacity: [1, 0],
            scale: [1, 0],
            duration: 1000 + Math.random() * 500,
            easing: 'easeOutQuad',
            complete: () => particle.remove()
        });
    }
}

function updateRevealContent(revealElement, results) {
    const finalResult = results[results.length - 1];
    const rarityClass = `badge-${finalResult.rarity}`;
    const totalValue = Number(results.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0).toFixed(2));
    const isMulti = results.length > 1;
    const headingMap = { common: 'Drop Secured', uncommon: 'Clean Pull', rare: 'Rare Pull', epic: 'Featured Hit', legendary: 'Jackpot Pull', mythical: 'Mythical Hit' };
    const amount = Math.max(1, Number(window.currentOpeningAmount || results.length || 1));

    revealElement.innerHTML = `
        <div class="reward-heading-wrap">
            <div class="reward-heading-kicker">${headingMap[finalResult.rarity] || 'Drop Secured'}</div>
            <div class="reward-heading-sub">Provably fair result locked to inventory-ready output.</div>
        </div>
        <div class="reward-sprite ${finalResult.rarity === 'legendary' || finalResult.rarity === 'mythical' ? finalResult.rarity : ''}">
            ${KatsuCases.buildSpriteImg({ pokemonName: finalResult.pokemon_name, isShiny: finalResult.is_shiny, spriteUrl: finalResult.sprite_url, alt: finalResult.pokemon_name })}
        </div>
        <div>
            <div class="reward-name">${finalResult.pokemon_name}${finalResult.pokemon_form ? ` (${finalResult.pokemon_form})` : ''}</div>
            <div class="reward-meta-row">
                <span class="badge ${rarityClass}">${finalResult.rarity.toUpperCase()}${finalResult.is_shiny ? ' SHINY' : ''}</span>
                ${finalResult.odds ? `<span class="badge badge-uncommon">1 IN ${KatsuCases.formatNumber(finalResult.odds)}</span>` : ''}
                ${finalResult.estimated_value ? `<span class="badge badge-epic">${KatsuCases.formatCurrency(finalResult.estimated_value)}</span>` : ''}
                ${finalResult.seed ? `<span class="badge badge-common">SEED ${finalResult.seed}</span>` : ''}
                ${finalResult.pity?.triggered ? `<span class="badge badge-legendary">${KatsuCases.escapeHtml(finalResult.pity.trigger_label)} PITY</span>` : ''}
                ${isMulti ? `<span class="badge badge-legendary">${results.length} ROLLS · ${KatsuCases.formatCurrency(totalValue)}</span>` : ''}
            </div>
            ${finalResult.seed ? `<div class="opening-seed">Replay seed: ${finalResult.seed}</div>` : ''}
            ${finalResult.pity?.soft_active && !finalResult.pity?.triggered ? `<div class="opening-seed">Soft pity active: ${KatsuCases.escapeHtml(finalResult.pity.soft_label)} boosted ${Number(finalResult.pity.soft_multiplier || 1).toFixed(2)}×</div>` : ''}
            ${isMulti ? `
                <div class="multi-roll-summary">
                    ${results.map((item, index) => `
                        <div class="multi-roll-chip rarity-glow-${item.rarity}">
                            <div class="multi-roll-chip-order">#${index + 1}</div>
                            ${KatsuCases.buildSpriteImg({ pokemonName: item.pokemon_name, isShiny: item.is_shiny, spriteUrl: item.sprite_url, alt: item.pokemon_name, style: 'width:56px; height:56px;' })}
                            <div class="multi-roll-chip-meta">
                                <div class="multi-roll-chip-name">${item.pokemon_name}</div>
                                <div class="multi-roll-chip-value">${KatsuCases.formatCurrency(item.estimated_value || 0)} · 1 in ${KatsuCases.formatNumber(item.odds || 0)}${item.pity?.triggered ? ` · ${KatsuCases.escapeHtml(item.pity.trigger_label)} pity` : ''}</div>
                                ${item.seed ? `<div class="opening-seed">${item.seed}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
        <div class="reward-actions">
            <button class="btn btn-ghost" onclick="KatsuCases.closeModal('opening-modal'); KatsuCases.showToast('Added to inventory', 'success');">
                <i class="ri-check-line"></i> Done
            </button>
            <button class="btn btn-primary" onclick="window.KatsuAnimations.openAnotherCase()">
                <i class="ri-add-line"></i> Open Another x${amount}
            </button>
        </div>
    `;
}

function skipCurrentRoll() {
    if (activeRollTimeline && typeof activeRollTimeline.seek === 'function') {
        setOpeningShellBadge('Fast Forward');
        setOpeningHint('Skipping to the final result…');
        activeRollTimeline.seek(activeRollTimeline.duration || 0);
    }
    if (activeRevealOverlay) {
        clearActiveOverlay();
    }
}

function initCardAnimations() {
    document.querySelectorAll('.case-card, .item-card').forEach((card) => {
        card.addEventListener('mouseenter', () => {
            playAnimation({ targets: card, translateY: -8, duration: 300, easing: 'easeOutQuad' });
        });
        card.addEventListener('mouseleave', () => {
            playAnimation({ targets: card, translateY: 0, duration: 300, easing: 'easeOutQuad' });
        });
    });
}

function animateGridStagger(gridSelector) {
    const items = document.querySelectorAll(gridSelector);
    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        playAnimation({
            targets: item,
            opacity: [0, 1],
            translateY: [20, 0],
            delay: index * 50,
            duration: 400,
            easing: 'easeOutQuad'
        });
    });
}

function initButtonRipples() {
    document.querySelectorAll('.btn').forEach((button) => {
        button.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('span');
            ripple.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:10px; height:10px; background:rgba(255,255,255,0.5); border-radius:50%; transform:translate(-50%, -50%) scale(0); pointer-events:none;`;
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            playAnimation({ targets: ripple, scale: [0, 15], opacity: [1, 0], duration: 600, easing: 'easeOutQuad', complete: () => ripple.remove() });
        });
    });
}

function initGlowAnimations() {
    document.querySelectorAll('.animate-glow').forEach((el) => {
        playAnimation({
            targets: el,
            boxShadow: [
                '0 0 20px rgba(59, 130, 246, 0.3)',
                '0 0 40px rgba(59, 130, 246, 0.5)',
                '0 0 20px rgba(59, 130, 246, 0.3)'
            ],
            duration: 2000,
            loop: true,
            easing: 'easeInOutSine'
        });
    });
}

function initFloatingAnimations() {
    document.querySelectorAll('.animate-float').forEach((el) => {
        playAnimation({ targets: el, translateY: [-10, 10], duration: 3000, loop: true, direction: 'alternate', easing: 'easeInOutSine' });
    });
}

function animatePageIn() {
    playAnimation({ targets: '.main-content', opacity: [0, 1], translateY: [20, 0], duration: 500, easing: 'easeOutQuad' });
}

function animateNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    playAnimation({ targets: notification, translateX: [100, 0], opacity: [0, 1], duration: 300, easing: 'easeOutQuad' });
}

function setOpenAnotherHandler(handler) {
    currentOpenAnotherHandler = typeof handler === 'function' ? handler : null;
}

function openAnotherCase() {
    if (typeof currentOpenAnotherHandler === 'function') {
        currentOpenAnotherHandler();
    } else {
        KatsuCases.closeModal('opening-modal');
    }
}

window.KatsuAnimations = {
    animateCaseOpen,
    setAnimationPool,
    setOpeningHint,
    setOpenAnotherHandler,
    openAnotherCase,
    skipCurrentRoll,
    initCardAnimations,
    animateGridStagger,
    initButtonRipples,
    initGlowAnimations,
    initFloatingAnimations,
    animatePageIn,
    animateNotification,
    createParticles
};
