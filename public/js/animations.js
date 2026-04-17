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
        return { finished: Promise.resolve() };
    }

    let resolveFinished;
    const finished = new Promise((resolve) => { resolveFinished = resolve; });
    const originalComplete = options.complete;

    anime({
        ...options,
        complete: (...args) => {
            if (typeof originalComplete === 'function') originalComplete(...args);
            resolveFinished(...args);
        }
    });

    return { finished };
}

function createTimeline(config = {}) {
    const anime = getAnimeLib();
    if (!anime || typeof anime.timeline !== 'function') {
        return { add() { return this; }, finished: Promise.resolve() };
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

function setAnimationPool(items) {
    caseAnimationPool = Array.isArray(items) ? items.slice() : [];
}

async function animateCaseOpen(results, rollerElement, revealElement) {
    rollerElement.innerHTML = '<div class="roller-center-line"></div>';
    rollerElement.style.opacity = '1';
    revealElement.classList.remove('active');

    const winner = results[results.length - 1];
    const trackData = Array.isArray(winner?.track) && winner.track.length ? winner.track : buildReplayTrack(caseAnimationPool.length ? caseAnimationPool : results, winner);
    const winnerIndex = Math.max(8, trackData.length - 7);

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
    const step = secondRect ? (secondRect.left - firstRect.left) : (firstRect.width + 16);
    const trackPaddingLeft = parseFloat(window.getComputedStyle(track).paddingLeft || '0') || 0;
    const slotWidth = firstRect.width;
    const centerOffset = Math.max(0, (rollerElement.clientWidth / 2) - (slotWidth / 2));
    const targetX = -(winnerIndex * step) - trackPaddingLeft + centerOffset;

    const timeline = createTimeline({ easing: 'easeOutQuart' });
    timeline.add({
        targets: track,
        translateX: [0, targetX],
        duration: 5200,
        easing: 'cubicBezier(.08,.74,.16,1)',
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
        }
    });

    await timeline.finished;

    const winnerSlot = slots[winnerIndex];
    if (winnerSlot) {
        winnerSlot.classList.add('winner');
        await playAnimation({
            targets: winnerSlot,
            scale: [1, 1.08, 1],
            duration: 460,
            easing: 'easeOutElastic(1, .5)'
        }).finished;
    }

    if (winner && ['epic', 'legendary', 'mythical'].includes(winner.rarity)) {
        await showSpecialReveal(winner, revealElement, track);
    } else {
        await new Promise((resolve) => setTimeout(resolve, 320));
        revealElement.classList.add('active');
        updateRevealContent(revealElement, results);
    }

    return winner;
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
        `;
    }
    return slot;
}

async function showSpecialReveal(result, revealElement, rollerTrack) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:1999; opacity:0;';
    document.body.appendChild(overlay);

    await playAnimation({ targets: overlay, opacity: [0, 1], duration: 500, easing: 'easeOutQuad' }).finished;
    rollerTrack.style.opacity = '0';

    revealElement.classList.add('active');
    updateRevealContent(revealElement, [result]);

    const spriteElement = revealElement.querySelector('.reward-sprite');
    if (spriteElement && result.rarity === 'legendary') {
        spriteElement.classList.add('legendary');
        await playAnimation({ targets: spriteElement, scale: [0.5, 1], rotate: [10, 0], duration: 800, easing: 'easeOutElastic(1, .5)' }).finished;
        createParticles(spriteElement, '#fbbf24', 20);
    } else if (spriteElement && result.rarity === 'mythical') {
        spriteElement.classList.add('mythical');
        await playAnimation({ targets: spriteElement, scale: [0.3, 1.2, 1], rotate: [20, -10, 0], duration: 1000, easing: 'easeOutElastic(1, .4)' }).finished;
        createParticles(spriteElement, '#ec4899', 30);
        createParticles(spriteElement, '#8b5cf6', 20);
    } else if (spriteElement) {
        await playAnimation({ targets: spriteElement, scale: [0.5, 1], duration: 600, easing: 'easeOutBack' }).finished;
        createParticles(spriteElement, '#8b5cf6', 15);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await playAnimation({ targets: overlay, opacity: 0, duration: 500 }).finished;
    overlay.remove();
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
    const result = results[results.length - 1];
    const rarityClass = `badge-${result.rarity}`;

    revealElement.innerHTML = `
        <div class="reward-sprite ${result.rarity === 'legendary' || result.rarity === 'mythical' ? result.rarity : ''}">
            ${KatsuCases.buildSpriteImg({ pokemonName: result.pokemon_name, isShiny: result.is_shiny, spriteUrl: result.sprite_url, alt: result.pokemon_name })}
        </div>
        <div>
            <div class="reward-name">${result.pokemon_name}${result.pokemon_form ? ` (${result.pokemon_form})` : ''}</div>
            <div class="reward-meta-row">
                <span class="badge ${rarityClass}">${result.rarity.toUpperCase()}${result.is_shiny ? ' SHINY' : ''}</span>
                ${result.odds ? `<span class="badge badge-uncommon">1 IN ${KatsuCases.formatNumber(result.odds)}</span>` : ''}
                ${result.estimated_value ? `<span class="badge badge-epic">${KatsuCases.formatCurrency(result.estimated_value)}</span>` : ''}
                ${result.seed ? `<span class="badge badge-common">SEED ${result.seed}</span>` : ''}
            </div>
            ${result.seed ? `<div class="opening-seed">Replay seed: ${result.seed}</div>` : ''}
        </div>
        <div class="reward-actions">
            <button class="btn btn-ghost" onclick="KatsuCases.closeModal('opening-modal'); KatsuCases.showToast('Added to inventory', 'success');">
                <i class="ri-check-line"></i> Done
            </button>
            <button class="btn btn-primary" onclick="KatsuCases.closeModal('opening-modal');">
                <i class="ri-add-line"></i> Open Another
            </button>
        </div>
    `;
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

window.KatsuAnimations = {
    animateCaseOpen,
    setAnimationPool,
    initCardAnimations,
    animateGridStagger,
    initButtonRipples,
    initGlowAnimations,
    initFloatingAnimations,
    animatePageIn,
    animateNotification,
    createParticles
};
