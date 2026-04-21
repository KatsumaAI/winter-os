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

function prefersReducedMotion() {
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldUsePerformanceMode() {
    if (prefersReducedMotion()) return true;
    if (typeof window === 'undefined') return false;
    const width = Number(window.innerWidth || 0);
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const cores = Number(nav.hardwareConcurrency || 0);
    const memory = Number(nav.deviceMemory || 0);
    return ((width > 0 && width < 1200) || (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));
}

function getRollProfile() {
    if (shouldUsePerformanceMode()) {
        return { slots: 28, intro: 90, lead: 1680, tension: 320, near: 120, settle: 180, revealPause: 90, epicParticles: 6, legendaryParticles: 9, mythicalParticles: 12, streaks: 6 };
    }
    return { slots: 34, intro: 120, lead: 2200, tension: 430, near: 150, settle: 240, revealPause: 120, epicParticles: 10, legendaryParticles: 14, mythicalParticles: 18, streaks: 9 };
}

function readTranslateX(element) {
    if (!element) return 0;
    const transform = element.style.transform || window.getComputedStyle(element).transform || '';
    if (!transform || transform === 'none') return 0;
    if (typeof DOMMatrixReadOnly !== 'undefined') {
        try {
            return new DOMMatrixReadOnly(transform).m41 || 0;
        } catch (error) {
            // fall through to regex parser
        }
    }
    const matrix3dMatch = transform.match(/matrix3d\(([^)]+)\)/);
    if (matrix3dMatch) {
        const parts = matrix3dMatch[1].split(',').map((value) => Number(value.trim()));
        return Number(parts[12] || 0);
    }
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
        const parts = matrixMatch[1].split(',').map((value) => Number(value.trim()));
        return Number(parts[4] || 0);
    }
    const translateMatch = transform.match(/translate(?:3d|X)?\(([-0-9.px]+)(?:,\s*([-0-9.px]+))?/);
    if (translateMatch) return parseFloat(translateMatch[1]) || 0;
    return 0;
}

function revealIntoView(element) {
    if (!element || typeof element.scrollIntoView !== 'function') return;
    element.scrollIntoView({ behavior: shouldUsePerformanceMode() ? 'auto' : 'smooth', block: 'nearest' });
}

function setOpeningShellBadge(text) {
    const badge = document.getElementById('openingShellBadge');
    if (badge) badge.textContent = text;
}

function clearOpeningImpactClasses() {
    const openingModal = document.getElementById('opening-modal');
    if (!openingModal) return;
    openingModal.classList.remove('rolling', 'lock-tension', 'result-mode', 'impact-epic', 'impact-legendary', 'impact-mythical');
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

function buildReplayTrack(pool, winner, slots = getRollProfile().slots) {
    const source = (Array.isArray(pool) ? pool : []).filter(Boolean);
    if (!source.length && winner) {
        return Array.from({ length: slots }, () => ({ ...winner }));
    }

    const sorted = source.slice().sort((a, b) => {
        const rarityDelta = rarityScore(a) - rarityScore(b);
        if (rarityDelta !== 0) return rarityDelta;
        return (a.estimated_value || 0) - (b.estimated_value || 0);
    });
    const highTier = sorted.slice(-Math.min(sorted.length, 10));
    const midTier = sorted.slice(Math.max(0, sorted.length - Math.min(sorted.length, 20)), Math.max(1, sorted.length - Math.min(sorted.length, 10)));

    const winnerIndex = Math.max(12, slots - 8);
    const track = [];
    for (let index = 0; index < slots; index += 1) {
        if (index === winnerIndex) {
            track.push({ ...winner });
            continue;
        }

        let sourcePool = sorted;
        if (index >= winnerIndex - 5 && index < winnerIndex - 2 && midTier.length) {
            sourcePool = midTier;
        } else if (index >= winnerIndex - 2 && index < winnerIndex && highTier.length) {
            sourcePool = highTier;
        }

        const localIndex = Math.abs((index * 7) + (index * index * 3)) % sourcePool.length;
        const pick = sourcePool[sourcePool.length - 1 - localIndex] || sourcePool[localIndex] || winner;
        track.push({ ...pick });
    }
    return track;
}

function buildDetailedSlotMarkup(result, rarity, isJackpot, isChase) {
    const rarityLabel = String(rarity).toUpperCase();
    const auraLabel = result?.is_shiny
        ? '<i class="ri-sparkling-2-fill"></i><span>Shiny Aura</span>'
        : isJackpot
            ? '<i class="ri-vip-diamond-fill"></i><span>Jackpot Aura</span>'
            : isChase
                ? '<i class="ri-flashlight-fill"></i><span>Chase Aura</span>'
                : '<i class="ri-radio-button-line"></i><span>Standard Aura</span>';
    const signalLabel = isJackpot
        ? '<i class="ri-vip-crown-2-fill"></i><span>Destiny Lock</span>'
        : isChase
            ? '<i class="ri-meteor-fill"></i><span>Surge Hit</span>'
            : '<i class="ri-focus-3-line"></i><span>Lane Stable</span>';
    return `
        <span class="roller-slot-frame"></span>
        <span class="roller-slot-corner corner-a"></span>
        <span class="roller-slot-corner corner-b"></span>
        <span class="roller-slot-corner corner-c"></span>
        <span class="roller-slot-corner corner-d"></span>
        <span class="roller-slot-orb"></span>
        <div class="roller-slot-topbar">
            <span class="roller-slot-tier tier-${rarity}">${rarityLabel}</span>
            <span class="roller-slot-tier-meta">${auraLabel}</span>
        </div>
        <div class="roller-slot-sprite-wrap ${result?.is_shiny ? 'shiny' : ''}">
            <span class="roller-slot-sprite-ring ring-a"></span>
            <span class="roller-slot-sprite-ring ring-b"></span>
            ${result?.is_shiny ? '<span class="roller-slot-shiny-flare"></span>' : ''}
            ${KatsuCases.buildSpriteImg({ pokemonName: result?.pokemon_name, isShiny: result?.is_shiny, spriteUrl: result?.sprite_url, alt: result?.pokemon_name })}
        </div>
        <span class="roller-slot-name">${result?.pokemon_name || 'Unknown Pull'}</span>
        <div class="roller-slot-footer">
            <span class="roller-slot-value">${KatsuCases.formatCurrency(result?.estimated_value || 0)}</span>
            ${result?.odds ? `<span class="roller-slot-odds">1 in ${KatsuCases.formatNumber(result.odds)}</span>` : ''}
        </div>
        <div class="roller-slot-signal-row">
            <span class="roller-slot-signal">${signalLabel}</span>
        </div>
        <span class="roller-slot-lane"></span>
    `;
}

function buildMysterySlotMarkup() {
    return `
        <span class="roller-slot-frame"></span>
        <span class="roller-slot-corner corner-a"></span>
        <span class="roller-slot-corner corner-b"></span>
        <span class="roller-slot-corner corner-c"></span>
        <span class="roller-slot-corner corner-d"></span>
        <span class="roller-slot-orb"></span>
        <div class="roller-slot-mask">
            <span class="roller-slot-mask-badge">Mystery Drop</span>
            <div class="roller-slot-mask-icon"><i class="ri-question-line"></i></div>
            <div class="roller-slot-mask-copy">Hidden until lock</div>
            <div class="roller-slot-mask-sub">Provably fair sealed result</div>
        </div>
        <span class="roller-slot-lane"></span>
    `;
}

function createSlotElement(result, isPlaceholder = false, isWinner = false) {
    const slot = document.createElement('div');
    const rarity = result?.rarity || 'common';
    const oddsValue = Number(result?.odds || 0);
    const isJackpot = ['legendary', 'mythical'].includes(rarity) || oddsValue >= 1000000;
    const isChase = rarity === 'epic' || oddsValue >= 100000;
    const accentMap = {
        common: { accent: '#94a3b8', accentSoft: 'rgba(148,163,184,0.18)', accentGlow: 'rgba(148,163,184,0.24)' },
        uncommon: { accent: '#34d399', accentSoft: 'rgba(16,185,129,0.18)', accentGlow: 'rgba(16,185,129,0.28)' },
        rare: { accent: '#60a5fa', accentSoft: 'rgba(59,130,246,0.18)', accentGlow: 'rgba(59,130,246,0.28)' },
        epic: { accent: '#a78bfa', accentSoft: 'rgba(139,92,246,0.18)', accentGlow: 'rgba(139,92,246,0.32)' },
        legendary: { accent: '#fbbf24', accentSoft: 'rgba(251,191,36,0.18)', accentGlow: 'rgba(251,191,36,0.34)' },
        mythical: { accent: '#f472b6', accentSoft: 'rgba(236,72,153,0.18)', accentGlow: 'rgba(236,72,153,0.38)' }
    };
    const palette = accentMap[rarity] || accentMap.common;
    slot.className = `roller-slot rarity-glow-${rarity}${isPlaceholder ? ' roller-slot-placeholder' : ''}${isWinner ? ' winner' : ''}${result?.is_shiny ? ' is-shiny' : ''}${isJackpot ? ' is-jackpot' : ''}${isChase ? ' is-chase' : ''} is-masked`;
    slot.style.setProperty('--slot-accent', palette.accent);
    slot.style.setProperty('--slot-accent-soft', palette.accentSoft);
    slot.style.setProperty('--slot-accent-glow', palette.accentGlow);
    slot.dataset.rarity = rarity;
    slot.innerHTML = isPlaceholder ? '<span class="roller-slot-placeholder">?</span>' : buildMysterySlotMarkup();
    return slot;
}

async function revealWinningSlot(slot, result) {
    if (!slot || !result) return;
    const rarity = result?.rarity || 'common';
    const rarityLabel = String(rarity || 'Result').toUpperCase();
    slot.classList.add('revealing');
    await playAnimation({ targets: slot, scale: [1, 1.02, 1], duration: 280, easing: 'easeOutQuad' }).finished;
    const badge = slot.querySelector('.roller-slot-mask-badge');
    const icon = slot.querySelector('.roller-slot-mask-icon i');
    const copy = slot.querySelector('.roller-slot-mask-copy');
    const sub = slot.querySelector('.roller-slot-mask-sub');
    if (badge) badge.textContent = `${rarityLabel} locked`;
    if (icon) icon.className = 'ri-lock-2-line';
    if (copy) copy.textContent = 'Result confirmed';
    if (sub) sub.textContent = 'Full details revealed above the reel';
    slot.classList.add('winner-locked');
    await playAnimation({ targets: slot, scale: [1, 1.045, 1], duration: 320, easing: 'easeOutBack' }).finished;
    slot.classList.remove('revealing');
}

function getWinnerIndex(trackLength) {
    return Math.max(12, trackLength - 8);
}

function clearActiveOverlay() {
    if (activeRevealOverlay && activeRevealOverlay.remove) {
        activeRevealOverlay.remove();
    }
    activeRevealOverlay = null;
}


function toggleResultMode(isActive) {
    const openingModal = document.getElementById('opening-modal');
    if (!openingModal) return;
    openingModal.classList.toggle('result-mode', Boolean(isActive));
}

function setLockTension(isActive) {
    const openingModal = document.getElementById('opening-modal');
    if (!openingModal) return;
    openingModal.classList.toggle('lock-tension', Boolean(isActive));
}

function markNearMissSlots(slots, winnerIndex) {
    slots.forEach((slot) => slot.classList.remove('near-miss'));
    [winnerIndex - 1, winnerIndex + 1].forEach((idx) => {
        if (slots[idx]) slots[idx].classList.add('near-miss');
    });
}


async function animateCaseOpen(results, rollerElement, revealElement) {
    const rollProfile = getRollProfile();
    rollerElement.innerHTML = '';
    rollerElement.style.opacity = '1';
    revealElement.classList.remove('active');
    revealElement.innerHTML = '';
    clearOpeningImpactClasses();
    toggleResultMode(false);
    const openingModal = document.getElementById('opening-modal');
    if (openingModal) {
        openingModal.classList.add('rolling');
        openingModal.classList.remove('rarity-epic', 'rarity-legendary', 'rarity-mythical', 'rarity-rare', 'rarity-uncommon', 'rarity-common');
        openingModal.classList.toggle('perf-mode', shouldUsePerformanceMode());
    }
    setOpeningShellBadge('Mystery Reel Armed');
    setOpeningHint('Sealing the cards and staging the hidden pull…');

    const winner = results[results.length - 1];
    const trackData = Array.isArray(winner?.track) && winner.track.length
        ? winner.track
        : buildReplayTrack(caseAnimationPool.length ? caseAnimationPool : results, winner, rollProfile.slots);
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
    const preLockX = targetX - (step * 2.05);
    const nearMissX = targetX - (step * 0.56);
    const overshootX = targetX + Math.min(12, step * 0.08);
    const settleX = targetX - 4;
    let highlightedIndex = -1;

    const updateClosestSlot = () => {
        const currentX = readTranslateX(track);
        const rawIndex = Math.round((centerOffset - trackPaddingLeft - currentX) / step);
        const closestIndex = Math.max(0, Math.min(slots.length - 1, rawIndex));
        if (closestIndex === highlightedIndex) return;
        if (highlightedIndex >= 0 && slots[highlightedIndex]) slots[highlightedIndex].classList.remove('highlight');
        if (slots[closestIndex]) slots[closestIndex].classList.add('highlight');
        highlightedIndex = closestIndex;
    };

    timeline.add({
        targets: track,
        scale: [0.992, 1],
        duration: rollProfile.intro,
        easing: 'easeOutQuad'
    }).add({
        targets: track,
        translateX: [0, preLockX],
        duration: rollProfile.lead,
        easing: 'cubicBezier(.1,.76,.16,1)',
        update: updateClosestSlot,
        begin() {
            setOpeningShellBadge('Mystery Reel Live');
            setOpeningHint('Rolling sealed cards through the center lock…');
        }
    }).add({
        targets: track,
        translateX: [preLockX, nearMissX],
        duration: rollProfile.tension,
        easing: 'easeOutCubic',
        update: updateClosestSlot,
        begin() {
            setLockTension(true);
            setOpeningShellBadge('Lock Tension');
            setOpeningHint('The reel is tightening. The hidden result is approaching the lock point.');
        },
        complete() {
            markNearMissSlots(slots, winnerIndex);
        }
    }).add({
        targets: track,
        translateX: [nearMissX, overshootX],
        duration: rollProfile.near,
        easing: 'easeInOutSine',
        update: updateClosestSlot,
        begin() {
            setOpeningShellBadge('Near Miss');
            setOpeningHint('A sealed card clipped the lock. Final snap is lining up now.');
        }
    }).add({
        targets: track,
        translateX: [overshootX, settleX, targetX],
        duration: rollProfile.settle,
        easing: 'easeOutExpo',
        update: updateClosestSlot,
        begin() {
            setOpeningShellBadge('Center Lock');
            setOpeningHint('Center lock engaged. Revealing the sealed pull next.');
        },
        complete() {
            setLockTension(false);
            slots.forEach((slot) => slot.classList.remove('near-miss'));
        }
    });

    try {
        await timeline.finished;
    } finally {
        activeRollTimeline = null;
    }

    const winnerSlot = slots[winnerIndex];
    setLockTension(false);
    setOpeningShellBadge('Result Locked');
    setOpeningHint('Lock engaged. Revealing the hidden pull…');
    triggerOpeningImpact(winner?.rarity);
    if (openingModal && winner?.rarity) openingModal.classList.add(`rarity-${winner.rarity}`);
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
        await revealWinningSlot(winnerSlot, winner);
    }

    if (winner && ['epic', 'legendary', 'mythical'].includes(winner.rarity)) {
        await showSpecialReveal(winner, revealElement, track, results);
    } else {
        await new Promise((resolve) => setTimeout(resolve, getRollProfile().revealPause));
        revealElement.classList.add('active');
        toggleResultMode(true);
        updateRevealContent(revealElement, results);
        revealIntoView(revealElement);
        setOpeningShellBadge('Result Confirmed');
        setOpeningHint('Result locked. Replay-ready and added to inventory.');
    }

    if (openingModal) openingModal.classList.remove('rolling');
    return winner;
}

function getSpecialRevealConfig(result) {
    const rarity = result?.rarity || 'epic';
    const configs = {
        epic: {
            title: 'Aura Surge',
            kicker: 'High signal detected',
            accent: '#8b5cf6',
            accentSecondary: '#60a5fa',
            subtitle: 'The lane surged and forced a featured reveal.'
        },
        legendary: {
            title: 'Destiny Lock',
            kicker: 'Golden lock achieved',
            accent: '#fbbf24',
            accentSecondary: '#fb7185',
            subtitle: 'The chamber hit jackpot and forced a full-screen lock.'
        },
        mythical: {
            title: 'Sovereign Roll',
            kicker: 'Singularity breach',
            accent: '#ec4899',
            accentSecondary: '#8b5cf6',
            subtitle: 'A mythical-tier pull ripped through the lane and overruled the chamber.'
        }
    };
    return configs[rarity] || configs.epic;
}

function createStreakParticles(container, colors = ['#f8fafc'], count = 14) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const perfMode = shouldUsePerformanceMode();
    const streakCount = Math.max(0, perfMode ? Math.ceil(count * 0.65) : count);

    for (let i = 0; i < streakCount; i += 1) {
        const streak = document.createElement('div');
        const color = colors[i % colors.length];
        const angle = -70 + Math.random() * 140;
        const length = (perfMode ? 60 : 80) + Math.random() * (perfMode ? 80 : 120);
        streak.className = 'special-reveal-streak';
        streak.style.left = `${centerX}px`;
        streak.style.top = `${centerY}px`;
        streak.style.background = `linear-gradient(90deg, ${color}, rgba(255,255,255,0))`;
        streak.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        document.body.appendChild(streak);

        playAnimation({
            targets: streak,
            translateX: [0, Math.cos(angle * Math.PI / 180) * length],
            translateY: [0, Math.sin(angle * Math.PI / 180) * length],
            opacity: [0, 1, 0],
            scaleX: [0.15, 1, 0.9],
            duration: (perfMode ? 520 : 700) + Math.random() * (perfMode ? 180 : 240),
            easing: 'easeOutExpo',
            complete: () => streak.remove()
        });
    }
}

async function showSpecialReveal(result, revealElement, rollerTrack, allResults = [result]) {
    clearActiveOverlay();
    const config = getSpecialRevealConfig(result);
    const safeName = KatsuCases.escapeHtml(result?.pokemon_name || 'Unknown Pull');
    const metaLine = [
        result?.odds ? `1 in ${KatsuCases.formatNumber(result.odds)}` : null,
        result?.estimated_value ? KatsuCases.formatCurrency(result.estimated_value) : null,
        result?.is_shiny ? 'Shiny' : null
    ].filter(Boolean).join(' · ');
    const overlay = document.createElement('div');
    overlay.className = `special-reveal-overlay rarity-${result?.rarity || 'epic'}`;
    overlay.innerHTML = `
        <div class="special-reveal-noise"></div>
        <div class="special-reveal-vignette"></div>
        <div class="special-reveal-beam beam-left"></div>
        <div class="special-reveal-beam beam-right"></div>
        <div class="special-reveal-ring ring-one"></div>
        <div class="special-reveal-ring ring-two"></div>
        <div class="special-reveal-copy">
            <div class="special-reveal-kicker">${config.kicker}</div>
            <div class="special-reveal-title">${config.title}</div>
            <div class="special-reveal-name">${safeName}${result?.pokemon_form ? ` <span>${KatsuCases.escapeHtml(result.pokemon_form)}</span>` : ''}</div>
            <div class="special-reveal-meta">${metaLine || config.subtitle}</div>
        </div>
    `;
    overlay.style.setProperty('--special-accent', config.accent);
    overlay.style.setProperty('--special-accent-secondary', config.accentSecondary);
    activeRevealOverlay = overlay;
    document.body.appendChild(overlay);

    setOpeningShellBadge(config.title);
    setOpeningHint(config.subtitle);
    await playAnimation({ targets: overlay, opacity: [0, 1], duration: 220, easing: 'easeOutQuad' }).finished;

    const copy = overlay.querySelector('.special-reveal-copy');
    const title = overlay.querySelector('.special-reveal-title');
    playAnimation({ targets: overlay.querySelectorAll('.special-reveal-ring'), scale: [0.72, 1.24], opacity: [0, 1, 0], duration: 900, delay: (_, i) => i * 90, easing: 'easeOutExpo' });
    playAnimation({ targets: overlay.querySelectorAll('.special-reveal-beam'), opacity: [0, 0.9, 0], translateX: (el, i) => i === 0 ? [-20, 30] : [20, -30], duration: 920, easing: 'easeOutExpo' });
    await playAnimation({ targets: copy, scale: [0.82, 1.02, 1], translateY: [32, 0], opacity: [0, 1], duration: 680, easing: 'easeOutExpo' }).finished;
    playAnimation({ targets: title, letterSpacing: ['0.22em', '0.08em'], duration: 620, easing: 'easeOutQuad' });

    rollerTrack.style.opacity = '0.04';
    rollerTrack.style.filter = 'blur(5px) saturate(1.3)';
    const revealProfile = getRollProfile();
    const overlayStreaks = result?.rarity === 'mythical' ? revealProfile.streaks + 4 : revealProfile.streaks;
    const overlayParticles = result?.rarity === 'mythical' ? revealProfile.mythicalParticles : result?.rarity === 'legendary' ? revealProfile.legendaryParticles : revealProfile.epicParticles;
    createStreakParticles(overlay, [config.accent, config.accentSecondary, '#ffffff'], overlayStreaks);
    createParticles(overlay, config.accent, overlayParticles);

    await new Promise((resolve) => setTimeout(resolve, result?.rarity === 'mythical' ? 420 : 300));

    revealElement.classList.add('active');
    toggleResultMode(true);
    updateRevealContent(revealElement, Array.isArray(allResults) && allResults.length ? allResults : [result]);
    revealIntoView(revealElement);

    const spriteElement = revealElement.querySelector('.reward-sprite');
    if (spriteElement && result.rarity === 'legendary') {
        spriteElement.classList.add('legendary');
        await playAnimation({ targets: spriteElement, scale: [0.66, 1.08, 1], rotate: [10, -2, 0], duration: 980, easing: 'easeOutElastic(1, .48)' }).finished;
        createParticles(spriteElement, '#fbbf24', getRollProfile().legendaryParticles + 4);
    } else if (spriteElement && result.rarity === 'mythical') {
        spriteElement.classList.add('mythical');
        await playAnimation({ targets: spriteElement, scale: [0.5, 1.16, 1], rotate: [16, -6, 0], duration: 1120, easing: 'easeOutElastic(1, .4)' }).finished;
        createParticles(spriteElement, '#ec4899', getRollProfile().mythicalParticles + 6);
        createParticles(spriteElement, '#8b5cf6', getRollProfile().legendaryParticles);
        createStreakParticles(spriteElement, ['#ec4899', '#8b5cf6', '#ffffff'], getRollProfile().streaks + 2);
    } else if (spriteElement) {
        spriteElement.classList.add('epic');
        await playAnimation({ targets: spriteElement, scale: [0.68, 1.04, 1], duration: 760, easing: 'easeOutBack' }).finished;
        createParticles(spriteElement, '#8b5cf6', getRollProfile().epicParticles + 2);
    }

    await new Promise((resolve) => setTimeout(resolve, 520));
    setOpeningShellBadge('Result Confirmed');
    setOpeningHint('Result locked. Replay-ready and added to inventory.');
    await playAnimation({ targets: copy, opacity: [1, 0], translateY: [0, -18], duration: 280, easing: 'easeInQuad' }).finished;
    await playAnimation({ targets: overlay, opacity: 0, duration: 300, easing: 'easeOutQuad' }).finished;
    clearActiveOverlay();
    rollerTrack.style.opacity = '1';
    rollerTrack.style.filter = '';
}

function createParticles(container, color, count) {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const perfMode = shouldUsePerformanceMode();
    const particleCount = Math.max(0, perfMode ? Math.ceil(count * 0.7) : count);

    for (let i = 0; i < particleCount; i += 1) {
        const particle = document.createElement('div');
        const size = perfMode ? 6 : 8;
        particle.style.cssText = `position:fixed; left:${centerX}px; top:${centerY}px; width:${size}px; height:${size}px; background:${color}; border-radius:50%; pointer-events:none; z-index:2000;`;
        document.body.appendChild(particle);

        const angle = (Math.PI * 2 / Math.max(1, particleCount)) * i;
        const distance = (perfMode ? 80 : 100) + Math.random() * (perfMode ? 70 : 100);
        playAnimation({
            targets: particle,
            translateX: Math.cos(angle) * distance,
            translateY: Math.sin(angle) * distance,
            opacity: [1, 0],
            scale: [1, 0],
            duration: (perfMode ? 760 : 1000) + Math.random() * (perfMode ? 240 : 500),
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
    const headingMap = { common: 'Result', uncommon: 'Result', rare: 'Rare Pull', epic: 'Featured Pull', legendary: 'Jackpot Pull', mythical: 'Sovereign Pull' };
    const amount = Math.max(1, Number(window.currentOpeningAmount || results.length || 1));
    revealElement.dataset.rarity = finalResult.rarity || 'common';

    revealElement.innerHTML = `
        <div class="reward-panel reward-panel-${finalResult.rarity}">
            <div class="reward-heading-wrap">
                <div class="reward-heading-kicker">${headingMap[finalResult.rarity] || 'Result'}</div>
                <div class="reward-rarity-banner">${finalResult.rarity.toUpperCase()}${finalResult.is_shiny ? ' · SHINY' : ''}</div>
                <div class="reward-heading-sub">Locked to inventory and revealed above the reel.</div>
            </div>
            <div class="reward-primary-row">
                <div class="reward-sprite ${finalResult.rarity === 'legendary' || finalResult.rarity === 'mythical' || finalResult.rarity === 'epic' ? finalResult.rarity : ''}">
                    ${KatsuCases.buildSpriteImg({ pokemonName: finalResult.pokemon_name, isShiny: finalResult.is_shiny, spriteUrl: finalResult.sprite_url, alt: finalResult.pokemon_name })}
                </div>
                <div class="reward-copy-block">
                    <div class="reward-name">${finalResult.pokemon_name}${finalResult.pokemon_form ? ` (${finalResult.pokemon_form})` : ''}</div>
                    <div class="reward-meta-row">
                        <span class="badge ${rarityClass}">${finalResult.rarity.toUpperCase()}${finalResult.is_shiny ? ' SHINY' : ''}</span>
                        ${finalResult.odds ? `<span class="badge badge-uncommon">1 IN ${KatsuCases.formatNumber(finalResult.odds)}</span>` : ''}
                        ${finalResult.estimated_value ? `<span class="badge badge-epic">${KatsuCases.formatCurrency(finalResult.estimated_value)}</span>` : ''}
                        ${finalResult.pity?.triggered ? `<span class="badge badge-legendary">${KatsuCases.escapeHtml(finalResult.pity.trigger_label)} PITY</span>` : ''}
                        ${isMulti ? `<span class="badge badge-legendary">${results.length} ROLLS · ${KatsuCases.formatCurrency(totalValue)}</span>` : ''}
                    </div>
                    ${finalResult.seed ? `<div class="opening-seed">Replay seed: ${finalResult.seed}</div>` : ''}
                    ${finalResult.pity?.soft_active && !finalResult.pity?.triggered ? `<div class="opening-seed">Soft pity active: ${KatsuCases.escapeHtml(finalResult.pity.soft_label)} boosted ${Number(finalResult.pity.soft_multiplier || 1).toFixed(2)}×</div>` : ''}
                </div>
            </div>
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
            <div class="reward-actions">
                <button class="btn btn-ghost" onclick="KatsuCases.closeModal('opening-modal'); KatsuCases.showToast('Added to inventory', 'success');">
                    <i class="ri-check-line"></i> Done
                </button>
                <button class="btn btn-primary" onclick="window.KatsuAnimations.openAnotherCase()">
                    <i class="ri-add-line"></i> Open Another x${amount}
                </button>
            </div>
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
