/* KatsuCases - Page-Specific Styles */

/* ============================================
   HERO SECTION
   ============================================ */

.hero {
    position: relative;
    padding: var(--space-3xl) 0;
    overflow: hidden;
}

.hero-bg {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at top center, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at bottom right, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
    pointer-events: none;
}

.hero-content {
    position: relative;
    text-align: center;
    max-width: 800px;
    margin: 0 auto;
}

.hero-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-lg);
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 30px;
    margin-bottom: var(--space-xl);
    font-size: 14px;
    color: var(--accent-primary);
}

.hero-badge .live-dot {
    background: var(--success);
}

.hero h1 {
    margin-bottom: var(--space-lg);
    line-height: 1.1;
}

.hero-subtitle {
    font-size: 20px;
    color: var(--text-secondary);
    margin-bottom: var(--space-xl);
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
}

.hero-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
}

.hero-trust {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xl);
    color: var(--text-muted);
    font-size: 14px;
}

.hero-trust-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.hero-trust-item i {
    color: var(--rarity-legendary);
}

/* ============================================
   FEATURED SECTION
   ============================================ */

.featured-cases {
    padding: var(--space-2xl) 0;
}

.featured-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-xl);
}

.featured-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-lg);
}

/* ============================================
   LIVE PULLS STRIP
   ============================================ */

.live-strip {
    background: var(--bg-secondary);
    padding: var(--space-lg) 0;
    overflow: hidden;
}

.live-strip-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
    font-weight: 600;
}

.live-strip-track {
    display: flex;
    gap: var(--space-md);
    animation: scroll 30s linear infinite;
}

.live-strip-item {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 14px;
    white-space: nowrap;
}

.live-strip-item img {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
}

@keyframes scroll {
    0% {
        transform: translateX(0);
    }
    100% {
        transform: translateX(-50%);
    }
}

/* ============================================
   RARITY EXPLANATION
   ============================================ */

.rarity-section {
    padding: var(--space-3xl) 0;
}

.rarity-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--space-md);
}

.rarity-card {
    text-align: center;
    padding: var(--space-xl);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    transition: all var(--transition-base);
}

.rarity-card:hover {
    transform: translateY(-4px);
}

.rarity-icon {
    width: 60px;
    height: 60px;
    margin: 0 auto var(--space-md);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 24px;
}

.rarity-card.common .rarity-icon { background: rgba(156, 163, 175, 0.2); color: var(--rarity-common); }
.rarity-card.uncommon .rarity-icon { background: rgba(16, 185, 129, 0.2); color: var(--rarity-uncommon); }
.rarity-card.rare .rarity-icon { background: rgba(59, 130, 246, 0.2); color: var(--rarity-rare); }
.rarity-card.epic .rarity-icon { background: rgba(139, 92, 246, 0.2); color: var(--rarity-epic); }
.rarity-card.legendary .rarity-icon { background: rgba(251, 191, 36, 0.2); color: var(--rarity-legendary); }
.rarity-card.mythical .rarity-icon { background: rgba(236, 72, 153, 0.2); color: var(--rarity-mythical); }

.rarity-name {
    font-weight: 600;
    margin-bottom: var(--space-xs);
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 1px;
}

.rarity-odds {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
}

@media (max-width: 992px) {
    .rarity-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 576px) {
    .rarity-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* ============================================
   STATS SECTION
   ============================================ */

.stats-section {
    padding: var(--space-2xl) 0;
    background: var(--bg-secondary);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-xl);
}

.stat-card {
    text-align: center;
}

.stat-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--space-md);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.1);
    border-radius: var(--radius-md);
    color: var(--accent-primary);
}

.stat-value {
    font-family: var(--font-mono);
    font-size: 32px;
    font-weight: 700;
    margin-bottom: var(--space-xs);
}

.stat-label {
    color: var(--text-muted);
    font-size: 14px;
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* ============================================
   HOW IT WORKS
   ============================================ */

.how-it-works {
    padding: var(--space-3xl) 0;
}

.steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-xl);
}

.step-card {
    position: relative;
    text-align: center;
    padding: var(--space-xl);
}

.step-number {
    width: 48px;
    height: 48px;
    margin: 0 auto var(--space-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-primary);
    color: white;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    border-radius: 50%;
}

.step-title {
    font-size: 20px;
    margin-bottom: var(--space-sm);
}

.step-description {
    color: var(--text-secondary);
    font-size: 14px;
}

@media (max-width: 768px) {
    .steps-grid {
        grid-template-columns: 1fr;
    }
}

/* ============================================
   TESTIMONIALS
   ============================================ */

.testimonials {
    padding: var(--space-3xl) 0;
    background: var(--bg-secondary);
}

.testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-lg);
}

.testimonial-card {
    padding: var(--space-xl);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
}

.testimonial-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
}

.testimonial-avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
}

.testimonial-info h4 {
    margin-bottom: var(--space-xs);
}

.testimonial-location {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 14px;
    color: var(--text-muted);
}

.testimonial-stars {
    display: flex;
    gap: 2px;
    color: var(--rarity-legendary);
    margin-bottom: var(--space-md);
}

.testimonial-text {
    color: var(--text-secondary);
    font-style: italic;
    line-height: 1.7;
}

.testimonial-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    margin-top: var(--space-md);
    padding: var(--space-xs) var(--space-sm);
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid var(--success);
    border-radius: var(--radius-sm);
    color: var(--success);
    font-size: 12px;
}

@media (max-width: 992px) {
    .testimonials-grid {
        grid-template-columns: 1fr;
    }
}

/* ============================================
   FAQ ACCORDION
   ============================================ */

.faq-list {
    max-width: 800px;
    margin: 0 auto;
}

.faq-item {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-md);
    overflow: hidden;
}

.faq-question {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg);
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 16px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.faq-question:hover {
    background: var(--bg-hover);
}

.faq-question i {
    color: var(--accent-primary);
    transition: transform var(--transition-fast);
}

.faq-item.active .faq-question i {
    transform: rotate(180deg);
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height var(--transition-base);
}

.faq-item.active .faq-answer {
    max-height: 500px;
}

.faq-answer-inner {
    padding: 0 var(--space-lg) var(--space-lg);
    color: var(--text-secondary);
    line-height: 1.7;
}

/* ============================================
   CASES PAGE
   ============================================ */

.cases-hero {
    padding: var(--space-2xl) 0;
    text-align: center;
}

.cases-filters {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-xl);
    flex-wrap: wrap;
    gap: var(--space-md);
}

.cases-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-lg);
}

@media (max-width: 1200px) {
    .cases-grid {
        grid-template-columns: repeat(3, 1fr);
    }
    
    .featured-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 992px) {
    .cases-grid,
    .featured-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .cases-grid,
    .featured-grid {
        grid-template-columns: 1fr;
    }
}

/* ============================================
   CASE OPENING MODAL
   ============================================ */

.opening-modal {
    background:
        radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 28%),
        radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.18), transparent 24%),
        rgba(2, 6, 23, 0.94);
    backdrop-filter: blur(14px);
}

.opening-modal .modal {
    width: min(96vw, 1560px);
    max-width: none;
    max-height: 94vh;
    background: linear-gradient(180deg, rgba(13, 20, 40, 0.96), rgba(8, 13, 28, 0.98));
    border: 1px solid rgba(80, 101, 161, 0.2);
    border-radius: 28px;
    box-shadow: 0 32px 120px rgba(0, 0, 0, 0.55);
}

.opening-modal-shell {
    overflow: hidden;
}

.opening-chrome {
    position: relative;
    min-height: 82vh;
    display: flex;
    flex-direction: column;
}

.opening-chrome::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.02), transparent 18%),
        radial-gradient(circle at 20% 0%, rgba(59,130,246,0.12), transparent 25%),
        radial-gradient(circle at 80% 0%, rgba(139,92,246,0.12), transparent 25%);
    pointer-events: none;
}

.opening-topbar {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: center;
    padding: 26px 28px 20px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.opening-back-btn,
.opening-top-icon,
.opening-top-pill {
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(15, 23, 42, 0.58);
    color: var(--text-primary);
    border-radius: 16px;
    min-height: 52px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 0 18px;
    backdrop-filter: blur(10px);
}

.opening-back-btn,
.opening-top-icon {
    cursor: pointer;
}

.opening-top-icon {
    width: 52px;
    justify-content: center;
    padding: 0;
    font-size: 20px;
}

.opening-top-pill {
    font-weight: 600;
    color: #b8cdfc;
}

.opening-topbar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.opening-title-wrap {
    text-align: center;
}

.opening-title-eyebrow {
    font-size: 12px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
}

.opening-title {
    font-size: clamp(28px, 3vw, 44px);
    margin: 0;
}

.opening-subtitle {
    margin-top: 8px;
    color: var(--text-secondary);
    font-size: 14px;
}

.opening-stage {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 26px;
    padding: 18px 28px 24px;
    overflow: hidden;
}

.opening-stage-copy {
    text-align: center;
    display: grid;
    gap: 14px;
}

.opening-mode-rail {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
}

.opening-mode-segment,
.case-preview-roll-select {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px;
    border-radius: 18px;
    background: rgba(10, 15, 30, 0.82);
    border: 1px solid rgba(129, 140, 248, 0.14);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.opening-mode-btn,
.case-preview-roll-btn {
    min-width: 78px;
    min-height: 42px;
    border: 1px solid transparent;
    border-radius: 14px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.case-preview-roll-btn {
    min-width: 54px;
}

.opening-mode-btn:hover,
.opening-mode-btn.active,
.case-preview-roll-btn:hover,
.case-preview-roll-btn.active {
    color: #ffffff;
    border-color: rgba(129, 140, 248, 0.34);
    background: linear-gradient(180deg, rgba(79, 70, 229, 0.32), rgba(37, 99, 235, 0.18));
    box-shadow: 0 12px 24px rgba(30, 64, 175, 0.22);
}

.opening-live-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}

.opening-live-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(15, 23, 42, 0.64);
    color: #dbeafe;
    font-size: 12px;
    font-weight: 700;
}

.opening-stage-kicker {
    font-size: 12px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #90b4ff;
    margin-bottom: 10px;
}

.opening-stage-hint {
    color: var(--text-secondary);
    font-size: 15px;
}

.opening-roller-shell {
    position: relative;
    padding: 84px 0 96px;
    border-radius: 30px;
    background:
        radial-gradient(circle at 50% 18%, rgba(96, 165, 250, 0.22), transparent 28%),
        radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.14), transparent 30%),
        radial-gradient(circle at 82% 16%, rgba(168, 85, 247, 0.18), transparent 24%),
        linear-gradient(180deg, rgba(13, 19, 36, 0.96), rgba(6, 10, 24, 0.98));
    border: 1px solid rgba(255,255,255,0.06);
    overflow: hidden;
    min-height: 430px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 100px rgba(0, 0, 0, 0.36);
    isolation: isolate;
}

.opening-roller-shell::before {
    content: '';
    position: absolute;
    inset: 14px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.04);
    pointer-events: none;
}

.opening-shell-beam,
.opening-shell-scanline,
.opening-shell-badge {
    position: absolute;
    pointer-events: none;
    z-index: 1;
}

.opening-shell-beam {
    top: -18%;
    bottom: -18%;
    width: 160px;
    filter: blur(36px);
    opacity: 0.2;
}

.opening-shell-beam.beam-left {
    left: 10%;
    transform: rotate(22deg);
    background: linear-gradient(180deg, rgba(59, 130, 246, 0), rgba(59, 130, 246, 0.9), rgba(59, 130, 246, 0));
}

.opening-shell-beam.beam-right {
    right: 10%;
    transform: rotate(-20deg);
    background: linear-gradient(180deg, rgba(168, 85, 247, 0), rgba(168, 85, 247, 0.9), rgba(168, 85, 247, 0));
}

.opening-shell-scanline {
    inset: auto 18px 22px 18px;
    height: 2px;
    background: linear-gradient(90deg, rgba(255,255,255,0), rgba(147, 197, 253, 0.9), rgba(255,255,255,0));
    box-shadow: 0 0 26px rgba(96, 165, 250, 0.44);
    opacity: 0.5;
}

.opening-shell-badge {
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(6, 11, 24, 0.82);
    border: 1px solid rgba(129, 140, 248, 0.18);
    color: #c7d2fe;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}

.opening-shell-glow {
    position: absolute;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.28;
    pointer-events: none;
    animation: openingGlowPulse 4.2s ease-in-out infinite;
}

.opening-shell-glow.glow-left {
    left: -70px;
    top: 20px;
    background: rgba(59, 130, 246, 0.78);
}

.opening-shell-glow.glow-right {
    right: -60px;
    top: 10px;
    background: rgba(139, 92, 246, 0.74);
}

.opening-roller {
    position: relative;
    height: 246px;
    overflow: hidden;
    border-radius: 24px;
    z-index: 2;
}

.roller-fade {
    position: absolute;
    top: 0;
    bottom: 0;
    width: min(18vw, 260px);
    z-index: 2;
    pointer-events: none;
}

.roller-fade.left {
    left: 0;
    background: linear-gradient(90deg, rgba(7, 11, 24, 0.98), rgba(7, 11, 24, 0));
}

.roller-fade.right {
    right: 0;
    background: linear-gradient(270deg, rgba(7, 11, 24, 0.98), rgba(7, 11, 24, 0));
}

.roller-track {
    display: flex;
    align-items: stretch;
    height: 100%;
    padding: 0 160px;
    gap: 18px;
    will-change: transform;
    filter: drop-shadow(0 16px 24px rgba(0,0,0,0.24));
}

.roller-center-line {
    position: absolute;
    top: 26px;
    bottom: 26px;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    background: linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.9), rgba(255,255,255,0));
    box-shadow: 0 0 22px rgba(255,255,255,0.5);
    z-index: 4;
    pointer-events: none;
}

.roller-pointer {
    position: absolute;
    top: 18px;
    left: 50%;
    width: 34px;
    height: 34px;
    transform: translateX(-50%) rotate(45deg);
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(125, 211, 252, 1), rgba(59, 130, 246, 1));
    box-shadow: 0 0 36px rgba(59, 130, 246, 0.5);
    z-index: 5;
    animation: pointerPulse 1.5s ease-in-out infinite;
}

.roller-pointer::after {
    content: '';
    position: absolute;
    inset: 7px;
    border-radius: 7px;
    background: rgba(255,255,255,0.22);
}

.roller-slot {
    position: relative;
    flex-shrink: 0;
    width: 150px;
    height: 100%;
    padding: 18px 16px 16px;
    border-radius: 24px;
    background:
        radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 32%),
        linear-gradient(180deg, rgba(23, 33, 62, 0.98), rgba(8, 13, 27, 0.98));
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.06),
        0 14px 34px rgba(0, 0, 0, 0.34);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease, filter 120ms ease;
}

.roller-slot::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent 30%, transparent 70%, rgba(255,255,255,0.03));
    pointer-events: none;
}

.roller-slot.highlight {
    transform: translateY(-10px) scale(1.02);
    border-color: rgba(96, 165, 250, 0.72);
    box-shadow: 0 24px 42px rgba(0,0,0,0.4), 0 0 0 1px rgba(96,165,250,0.18), 0 0 34px rgba(59, 130, 246, 0.22);
    filter: saturate(1.08);
}

.roller-slot.winner {
    border-color: rgba(251, 191, 36, 0.92);
    box-shadow: 0 26px 58px rgba(0,0,0,0.44), 0 0 0 1px rgba(251,191,36,0.34), 0 0 55px rgba(251,191,36,0.3);
    animation: winnerPulse 0.9s ease-in-out 2;
}

.roller-slot img {
    width: 88px;
    height: 88px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.5));
}

.roller-slot-name {
    margin-top: 14px;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.1;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.roller-slot-value,
.roller-slot-odds {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.roller-slot-value {
    margin-top: 12px;
    color: #c4b5fd;
    background: rgba(76, 29, 149, 0.28);
    border: 1px solid rgba(167, 139, 250, 0.28);
}

.roller-slot-odds {
    margin-top: 8px;
    color: #93c5fd;
    background: rgba(30, 64, 175, 0.22);
    border: 1px solid rgba(96, 165, 250, 0.22);
}

.reward-reveal {
    display: none;
    text-align: center;
    padding: 14px 18px 2px;
}

.reward-reveal.active {
    display: block;
    animation: fadeIn 0.42s ease;
}

.reward-heading-wrap {
    margin-bottom: 12px;
}

.reward-heading-kicker {
    color: #c7d2fe;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.2em;
    text-transform: uppercase;
}

.reward-heading-sub {
    margin-top: 8px;
    color: var(--text-secondary);
    font-size: 13px;
}

.reward-sprite {
    width: 180px;
    height: 180px;
    margin: 0 auto 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle at center, rgba(96, 165, 250, 0.18), transparent 60%);
}

.reward-sprite img {
    max-width: 100%;
    max-height: 100%;
    image-rendering: pixelated;
    filter: drop-shadow(0 18px 24px rgba(0, 0, 0, 0.55));
}

.reward-name {
    font-size: clamp(30px, 3vw, 54px);
    font-weight: 800;
    margin-bottom: 12px;
}

.reward-meta-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}

.reward-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    margin-top: 20px;
}

.opening-seed {
    margin-top: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

.opening-lower-rail {
    position: relative;
    z-index: 1;
    padding: 0 28px 26px;
}

.opening-lower-rail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    margin-bottom: 14px;
}

.opening-drop-rail {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
}

.opening-drop-chip {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 92px;
    padding: 14px;
    background: rgba(14, 22, 42, 0.84);
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.05);
}

.opening-drop-chip-sprite {
    width: 58px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: rgba(255,255,255,0.04);
    flex-shrink: 0;
}

.opening-drop-chip-sprite img {
    width: 46px;
    height: 46px;
    object-fit: contain;
    image-rendering: pixelated;
}

.opening-drop-chip-meta {
    min-width: 0;
}

.opening-drop-chip-name {
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.opening-drop-chip-sub {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 12px;
}

@media (max-width: 1320px) {
    .opening-drop-rail {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 1024px) {
    .opening-modal .modal {
        width: 100vw;
        max-height: 100vh;
        border-radius: 0;
    }

    .opening-topbar {
        grid-template-columns: 1fr;
        justify-items: center;
    }

    .opening-topbar-actions {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
    }

    .opening-drop-rail {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .roller-track {
        padding: 0 100px;
        gap: 14px;
    }

    .roller-slot {
        width: 132px;
    }
}

@media (max-width: 720px) {
    .opening-stage,
    .opening-lower-rail {
        padding-left: 16px;
        padding-right: 16px;
    }

    .opening-topbar {
        padding: 18px 16px;
    }

    .opening-title {
        font-size: 24px;
    }

    .opening-subtitle {
        font-size: 13px;
    }

    .opening-roller-shell {
        min-height: 320px;
        padding: 56px 0 74px;
    }

    .opening-roller {
        height: 190px;
    }

    .roller-track {
        padding: 0 70px;
        gap: 10px;
    }

    .roller-slot {
        width: 112px;
        padding: 14px 10px;
        border-radius: 18px;
    }

    .roller-slot img {
        width: 64px;
        height: 64px;
    }

    .roller-slot-name {
        font-size: 14px;
    }

    .roller-slot-value,
    .roller-slot-odds {
        font-size: 10px;
        padding: 0 8px;
    }

    .opening-drop-rail {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .reward-name {
        font-size: 34px;
    }

    .reward-actions {
        flex-direction: column;
    }
}

/* ============================================
   MARKETPLACE PAGE
   ============================================ */

.marketplace-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-xl);
    flex-wrap: wrap;
    gap: var(--space-md);
}

.marketplace-filters {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-wrap: wrap;
}

.marketplace-search {
    width: 300px;
}

.marketplace-sort {
    min-width: 180px;
}

.items-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-lg);
}

@media (max-width: 1200px) {
    .items-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

@media (max-width: 992px) {
    .items-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 768px) {
    .items-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .items-grid {
        grid-template-columns: 1fr;
    }
}

/* ============================================
   TRADING PAGE
   ============================================ */

.trading-layout {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: var(--space-xl);
}

.trades-list {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.trades-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border-color);
}

.trade-card {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
    padding: var(--space-lg);
    border-bottom: 1px solid var(--border-color);
    transition: background var(--transition-fast);
}

.trade-card:hover {
    background: var(--bg-hover);
}

.trade-card:last-child {
    border-bottom: none;
}

.trade-users {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.trade-vs {
    color: var(--text-muted);
    font-size: 12px;
}

.trade-info {
    flex: 1;
}

.trade-items-count {
    font-size: 14px;
    color: var(--text-secondary);
}

.trade-time {
    font-size: 12px;
    color: var(--text-muted);
}

.trade-status {
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.trade-status.pending {
    background: rgba(245, 158, 11, 0.2);
    color: var(--warning);
}

.trade-status.accepted {
    background: rgba(16, 185, 129, 0.2);
    color: var(--success);
}

.trade-status.declined {
    background: rgba(239, 68, 68, 0.2);
    color: var(--error);
}

.trade-actions {
    display: flex;
    gap: var(--space-sm);
}

@media (max-width: 992px) {
    .trading-layout {
        grid-template-columns: 1fr;
    }
}

/* ============================================
   LIVE PULLS PAGE
   ============================================ */

.live-pulls-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-md);
}

.live-pull-card {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-md);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
}

.live-pull-card:hover {
    border-color: var(--border-hover);
    transform: translateX(4px);
}

.live-pull-sprite {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
}

.live-pull-sprite img {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
}

.live-pull-info {
    flex: 1;
}

.live-pull-user {
    font-weight: 600;
    margin-bottom: var(--space-xs);
}

.live-pull-case {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: var(--space-xs);
}

.live-pull-name {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.live-pull-time {
    font-size: 12px;
    color: var(--text-muted);
}

@media (max-width: 1200px) {
    .live-pulls-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 992px) {
    .live-pulls-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 576px) {
    .live-pulls-grid {
        grid-template-columns: 1fr;
    }
}

/* ============================================
   INVENTORY PAGE
   ============================================ */

.inventory-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-xl);
}

.inventory-stats {
    display: flex;
    gap: var(--space-xl);
}

.inventory-stat {
    text-align: center;
}

.inventory-stat-value {
    font-family: var(--font-mono);
    font-size: 24px;
    font-weight: 700;
    color: var(--accent-primary);
}

.inventory-stat-label {
    font-size: 12px;
    color: var(--text-muted);
}

.inventory-filters {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
    flex-wrap: wrap;
}

.inventory-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: var(--space-md);
}

.inventory-item {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.inventory-item:hover {
    transform: translateY(-4px);
    border-color: var(--accent-primary);
}

.inventory-item-listed {
    position: absolute;
    top: var(--space-xs);
    right: var(--space-xs);
    padding: 2px 6px;
    background: var(--accent-primary);
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 600;
}

.inventory-item-sprite {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
}

.inventory-item-sprite img {
    width: 80%;
    height: 80%;
    image-rendering: pixelated;
}

.inventory-item-info {
    padding: var(--space-sm);
    text-align: center;
}

.inventory-item-name {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.inventory-item-price {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent-primary);
}

@media (max-width: 1200px) {
    .inventory-grid {
        grid-template-columns: repeat(5, 1fr);
    }
}

@media (max-width: 992px) {
    .inventory-grid {
        grid-template-columns: repeat(4, 1fr);
    }
}

@media (max-width: 768px) {
    .inventory-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 576px) {
    .inventory-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* ============================================
   PROFILE PAGE
   ============================================ */

.profile-header {
    display: flex;
    align-items: center;
    gap: var(--space-xl);
    padding: var(--space-2xl);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-xl);
}

.profile-avatar {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 700;
}

.profile-info h2 {
    margin-bottom: var(--space-xs);
}

.profile-info p {
    color: var(--text-muted);
}

.profile-stats {
    display: flex;
    gap: var(--space-2xl);
    margin-left: auto;
}

.profile-stat {
    text-align: center;
}

.profile-stat-value {
    font-family: var(--font-mono);
    font-size: 28px;
    font-weight: 700;
    color: var(--accent-primary);
}

.profile-stat-label {
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.profile-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--space-xl);
}

.profile-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: var(--space-xl);
}

.profile-section-title {
    font-size: 18px;
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--border-color);
}

.transaction-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--border-color);
}

.transaction-item:last-child {
    border-bottom: none;
}

.transaction-info {
    display: flex;
    align-items: center;
    gap: var(--space-md);
}

.transaction-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
}

.transaction-icon.deposit {
    background: rgba(16, 185, 129, 0.2);
    color: var(--success);
}

.transaction-icon.purchase {
    background: rgba(239, 68, 68, 0.2);
    color: var(--error);
}

.transaction-icon.sale {
    background: rgba(59, 130, 246, 0.2);
    color: var(--accent-primary);
}

.transaction-description {
    font-weight: 500;
}

.transaction-date {
    font-size: 12px;
    color: var(--text-muted);
}

.transaction-amount {
    font-family: var(--font-mono);
    font-weight: 600;
}

.transaction-amount.positive {
    color: var(--success);
}

.transaction-amount.negative {
    color: var(--error);
}

@media (max-width: 992px) {
    .profile-grid {
        grid-template-columns: 1fr;
    }
    
    .profile-header {
        flex-direction: column;
        text-align: center;
    }
    
    .profile-stats {
        margin-left: 0;
        margin-top: var(--space-lg);
    }
}

/* ============================================
   AUTH PAGES
   ============================================ */

.auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
}

.auth-card {
    width: 100%;
    max-width: 440px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: var(--space-2xl);
}

.auth-header {
    text-align: center;
    margin-bottom: var(--space-2xl);
}

.auth-header .logo {
    justify-content: center;
    margin-bottom: var(--space-lg);
}

.auth-header h1 {
    font-size: 28px;
    margin-bottom: var(--space-sm);
}

.auth-header p {
    color: var(--text-secondary);
}

.auth-footer {
    text-align: center;
    margin-top: var(--space-xl);
    padding-top: var(--space-xl);
    border-top: 1px solid var(--border-color);
    color: var(--text-secondary);
}

.auth-footer a {
    font-weight: 600;
}

.auth-divider {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin: var(--space-xl) 0;
    color: var(--text-muted);
    font-size: 14px;
}

.auth-divider::before,
.auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-color);
}

/* ============================================
   CASE VS PAGE
   ============================================ */

.casevs-lobby {
    text-align: center;
    padding: var(--space-3xl);
}

.casevs-match {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--space-xl);
    align-items: center;
}

.casevs-player {
    padding: var(--space-xl);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
}

.casevs-player h3 {
    margin-bottom: var(--space-lg);
}

.casevs-versus {
    font-size: 48px;
    font-weight: 800;
    color: var(--accent-primary);
}

.casevs-case {
    padding: var(--space-xl);
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-lg);
}

.casevs-result {
    padding: var(--space-xl);
    text-align: center;
}

.casevs-winner {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: var(--space-md);
}

.casevs-score {
    display: flex;
    justify-content: center;
    gap: var(--space-xl);
    font-size: 48px;
    font-weight: 800;
}

.casevs-score .player1 {
    color: var(--accent-primary);
}

.casevs-score .player2 {
    color: var(--accent-secondary);
}


.roller-center-line {
    position: absolute;
    top: 20px;
    bottom: 20px;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    background: rgba(255,255,255,0.15);
    box-shadow: 0 0 24px rgba(59,130,246,0.25);
    pointer-events: none;
}

.opening-seed {
    margin-top: 14px;
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

.reward-meta-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin: 14px 0 22px;
}

.trade-compose-card,
.casevs-sidebar-card,
.replay-panel,
.casevs-room-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
}

.trade-compose-card {
    padding: 20px;
    margin-bottom: 20px;
}

.trade-collection-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.trade-select-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 12px;
    background: var(--bg-secondary);
    border: 1px solid transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.trade-select-item.selected {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 1px rgba(59,130,246,0.2);
}

.trade-return-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: 8px;
    margin-top: 12px;
}

.casevs-layout {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 24px;
}

.casevs-room-list {
    display: grid;
    gap: 14px;
}

.casevs-room-card {
    padding: 18px;
}

.casevs-room-head,
.live-pull-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.casevs-player-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 12px;
    margin-top: 14px;
    align-items: center;
}

.casevs-player-pill {
    padding: 12px;
    border-radius: 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
}

.casevs-vs-badge {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(59,130,246,0.12);
    color: var(--accent-primary);
    font-weight: 700;
}

.casevs-sidebar-card {
    padding: 20px;
    position: sticky;
    top: 96px;
}

.casevs-rounds {
    display: grid;
    gap: 16px;
    margin-top: 18px;
}

.casevs-round {
    padding: 14px;
    border-radius: 14px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
}

.casevs-round-pulls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: 10px;
    margin-top: 10px;
}

.casevs-round-pull {
    padding: 12px;
    border-radius: 12px;
    background: var(--bg-tertiary);
}

.live-feed-layout {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 24px;
}

.live-pulls-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.live-pull-card {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 18px;
}

.live-pull-head-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.live-pull-body {
    display: flex;
    gap: 14px;
    align-items: center;
}

.live-pull-sprite {
    width: 84px;
    height: 84px;
}

.live-pull-sprite img {
    width: 66px;
    height: 66px;
}

.live-pull-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.replay-panel {
    padding: 20px;
    min-height: 420px;
}

.replay-track-preview {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
}

.replay-track-preview .track-item {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 10px;
    text-align: center;
}

.replay-track-preview .track-item img {
    width: 48px;
    height: 48px;
}

@media (max-width: 1100px) {
    .casevs-layout,
    .live-feed-layout,
    .trading-layout {
        grid-template-columns: 1fr;
    }

    .casevs-sidebar-card {
        position: static;
    }
}

@media (max-width: 700px) {
    .live-pulls-grid,
    .trade-collection-grid,
    .casevs-round-pulls {
        grid-template-columns: 1fr;
    }

    .replay-track-preview {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

/* Community sidebar */
body.has-community-sidebar {
    position: relative;
}

.community-sidebar {
    position: fixed;
    top: 92px;
    right: 18px;
    bottom: 18px;
    width: 336px;
    z-index: 60;
    display: flex;
    align-items: stretch;
    transition: transform 0.28s ease;
}

.community-sidebar.closed {
    transform: translateX(calc(100% - 42px));
}

.community-sidebar-toggle {
    position: absolute;
    left: -44px;
    top: 16px;
    width: 44px;
    height: 44px;
    border-radius: 14px 0 0 14px;
    border: 1px solid var(--border-color);
    background: rgba(9, 11, 20, 0.94);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
}

.community-sidebar-inner {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: auto auto 1fr auto auto;
    gap: 12px;
    padding: 16px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 20px;
    background: rgba(9, 11, 20, 0.94);
    backdrop-filter: blur(18px);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
}

.community-sidebar-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.community-sidebar-header h3 {
    margin: 0;
    font-size: 18px;
}

.community-sidebar-header p {
    margin: 6px 0 0;
    color: var(--text-secondary);
    font-size: 13px;
}

.community-rain-card,
.panel,
.admin-feed-item {
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    border-radius: 16px;
}

.community-rain-card {
    padding: 14px;
}

.community-rain-card.empty,
.admin-feed-empty {
    color: var(--text-secondary);
    font-size: 14px;
    text-align: center;
    padding: 18px;
}

.community-rain-top,
.rain-card-top,
.panel-head,
.admin-feed-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
}

.community-rain-title,
.rain-title,
.panel-head h3 {
    font-weight: 700;
    font-size: 15px;
    margin: 0;
}

.community-rain-meta,
.panel-head p,
.admin-feed-head span,
.admin-feed-body {
    color: var(--text-secondary);
    font-size: 13px;
}

.community-rain-entrants {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
}

.community-rain-entrants span {
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 999px;
    font-size: 12px;
}

.community-rain-actions,
.rain-card-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
}

.community-message-list {
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
}

.community-empty {
    border: 1px dashed var(--border-color);
    border-radius: 14px;
    padding: 18px;
    text-align: center;
    color: var(--text-secondary);
}

.community-message {
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(255, 255, 255, 0.03);
}

.community-message-announcement {
    background: rgba(91, 33, 182, 0.16);
    border-color: rgba(139, 92, 246, 0.34);
}

.community-message-system {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.18);
}

.community-message-head {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 6px;
    flex-wrap: wrap;
}

.community-message-author {
    font-weight: 700;
    font-size: 13px;
}

.community-message-time {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-muted);
}

.community-message-badge {
    font-size: 10px;
    padding: 2px 6px;
}

.community-message-body {
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-primary);
    word-break: break-word;
}

.community-auth-hint {
    color: var(--text-secondary);
    font-size: 13px;
}

.community-auth-hint a {
    color: var(--accent-primary);
}

.community-chat-form {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
}

.community-chat-form.disabled {
    opacity: 0.72;
}

.community-chat-input,
.input,
.textarea {
    width: 100%;
    border: 1px solid var(--border-color);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-primary);
    border-radius: 14px;
    padding: 12px 14px;
    font: inherit;
    outline: none;
}

.community-chat-input:focus,
.input:focus,
.textarea:focus {
    border-color: rgba(139, 92, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
}

.textarea {
    resize: vertical;
    min-height: 120px;
}

.admin-hero-copy {
    max-width: 840px;
}

.admin-stats-grid {
    margin-bottom: 24px;
}

.admin-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
}

.admin-grid.lower {
    margin-top: 24px;
}

.admin-panel {
    padding: 20px;
}

.stack-form {
    display: grid;
    gap: 16px;
}

.form-grid.two-col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.form-group {
    display: grid;
    gap: 8px;
}

.form-group label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
}

.admin-rain-card {
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid rgba(139, 92, 246, 0.24);
    background: rgba(139, 92, 246, 0.08);
    border-radius: 16px;
}

.admin-rain-card.empty {
    background: var(--bg-card);
    border-color: var(--border-color);
    color: var(--text-secondary);
}

.admin-feed-list {
    display: grid;
    gap: 12px;
}

.admin-feed-item {
    padding: 14px;
}

.admin-feed-head strong {
    font-size: 14px;
}

.panel-head p {
    margin: 6px 0 0;
}

@media (max-width: 1280px) {
    .community-sidebar {
        width: 320px;
    }
}

@media (max-width: 1100px) {
    .community-sidebar {
        top: auto;
        left: 12px;
        right: 12px;
        bottom: 12px;
        width: auto;
        height: min(68vh, 620px);
    }

    .community-sidebar.closed {
        transform: translateY(calc(100% - 56px));
    }

    .community-sidebar-toggle {
        left: auto;
        right: 18px;
        top: -44px;
        border-radius: 14px 14px 0 0;
    }

    .admin-grid,
    .form-grid.two-col {
        grid-template-columns: 1fr;
    }
}

.admin-grid-quad {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

#requestedItemsPanel,
#adminUserResults {
    max-height: 260px;
    overflow: auto;
}

#selectedAdminUser {
    min-height: 72px;
    display: flex;
    align-items: center;
}

@media (max-width: 980px) {
    .admin-grid-quad {
        grid-template-columns: 1fr;
    }
}

.roller-slot-value {
    margin-top: 6px;
    font-size: 11px;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

.reward-reveal {
    flex-direction: column;
    align-items: center;
}

.community-sidebar .community-claim-panel {
    display: grid;
    gap: 10px;
    margin-bottom: 10px;
}

.profile-badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}

.profile-settings-form {
    display: grid;
    gap: 12px;
}

.public-profile-grid {
    display: grid;
    grid-template-columns: 1.1fr .9fr;
    gap: 24px;
}

@media (max-width: 1100px) {
    body.has-community-sidebar .page-wrapper {
        margin-right: 0;
    }

    .community-sidebar {
        width: min(100vw, 400px);
    }
}

@media (max-width: 900px) {
    .public-profile-grid,
    .profile-grid,
    .casevs-layout,
    .admin-grid {
        grid-template-columns: 1fr;
    }

    .opening-modal .modal,
    .modal {
        width: calc(100vw - 18px);
        margin: 9px;
    }

    .opening-roller {
        height: 178px;
    }

    .roller-slot {
        width: 104px;
        height: 142px;
    }

    .roller-slot img {
        width: 68px;
        height: 68px;
    }
}

@media (max-width: 720px) {
    .header-inner {
        gap: 12px;
        flex-wrap: wrap;
    }

    .nav {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 6px;
    }

    .header-actions {
        width: 100%;
        justify-content: space-between;
    }

    .cases-filters {
        flex-direction: column;
        align-items: stretch;
    }

    .cases-grid,
    .marketplace-grid,
    .inventory-grid {
        grid-template-columns: 1fr;
    }
}

.community-message-delete {
    margin-left: auto;
    border: 1px solid rgba(148, 163, 184, 0.18);
    background: transparent;
    color: var(--text-muted);
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 11px;
    cursor: pointer;
}

.community-message-delete:hover {
    color: var(--text-primary);
    border-color: rgba(239, 68, 68, 0.4);
}

@media (max-width: 720px) {
    .community-sidebar {
        left: 8px;
        right: 8px;
        bottom: 8px;
        height: min(72vh, 560px);
    }

    .community-sidebar-inner {
        padding: 12px;
        border-radius: 16px;
    }

    .community-rain-top,
    .community-sidebar-header,
    .community-message-head {
        align-items: flex-start;
    }

    .community-message-delete {
        order: 10;
        margin-left: 0;
    }

    .public-profile-grid,
    .marketplace-grid,
    .case-grid,
    .inventory-grid,
    .live-pulls-grid,
    .trade-layout {
        grid-template-columns: 1fr;
    }
}


/* Final opening experience overrides */
.reward-reveal {
    display: none;
}

.reward-reveal.active {
    display: block;
}

.roller-slot-value {
    margin-top: 12px;
    color: #c4b5fd;
    font-family: inherit;
}

@media (max-width: 900px) {
    .opening-modal .modal {
        width: 100vw;
        max-height: 100vh;
        margin: 0;
        border-radius: 0;
    }

    .opening-roller {
        height: 190px;
    }

    .roller-slot {
        width: 112px;
        height: 100%;
    }

    .roller-slot img {
        width: 64px;
        height: 64px;
    }
}


.multi-roll-summary {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
}

.multi-roll-chip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(14, 22, 42, 0.82);
    border: 1px solid rgba(255,255,255,0.06);
}

.multi-roll-chip-meta { min-width: 0; }
.multi-roll-chip-name { font-weight: 700; }
.multi-roll-chip-value { margin-top: 4px; color: var(--text-secondary); font-size: 12px; }

.admin-case-builder {
    display: grid;
    gap: 14px;
}

.admin-pokemon-picker { position: relative; }

.admin-pokemon-search-results {
    position: absolute;
    z-index: 12;
    left: 0;
    right: 0;
    top: calc(100% + 8px);
    display: grid;
    gap: 8px;
    max-height: 280px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 16px;
    background: rgba(8, 12, 24, 0.98);
    box-shadow: 0 22px 60px rgba(0,0,0,0.45);
}

.admin-case-builder-list {
    display: grid;
    gap: 10px;
}

.admin-case-item-chip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(14, 22, 42, 0.82);
    border: 1px solid rgba(255,255,255,0.06);
}

.admin-case-item-sprite {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.04);
    flex-shrink: 0;
}

.admin-case-item-meta { min-width: 0; flex: 1; }
.admin-case-item-name { font-weight: 700; }
.admin-case-item-sub { margin-top: 4px; font-size: 12px; color: var(--text-secondary); }

.live-pull-fresh {
    animation: pulseHighlight 1.3s ease;
}

@keyframes pulseHighlight {
    0% { transform: translateY(12px); opacity: 0.5; }
    100% { transform: translateY(0); opacity: 1; }
}

.casevs-round-pulls.live-pair {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.casevs-live-pull-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

@media (max-width: 900px) {
    .opening-topbar-actions {
        gap: 8px;
        flex-wrap: wrap;
        justify-content: center;
    }

    .reward-actions {
        flex-wrap: wrap;
    }

    .multi-roll-summary {
        grid-template-columns: 1fr;
    }

    .casevs-round-pulls.live-pair {
        grid-template-columns: 1fr;
    }

    .trade-compose-card > div[style*="display:grid; gap:12px"],
    .trade-compose-card > div[style*="grid-template-columns: 1fr 160px auto"],
    .trade-compose-card > div[style*="grid-template-columns: 1fr 1fr"] {
        grid-template-columns: 1fr !important;
    }
}

@media (max-width: 640px) {
    .opening-topbar {
        grid-template-columns: 1fr;
        text-align: center;
    }

    .opening-back-btn,
    .opening-top-pill,
    .opening-top-icon,
    .btn {
        min-height: 48px;
    }

    .opening-title {
        font-size: 24px;
    }

    .opening-roller-shell {
        min-height: 320px;
        padding: 56px 0 70px;
    }

    .roller-track {
        padding: 0 110px;
        gap: 12px;
    }

    .roller-slot {
        width: 102px;
        padding: 12px 10px;
        border-radius: 18px;
    }

    .roller-slot-name {
        font-size: 14px;
    }

    .reward-name {
        font-size: 34px;
    }

    .community-sidebar {
        width: calc(100vw - 16px);
    }

    .header-inner,
    .header-actions {
        align-items: center;
    }

    .balance-display {
        min-width: 0;
    }

    .brand-logo-img {
        height: 82px;
    }
}


.case-detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
}

.multi-roll-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin-top: 20px;
    width: 100%;
}

.multi-roll-chip {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(15, 23, 42, 0.78);
    border: 1px solid rgba(255,255,255,0.08);
    min-height: 92px;
}

.multi-roll-chip-order {
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 700;
    letter-spacing: 0.08em;
}

@media (max-width: 900px) {
    .case-detail-grid {
        grid-template-columns: 1fr;
        gap: 20px;
    }

    .multi-roll-summary {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .multi-roll-chip {
        padding: 12px 14px;
    }
}


.profile-shell {
    display: grid;
    gap: 24px;
}
.profile-banner-card {
    position: relative;
    overflow: hidden;
    padding: 28px;
    border-radius: 24px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: radial-gradient(circle at top left, rgba(139, 92, 246, 0.18), rgba(15, 23, 42, 0.96) 42%), linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(7, 10, 18, 0.98));
}
.profile-banner-card::after {
    content: '';
    position: absolute;
    inset: auto -60px -70px auto;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    background: rgba(139, 92, 246, 0.14);
    filter: blur(16px);
}
.profile-hero {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: center;
}
.profile-avatar.profile-avatar-lg {
    width: 120px;
    height: 120px;
    border: 4px solid rgba(255,255,255,0.08);
    box-shadow: 0 18px 40px rgba(0,0,0,0.28);
}
.profile-title-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
}
.profile-handle {
    color: var(--text-secondary);
    font-size: 14px;
}
.profile-meta-line,
.profile-joined-line {
    color: var(--text-secondary);
    font-size: 13px;
    margin-top: 6px;
}
.profile-hero-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 220px;
}
.profile-badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
}
.profile-top-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-top: 22px;
}
.profile-top-stat {
    padding: 16px;
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(255,255,255,0.04);
}
.profile-top-stat strong {
    display: block;
    font-size: 24px;
    color: var(--text-primary);
}
.profile-top-stat span {
    display: block;
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.profile-grid.profile-grid-revamp {
    grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
    align-items: start;
}
.profile-showcase-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}
.profile-item-card {
    border-radius: 18px;
    border: 1px solid rgba(148,163,184,0.14);
    background: rgba(255,255,255,0.03);
    padding: 14px;
    text-align: center;
}
.profile-not-found {
    max-width: 720px;
    margin: 40px auto;
    text-align: center;
    padding: 48px 28px;
    border-radius: 24px;
    border: 1px solid rgba(148,163,184,0.16);
    background: rgba(15,23,42,0.9);
}
.profile-not-found i { font-size: 44px; color: var(--accent-primary); }
.community-sidebar {
    overflow: visible;
}
.community-sidebar-toggle {
    transition: transform 0.22s ease, background 0.22s ease;
}
.community-sidebar.closed .community-sidebar-toggle {
    transform: translateX(-10px);
}
@media (max-width: 992px) {
    .profile-hero {
        grid-template-columns: 1fr;
        text-align: center;
    }
    .profile-hero-actions {
        min-width: 0;
    }
    .profile-top-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .profile-grid.profile-grid-revamp {
        grid-template-columns: 1fr;
    }
    .profile-showcase-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
@media (max-width: 640px) {
    .profile-banner-card { padding: 18px; }
    .profile-top-stats { grid-template-columns: 1fr 1fr; }
    .profile-showcase-grid { grid-template-columns: 1fr 1fr; }
    .community-sidebar {
        top: auto;
        right: 10px;
        left: 10px;
        bottom: 10px;
        width: auto;
        height: min(76vh, 640px);
    }
    .community-sidebar.closed {
        transform: translateY(calc(100% - 58px));
    }
    .community-sidebar-toggle {
        left: auto;
        right: 16px;
        top: -48px;
        border-radius: 14px;
    }
}


.case-card-previewable {
    position: relative;
    overflow: visible;
}
.case-hover-preview {
    position: absolute;
    left: 16px;
    right: 16px;
    top: calc(100% - 12px);
    z-index: 20;
    opacity: 0;
    pointer-events: none;
    transform: translateY(10px);
    transition: opacity 0.22s ease, transform 0.22s ease;
    padding: 14px;
    border-radius: 18px;
    border: 1px solid rgba(148,163,184,0.18);
    background: rgba(8,12,22,0.98);
    box-shadow: 0 24px 60px rgba(0,0,0,0.38);
}
.case-card-previewable:hover .case-hover-preview,
.case-card-previewable:focus-within .case-hover-preview {
    opacity: 1;
    transform: translateY(0);
}
.case-hover-preview-title {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 10px;
}
.case-hover-preview-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}
.case-hover-preview-item {
    text-align: center;
    border-radius: 14px;
    padding: 10px;
    background: rgba(255,255,255,0.03);
}
.case-hover-preview-name {
    font-size: 12px;
    font-weight: 700;
    margin-top: 8px;
}
.case-hover-preview-value {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 4px;
}
.site-announcement-flash {
    position: fixed;
    inset: auto 20px 20px auto;
    z-index: 1600;
    max-width: 420px;
    opacity: 0;
    transform: translateY(18px) scale(0.98);
    pointer-events: none;
    transition: opacity 0.26s ease, transform 0.26s ease;
}
.site-announcement-flash.active {
    opacity: 1;
    transform: translateY(0) scale(1);
}
.site-announcement-flash-inner {
    border-radius: 22px;
    border: 1px solid rgba(148,163,184,0.22);
    background: rgba(7,10,18,0.98);
    box-shadow: 0 24px 80px rgba(0,0,0,0.42);
    padding: 18px 20px;
}
.site-announcement-flash.jackpot .site-announcement-flash-inner {
    border-color: rgba(250, 204, 21, 0.4);
    box-shadow: 0 24px 80px rgba(250, 204, 21, 0.16);
}
.site-announcement-flash-eyebrow {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-secondary);
    margin-bottom: 8px;
}
.site-announcement-flash-text {
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-primary);
}
.community-sidebar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}
.community-sidebar-close {
    min-width: 36px;
}
@media (max-width: 760px) {
    .case-hover-preview {
        left: 8px;
        right: 8px;
    }
    .case-hover-preview-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .site-announcement-flash {
        inset: auto 12px 12px 12px;
        max-width: none;
    }
}


.inventory-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 12px;
    width: 100%;
}

.profile-inline-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

@media (max-width: 720px) {
    .inventory-toolbar {
        grid-template-columns: 1fr;
    }
}


/* Global page responsiveness */
.hero h1,
.cases-hero h1,
.section-title h1 {
    font-size: clamp(2.15rem, 6vw, 4rem);
}

.hero-subtitle {
    font-size: clamp(1rem, 2.8vw, 1.25rem);
}

@media (max-width: 992px) {
    .featured-grid,
    .steps-grid,
    .stats-grid,
    .marketplace-grid,
    .trade-layout,
    .admin-grid-quad {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .marketplace-header,
    .inventory-header,
    .inventory-filters,
    .profile-header,
    .featured-header,
    .trade-users,
    .trade-actions,
    .casevs-room-head,
    .admin-feed-head {
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 12px;
    }

    .marketplace-search,
    .marketplace-sort,
    .inventory-toolbar,
    .inventory-filters > *,
    .cases-filters > * {
        width: 100%;
    }
}

@media (max-width: 768px) {
    .hero {
        padding-top: 36px;
        padding-bottom: 36px;
    }

    .hero-actions,
    .hero-trust,
    .profile-hero-actions,
    .profile-inline-meta,
    .trade-users,
    .trade-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .hero-actions .btn,
    .profile-hero-actions .btn,
    .trade-actions .btn,
    .inventory-toolbar .btn {
        width: 100%;
    }

    .featured-grid,
    .steps-grid,
    .stats-grid,
    .marketplace-grid,
    .inventory-grid,
    .trade-layout,
    .trade-collection-grid,
    .trade-return-grid,
    .casevs-round-pulls,
    .profile-showcase-grid,
    .admin-stats-grid,
    .admin-grid-quad {
        grid-template-columns: 1fr;
    }

    .trade-vs,
    .casevs-versus {
        align-self: center;
        margin: 2px 0;
    }

    .casevs-player-row,
    .casevs-player-pill,
    .casevs-live-pull-top {
        flex-wrap: wrap;
        gap: 10px;
    }

    .trade-card,
    .profile-section,
    .admin-panel,
    .casevs-sidebar-card,
    .casevs-room-card,
    .trade-compose-card {
        padding: 16px;
    }

    .case-hover-preview {
        position: static;
        opacity: 1;
        pointer-events: auto;
        transform: none;
        margin-top: 12px;
    }
}

@media (max-width: 640px) {
    .profile-top-stats,
    .profile-stats,
    .rarity-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .marketplace-header,
    .cases-filters,
    .inventory-header,
    .inventory-filters,
    .featured-header {
        flex-direction: column;
        align-items: stretch;
    }

    .marketplace-search,
    .marketplace-sort,
    .inventory-toolbar,
    .search-input,
    .search-input input,
    .form-input,
    .btn,
    select {
        width: 100%;
    }

    .opening-stage-top,
    .opening-stage-actions,
    .reward-reveal-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .opening-stage-top .btn,
    .opening-stage-actions .btn,
    .reward-reveal-actions .btn {
        width: 100%;
    }
}

@media (max-width: 480px) {
    .hero-badge,
    .live-strip-item,
    .profile-top-stat,
    .inventory-item,
    .trade-select-item,
    .trade-card,
    .casevs-round,
    .admin-feed-item,
    .faq-item {
        border-radius: 16px;
    }

    .profile-top-stats,
    .profile-stats,
    .rarity-grid,
    .stats-grid {
        grid-template-columns: 1fr;
    }

    .hero-trust-item,
    .community-message-head,
    .casevs-player-row,
    .casevs-live-pull-top {
        width: 100%;
    }
}

/* ============================================
   AUTH PAGES - PREMIUM REFRESH
   ============================================ */

.auth-page.auth-page--split {
    min-height: 100vh;
    padding: 32px;
    background:
        radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 32%),
        radial-gradient(circle at bottom right, rgba(168, 85, 247, 0.12), transparent 36%),
        #070b14;
    align-items: stretch;
    justify-content: center;
}

.auth-shell {
    width: 100%;
    max-width: 1320px;
    min-height: calc(100vh - 64px);
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(420px, 500px);
    background: rgba(10, 14, 26, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 32px;
    overflow: hidden;
    box-shadow: 0 34px 80px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(20px);
}

.auth-showcase {
    position: relative;
    padding: 44px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
        rgba(10, 14, 26, 0.76);
    border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.auth-showcase::before,
.auth-showcase::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    filter: blur(55px);
    pointer-events: none;
}

.auth-showcase::before {
    width: 240px;
    height: 240px;
    top: -100px;
    right: -40px;
    background: rgba(99, 102, 241, 0.16);
}

.auth-showcase::after {
    width: 280px;
    height: 280px;
    bottom: -150px;
    left: -80px;
    background: rgba(168, 85, 247, 0.14);
}

.auth-brand,
.auth-showcase-copy,
.auth-showcase-panels,
.auth-bonus-card,
.auth-checklist {
    position: relative;
    z-index: 1;
}

.auth-brand {
    display: inline-flex;
    align-items: center;
    width: fit-content;
}

.auth-brand-logo {
    width: auto;
    height: 92px;
    object-fit: contain;
    filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.35));
}

.auth-kicker {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    border-radius: 999px;
    border: 1px solid rgba(96, 165, 250, 0.26);
    background: rgba(59, 130, 246, 0.1);
    color: #d7e8ff;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 24px;
}

.auth-showcase-copy h1 {
    font-size: clamp(40px, 4vw, 64px);
    line-height: 1;
    margin: 0 0 18px;
    max-width: 12ch;
}

.auth-showcase-copy p {
    max-width: 620px;
    font-size: 17px;
    line-height: 1.7;
    color: rgba(226, 232, 240, 0.78);
    margin: 0;
}

.auth-showcase-panels {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 18px;
    margin-top: 32px;
}

.auth-showcase-panel,
.auth-bonus-card,
.auth-stat-card,
.auth-card--discordish {
    background: rgba(17, 24, 39, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.24);
}

.auth-showcase-panel {
    border-radius: 22px;
    padding: 22px;
}

.auth-panel-label {
    display: inline-block;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 14px;
}

.auth-showcase-panel strong,
.auth-bonus-card strong {
    display: block;
    font-size: 18px;
    margin-bottom: 10px;
}

.auth-showcase-panel p,
.auth-bonus-card p {
    color: var(--text-secondary);
    line-height: 1.65;
    margin: 0;
}

.auth-showcase-stats {
    display: grid;
    gap: 14px;
}

.auth-stat-card {
    border-radius: 18px;
    padding: 18px 20px;
}

.auth-stat-label {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
    margin-bottom: 8px;
}

.auth-stat-card strong {
    display: block;
    font-size: 19px;
    margin-bottom: 4px;
}

.auth-stat-card small {
    color: var(--text-secondary);
    font-size: 13px;
}

.auth-bonus-card {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    border-radius: 22px;
    padding: 22px;
    margin-top: 28px;
}

.auth-bonus-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(16, 185, 129, 0.14);
    border: 1px solid rgba(16, 185, 129, 0.2);
    color: var(--success);
    font-size: 22px;
}

.auth-checklist {
    display: grid;
    gap: 14px;
    margin-top: 18px;
}

.auth-checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 18px;
    background: rgba(17, 24, 39, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
    line-height: 1.55;
}

.auth-checklist-item i {
    margin-top: 2px;
    color: var(--success);
    font-size: 18px;
}

.auth-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background: rgba(7, 11, 20, 0.82);
}

.auth-card--discordish {
    width: 100%;
    max-width: 100%;
    border-radius: 28px;
    padding: 34px;
}

.auth-card--wide-form {
    max-width: 100%;
}

.auth-header--left {
    text-align: left;
    margin-bottom: 28px;
}

.auth-chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(139, 92, 246, 0.24);
    background: rgba(139, 92, 246, 0.1);
    color: #e9ddff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 14px;
}

.auth-header--left h2 {
    font-size: 32px;
    line-height: 1.08;
    margin-bottom: 10px;
}

.auth-header--left p {
    color: var(--text-secondary);
    max-width: 42ch;
}

.auth-form--enhanced {
    display: grid;
    gap: 18px;
}

.auth-grid-two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.auth-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.auth-inline-link {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-primary);
}

.auth-input-wrap {
    position: relative;
}

.auth-input-icon {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    font-size: 18px;
    pointer-events: none;
}

.auth-input {
    min-height: 54px;
    padding-left: 46px;
    padding-right: 48px;
    border-radius: 14px;
    background: rgba(8, 13, 24, 0.9);
    border-color: rgba(255, 255, 255, 0.08);
}

.auth-input:focus {
    background: rgba(8, 13, 24, 1);
    border-color: rgba(96, 165, 250, 0.45);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.auth-input-action {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}

.auth-input-action:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-primary);
}

.auth-action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
}

.auth-action-row--stacked {
    align-items: flex-start;
    flex-direction: column;
}

.auth-checkbox {
    margin: 0;
}

.auth-checkbox span {
    color: var(--text-secondary);
}

.auth-action-note,
.auth-security-note {
    font-size: 13px;
    color: var(--text-muted);
}

.auth-security-note {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.auth-submit {
    width: 100%;
    min-height: 54px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
    border-radius: 14px;
}

.auth-footer--compact {
    margin-top: 24px;
    padding-top: 20px;
}

@media (max-width: 1120px) {
    .auth-page.auth-page--split {
        padding: 18px;
    }

    .auth-shell {
        min-height: auto;
        grid-template-columns: 1fr;
    }

    .auth-showcase {
        border-right: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .auth-showcase-panels {
        grid-template-columns: 1fr;
    }

    .auth-panel {
        padding: 24px;
    }
}

@media (max-width: 760px) {
    .auth-page.auth-page--split {
        padding: 0;
        background: #070b14;
    }

    .auth-shell {
        border-radius: 0;
        border-left: 0;
        border-right: 0;
        min-height: 100vh;
    }

    .auth-showcase {
        padding: 24px 20px 20px;
    }

    .auth-brand-logo {
        height: 74px;
    }

    .auth-showcase-copy h1 {
        font-size: 34px;
    }

    .auth-showcase-copy p {
        font-size: 15px;
    }

    .auth-panel {
        padding: 18px;
    }

    .auth-card--discordish {
        padding: 24px 18px;
        border-radius: 22px;
    }

    .auth-grid-two {
        grid-template-columns: 1fr;
    }

    .auth-action-row {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 420px) {
    .auth-showcase,
    .auth-panel {
        padding-left: 14px;
        padding-right: 14px;
    }

    .auth-showcase-panel,
    .auth-bonus-card,
    .auth-stat-card,
    .auth-checklist-item {
        padding: 16px;
    }

    .auth-header--left h2 {
        font-size: 28px;
    }
}


/* ============================================
   DISCORD-STYLE COMMUNITY + PROFILE REFRESH
   ============================================ */

.community-sidebar {
    top: 88px;
    right: 16px;
    bottom: 16px;
    width: 360px;
}

.community-sidebar-inner {
    grid-template-rows: auto auto auto auto 1fr auto auto;
    gap: 0;
    padding: 0;
    overflow: hidden;
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    background: rgba(17, 20, 30, 0.96);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.46);
}

.community-sidebar-header,
.community-channel-bar,
.community-auth-hint,
.community-chat-form,
.community-current-user {
    padding-left: 16px;
    padding-right: 16px;
}

.community-sidebar-header {
    padding-top: 16px;
    padding-bottom: 12px;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(21, 24, 36, 0.98);
    box-shadow: 0 1px 0 rgba(255,255,255,0.04);
}

.community-sidebar-header h3 {
    font-size: 16px;
    letter-spacing: 0.02em;
}

.community-sidebar-header p {
    margin-top: 3px;
    font-size: 12px;
}

.community-channel-bar {
    padding-top: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    background: rgba(14, 17, 26, 0.94);
}

.community-channel-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: var(--text-primary);
}

.community-channel-pill i {
    color: var(--text-secondary);
    font-size: 16px;
}

.community-channel-copy {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
}

.community-rain-panel,
.community-claim-panel {
    padding: 12px 16px 0;
    background: rgba(14, 17, 26, 0.94);
}

.community-rain-card {
    border-radius: 14px;
    border-color: rgba(255, 255, 255, 0.08);
    background: rgba(32, 36, 49, 0.9);
}

.community-message-list {
    gap: 2px;
    padding: 12px 8px 12px 12px;
    background: rgba(12, 14, 22, 0.98);
}

.community-empty {
    display: grid;
    gap: 6px;
    justify-items: start;
    border-style: solid;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255,255,255,0.02);
    text-align: left;
}

.community-empty i {
    font-size: 20px;
    color: var(--text-secondary);
}

.community-empty strong {
    font-size: 14px;
}

.community-empty span {
    color: var(--text-secondary);
    font-size: 13px;
}

.community-message {
    align-items: flex-start;
    gap: 12px;
    padding: 8px 10px;
    border: none;
    border-radius: 10px;
    background: transparent;
    transition: background 0.18s ease;
}

.community-message:hover {
    background: rgba(255, 255, 255, 0.04);
}

.community-message-announcement {
    background: rgba(88, 101, 242, 0.12);
    box-shadow: inset 3px 0 0 rgba(88, 101, 242, 0.78);
}

.community-message-system {
    background: rgba(59, 130, 246, 0.08);
    box-shadow: inset 3px 0 0 rgba(59, 130, 246, 0.32);
}

.community-message-avatar-wrap {
    width: 40px;
    flex: 0 0 40px;
}

.community-avatar,
.community-avatar.fallback {
    width: 40px;
    height: 40px;
    background: rgba(88, 101, 242, 0.2);
}

.community-message-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 3px;
}

.community-message-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
}

.community-message-author {
    font-size: 15px;
    line-height: 1.2;
}

.community-message-role {
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.16);
    color: #c4b5fd;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.community-message-region {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.community-message-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: 12px;
}

.community-message-time {
    margin-left: 0;
    font-size: 11px;
    opacity: 0.74;
}

.community-message-delete {
    opacity: 0;
    transition: opacity 0.18s ease, background 0.18s ease;
}

.community-message:hover .community-message-delete {
    opacity: 1;
}

.community-message-body {
    color: #d7dce3;
    white-space: pre-wrap;
    line-height: 1.5;
    padding-right: 8px;
}

.community-auth-hint {
    padding-top: 10px;
    padding-bottom: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.04);
    background: rgba(14, 17, 26, 0.94);
    font-size: 12px;
}

.community-chat-form {
    padding-top: 0;
    padding-bottom: 12px;
    grid-template-columns: 1fr auto;
    align-items: center;
    background: rgba(14, 17, 26, 0.94);
}

.community-chat-input {
    border-radius: 10px;
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.06);
    min-height: 44px;
}

.community-current-user {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
    padding-bottom: 12px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(21, 24, 36, 0.98);
}

.community-current-user-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.community-current-user-copy {
    min-width: 0;
    display: grid;
}

.community-current-user-copy strong {
    font-size: 13px;
    line-height: 1.2;
}

.community-current-user-copy span {
    color: var(--text-secondary);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.community-current-user-avatar,
.community-current-avatar,
.community-current-avatar.fallback {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    object-fit: cover;
    background: rgba(88, 101, 242, 0.18);
    color: var(--text-primary);
    font-weight: 700;
}

.community-current-user-link {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.06);
    color: var(--text-primary);
}

.profile-banner-card {
    padding: 32px;
    border-radius: 26px;
    border-color: rgba(148, 163, 184, 0.14);
    background: rgba(17, 20, 30, 0.98);
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.36);
}

.profile-banner-card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 132px;
    background: rgba(88, 101, 242, 0.14);
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.profile-banner-card::after {
    width: 180px;
    height: 180px;
    right: -30px;
    bottom: -50px;
    background: rgba(88, 101, 242, 0.12);
}

.profile-hero {
    align-items: end;
    gap: 24px;
    padding-top: 44px;
}

.profile-avatar.profile-avatar-lg {
    width: 128px;
    height: 128px;
    background: rgba(255,255,255,0.05);
    border: 6px solid rgba(17, 20, 30, 0.98);
    box-shadow: 0 18px 34px rgba(0,0,0,0.32);
}

.profile-title-row {
    gap: 12px;
}

.profile-title-row h1 {
    font-size: clamp(2rem, 3vw, 2.8rem);
}

.profile-handle {
    font-size: 15px;
}

.profile-meta-line,
.profile-joined-line {
    color: #b0b7c7;
}

.profile-top-stat {
    border-radius: 16px;
    background: rgba(255,255,255,0.04);
}

.profile-section {
    border-radius: 20px;
    border-color: rgba(255,255,255,0.06);
    background: rgba(17, 20, 30, 0.95);
}

.profile-section-title {
    margin-bottom: 18px;
}

.profile-item-card {
    display: grid;
    justify-items: center;
    gap: 4px;
    min-height: 200px;
    border-radius: 16px;
    border-color: rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.03);
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.profile-item-card:hover {
    transform: translateY(-2px);
    border-color: rgba(88, 101, 242, 0.28);
    background: rgba(255,255,255,0.04);
}

.profile-member-card {
    overflow: hidden;
}

.profile-member-card-top {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.profile-mini-avatar {
    width: 58px;
    height: 58px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.05);
    font-weight: 700;
    font-size: 22px;
}

.profile-member-card-copy {
    min-width: 0;
}

.profile-mini-name {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
}

.profile-mini-handle {
    color: var(--text-secondary);
    font-size: 13px;
    margin-top: 4px;
}

.profile-status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(88, 101, 242, 0.16);
    color: #c7d2fe;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
}

.profile-member-badges {
    margin-top: 0;
    margin-bottom: 16px;
}

.profile-member-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.profile-member-fact {
    padding: 12px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.03);
}

.profile-member-fact span {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
}

.profile-member-fact strong {
    display: block;
    margin-top: 6px;
    font-size: 14px;
    color: var(--text-primary);
}

.profile-account-note {
    margin-bottom: 14px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
}

.profile-checkbox-row {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 13px;
    color: var(--text-secondary);
}

.profile-settings-form {
    gap: 12px;
}

.profile-summary-stack {
    display: grid;
    gap: 10px;
}

.profile-summary-card {
    padding: 14px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.05);
    background: rgba(255,255,255,0.03);
}

.profile-summary-card span {
    display: block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
}

.profile-summary-card strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
    color: var(--text-primary);
}

.profile-summary-card p {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.55;
    color: var(--text-secondary);
}

@media (max-width: 992px) {
    .community-sidebar {
        width: 340px;
    }

    .profile-member-grid {
        grid-template-columns: 1fr 1fr;
    }
}

@media (max-width: 768px) {
    .profile-banner-card {
        padding: 22px;
    }

    .profile-hero {
        padding-top: 20px;
    }

    .profile-member-card-top {
        grid-template-columns: auto 1fr;
    }

    .profile-status-pill {
        grid-column: 1 / -1;
        justify-self: start;
    }
}

@media (max-width: 640px) {
    .community-sidebar {
        width: auto;
    }

    .community-message-head {
        flex-direction: column;
        align-items: flex-start;
    }

    .community-message-actions {
        margin-left: 0;
    }

    .profile-member-grid {
        grid-template-columns: 1fr;
    }
}

/* Pity system UI */
.case-pity-panel {
    display: none;
    margin-top: 18px;
    padding: 18px;
    border-radius: 18px;
    border: 1px solid rgba(134, 142, 255, 0.16);
    background: linear-gradient(180deg, rgba(17, 20, 35, 0.96), rgba(11, 13, 24, 0.98));
    box-shadow: 0 18px 50px rgba(5, 8, 18, 0.38);
}
.case-pity-panel.active { display: block; }
.case-pity-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 14px;
}
.case-pity-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 5px;
}
.case-pity-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
    color: var(--text-primary);
}
.case-pity-chip.primed,
.opening-pity-badge.primed {
    background: rgba(136, 102, 255, 0.18);
    border-color: rgba(136, 102, 255, 0.42);
    color: #ddd7ff;
}
.case-pity-chip.soft,
.opening-pity-badge.soft {
    background: rgba(102, 179, 255, 0.12);
    border-color: rgba(102, 179, 255, 0.26);
    color: #d8eeff;
}
.case-pity-meter-list {
    display: grid;
    gap: 12px;
}
.case-pity-meter {
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
}
.case-pity-meter-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 10px;
}
.case-pity-meter-bar,
.admin-user-pity-chip-bar {
    position: relative;
    overflow: hidden;
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
}
.case-pity-meter-bar span,
.admin-user-pity-chip-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, rgba(120, 135, 255, 0.75), rgba(188, 130, 255, 0.92));
    box-shadow: 0 0 18px rgba(145, 126, 255, 0.4);
}
.case-pity-meter-sub {
    margin-top: 9px;
    font-size: 12px;
    color: var(--text-secondary);
}
.opening-pity-spotlight {
    display: none;
    margin-top: 10px;
}
.opening-pity-spotlight.active { display: block; }
.opening-pity-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 700;
}

/* Discord-like admin refinements */
.admin-discord-layout {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr);
    gap: 22px;
    align-items: start;
}
.admin-discord-sidebar {
    position: sticky;
    top: 110px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.admin-discord-server,
.admin-discord-sidebar-card {
    padding: 16px;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(19, 22, 38, 0.98), rgba(11, 13, 25, 0.98));
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 18px 50px rgba(5, 8, 18, 0.38);
}
.admin-discord-server {
    display: flex;
    align-items: center;
    gap: 14px;
}
.admin-discord-server strong,
.admin-discord-sidebar-card strong {
    display: block;
    font-size: 14px;
}
.admin-discord-server span,
.admin-discord-sidebar-card p {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
}
.admin-discord-server-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    background: radial-gradient(circle at 30% 30%, rgba(141, 109, 255, 0.45), rgba(90, 108, 255, 0.16));
    border: 1px solid rgba(145, 126, 255, 0.35);
    color: #ede8ff;
}
.admin-discord-nav-group {
    display: grid;
    gap: 8px;
    padding: 14px;
    border-radius: 20px;
    background: rgba(13, 15, 28, 0.92);
    border: 1px solid rgba(255,255,255,0.05);
    box-shadow: 0 18px 42px rgba(5, 8, 18, 0.3);
}
.admin-discord-nav-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--text-muted);
}
.admin-discord-link {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 42px;
    padding: 0 12px;
    border-radius: 12px;
    color: var(--text-secondary);
    text-decoration: none;
    transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}
.admin-discord-link:hover,
.admin-discord-link.active {
    background: rgba(125, 133, 255, 0.12);
    color: var(--text-primary);
    transform: translateX(2px);
}
.admin-discord-main {
    min-width: 0;
}
.admin-panel {
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(18, 21, 37, 0.98), rgba(10, 12, 24, 0.98));
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 22px 60px rgba(4, 8, 18, 0.4);
}
.admin-panel .panel-head {
    padding-bottom: 14px;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.admin-feed-item {
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    padding: 12px 14px;
}
.admin-user-pity-actions {
    margin-top: 12px;
}
.admin-user-card {
    display: grid;
    gap: 14px;
}
.admin-user-card-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
}
.admin-user-pity-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}
.admin-user-pity-chip {
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
}
.admin-user-pity-chip.primed {
    background: rgba(136, 102, 255, 0.16);
    border-color: rgba(136, 102, 255, 0.34);
}
.admin-user-pity-chip-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 8px;
}
@media (max-width: 1180px) {
    .admin-discord-layout {
        grid-template-columns: 1fr;
    }
    .admin-discord-sidebar {
        position: static;
    }
}
@media (max-width: 720px) {
    .admin-user-pity-grid {
        grid-template-columns: 1fr;
    }
    .case-pity-head {
        flex-direction: column;
    }
}

/* Progression + daily ops */
.cases-ops-grid {
    display: grid;
    grid-template-columns: 1.1fr .9fr;
    gap: 18px;
    margin-top: 28px;
}

.cases-ops-card {
    background: rgba(17, 24, 39, 0.92);
    border: 1px solid rgba(139, 92, 246, 0.18);
    border-radius: 18px;
    padding: 18px;
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
}

.cases-ops-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.cases-ops-head h3 {
    margin: 4px 0 0;
    font-size: 18px;
}

.cases-ops-eyebrow {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .14em;
    color: var(--text-muted);
}

.cases-ops-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(139, 92, 246, 0.14);
    color: var(--text-primary);
    border: 1px solid rgba(139, 92, 246, 0.22);
    font-size: 12px;
}

.cases-ops-empty {
    min-height: 98px;
    display: grid;
    place-items: center;
    text-align: center;
    color: var(--text-secondary);
    border: 1px dashed rgba(139, 92, 246, 0.2);
    border-radius: 14px;
    padding: 18px;
}

.cases-xp-bar,
.profile-progress-bar {
    position: relative;
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    overflow: hidden;
    margin: 12px 0 10px;
}

.cases-xp-bar.compact { height: 8px; margin: 8px 0; }

.cases-xp-bar span,
.profile-progress-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: rgba(139, 92, 246, 0.88);
}

.cases-xp-copy {
    color: var(--text-secondary);
    font-size: 12px;
    margin-bottom: 14px;
}

.cases-daily-claim-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-top: 1px solid rgba(255,255,255,.06);
    border-bottom: 1px solid rgba(255,255,255,.06);
    padding: 14px 0;
    margin: 14px 0;
}

.cases-daily-claim-sub,
.cases-mission-sub {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
}

.cases-mission-list {
    display: grid;
    gap: 10px;
}

.cases-mission-card {
    display: grid;
    grid-template-columns: 42px minmax(0,1fr) auto;
    gap: 12px;
    align-items: center;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.05);
    border-radius: 14px;
    padding: 12px;
}

.cases-mission-card.ready { border-color: rgba(139, 92, 246, 0.28); box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.14) inset; }
.cases-mission-card.claimed { opacity: .74; }

.cases-mission-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(139, 92, 246, 0.14);
    color: #d8b4fe;
    font-size: 18px;
}

.cases-mission-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 2px;
}

.favorite-cases-rail {
    display: grid;
    gap: 10px;
}

.favorite-case-pill {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.05);
    border-radius: 14px;
    padding: 12px;
    color: inherit;
    text-align: left;
}

.favorite-case-pill:hover { transform: translateY(-1px); border-color: rgba(139, 92, 246, 0.2); }
.favorite-case-pill-icon { width: 38px; height: 38px; border-radius: 12px; display:grid; place-items:center; background: rgba(139,92,246,.12); color:#d8b4fe; }
.favorite-case-pill-copy { display:flex; flex-direction:column; gap:2px; }
.favorite-case-pill-copy span { color: var(--text-secondary); font-size: 12px; }

.case-card-headline-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}

.case-favorite-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(10, 14, 26, 0.84);
    color: var(--text-secondary);
}

.case-favorite-btn.active,
.case-favorite-btn:hover {
    color: #fbbf24;
    border-color: rgba(251, 191, 36, 0.28);
}

.case-favorite-tag {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .12em;
    color: #fbbf24;
    padding-top: 3px;
}

.profile-progress-card p { margin-top: 10px; }

@media (max-width: 980px) {
    .cases-ops-grid {
        grid-template-columns: 1fr;
    }
    .cases-daily-claim-row {
        flex-direction: column;
        align-items: stretch;
    }
    .cases-mission-card {
        grid-template-columns: 42px minmax(0,1fr);
    }
    .cases-mission-card .btn {
        grid-column: 1 / -1;
    }
}

/* ============================================
   DISCORD-STYLE PAGE REFRESH
   ============================================ */

.discord-page .cases-hero {
    position: relative;
    padding-top: calc(var(--space-2xl) + 4px);
}

.discord-page .cases-hero::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 100%;
    background: linear-gradient(180deg, rgba(88, 101, 242, 0.07) 0%, rgba(88, 101, 242, 0) 72%);
    pointer-events: none;
}

.discord-section-title {
    position: relative;
    z-index: 1;
}

.discord-page-kicker,
.discord-panel-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border-radius: 999px;
    background: rgba(88, 101, 242, 0.12);
    border: 1px solid rgba(88, 101, 242, 0.25);
    color: #c6d0ff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 12px;
}

.discord-hero-rail {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: -10px;
}

.discord-hero-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 42px;
    padding: 0 14px;
    border-radius: 14px;
    background: rgba(20, 24, 43, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.14);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
    color: var(--text-secondary);
    font-size: 13px;
}

.discord-hero-chip i {
    color: #c6d0ff;
}

.discord-filterbar {
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(17, 24, 39, 0.74);
    border: 1px solid rgba(148, 163, 184, 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.discord-panel,
.discord-panel-header,
.discord-side-stack > .profile-section,
.discord-side-stack > .trade-compose-card,
.discord-cases-page .cases-ops-card,
.discord-cases-page .card.case-card,
.discord-marketplace-page .item-card,
.discord-livepulls-page .replay-panel,
.discord-casevs-page .casevs-room-card,
.discord-casevs-page .casevs-sidebar-card,
.discord-casevs-page #caseVsCreateCard,
.discord-trading-page .trades-list {
    background: linear-gradient(180deg, rgba(23, 28, 47, 0.98) 0%, rgba(17, 22, 38, 0.98) 100%);
    border: 1px solid rgba(148, 163, 184, 0.14);
    box-shadow: 0 22px 50px rgba(0, 0, 0, 0.28);
}

.discord-tabbar {
    padding: 8px;
    border-radius: 16px;
    background: rgba(17, 22, 38, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.12);
}

.discord-tabbar .tab {
    border-radius: 12px;
}

.discord-tabbar .tab.active {
    background: rgba(88, 101, 242, 0.18);
    color: #eef2ff;
    box-shadow: inset 0 0 0 1px rgba(88, 101, 242, 0.35);
}

.trade-card {
    padding: 18px 20px;
    border-bottom-color: rgba(148, 163, 184, 0.08);
}

.trade-card-main {
    flex: 1;
    display: grid;
    gap: 10px;
}

.trade-card-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
}

.trade-user-chip {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(148, 163, 184, 0.12);
    font-size: 13px;
    font-weight: 700;
}

.trade-vs {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: rgba(88, 101, 242, 0.12);
    color: #c6d0ff;
    font-size: 13px;
}

.trade-status {
    border-radius: 999px;
    letter-spacing: 0.06em;
}

.trade-select-item {
    align-items: center;
    gap: 12px;
    min-height: 68px;
    border-radius: 14px;
    background: rgba(11, 16, 28, 0.85);
    border-color: rgba(148, 163, 184, 0.1);
}

.trade-select-item:hover {
    transform: translateY(-1px);
    border-color: rgba(88, 101, 242, 0.3);
    background: rgba(20, 27, 47, 0.96);
}

.live-pull-headline,
.live-pull-head-tags,
.casevs-player-pill-main {
    display: flex;
    align-items: center;
    gap: 12px;
}

.casevs-player-pill-main.compact {
    gap: 10px;
}

.live-pull-avatar,
.casevs-player-avatar {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    object-fit: cover;
    background: rgba(88, 101, 242, 0.16);
    color: #eef2ff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    border: 1px solid rgba(148, 163, 184, 0.16);
}

.live-pull-card.discord-live-card,
.casevs-room-card.discord-room-card,
.discord-market-card,
.discord-case-card {
    overflow: hidden;
}

.live-pull-card.discord-live-card::before,
.casevs-room-card.discord-room-card::before,
.discord-market-card::before,
.discord-case-card::before {
    content: '';
    display: block;
    height: 3px;
    background: linear-gradient(90deg, rgba(88, 101, 242, 0.9) 0%, rgba(139, 92, 246, 0.9) 100%);
}

.live-pull-head {
    align-items: center;
}

.live-pull-head-tags {
    margin-left: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.live-pull-value {
    margin-top: 10px;
    color: #dbe4ff;
    font-weight: 700;
    font-family: var(--font-mono);
}

.replay-panel-head {
    align-items: flex-start;
}

.replay-summary-row {
    padding: 16px;
    border-radius: 16px;
    background: rgba(9, 13, 24, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.1);
}

.casevs-room-title {
    font-size: 20px;
    font-weight: 800;
}

.casevs-room-eyebrow,
.market-item-channel,
.case-card-channel {
    color: #b8c1ff;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.casevs-room-meta,
.market-item-meta,
.case-card-badge-row,
.case-card-top-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
}

.casevs-room-meta {
    margin-top: 8px;
}

.casevs-room-chip,
.case-card-online {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(148, 163, 184, 0.12);
    color: var(--text-secondary);
    font-size: 12px;
}

.casevs-room-winner {
    margin-top: 14px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(251, 191, 36, 0.08);
    border: 1px solid rgba(251, 191, 36, 0.18);
    color: var(--text-secondary);
}

.casevs-player-pill {
    background: rgba(10, 14, 26, 0.95);
    border-color: rgba(148, 163, 184, 0.1);
}

.discord-round-card .casevs-round-pull {
    background: rgba(9, 13, 24, 0.88);
    border: 1px solid rgba(148, 163, 184, 0.1);
}

.discord-market-card .item-card-sprite-wrap {
    padding: 14px 14px 0;
}

.market-item-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.market-item-badge-row {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
}

.discord-market-card .item-card-sprite {
    min-height: 180px;
    border-radius: 18px;
    background: radial-gradient(circle at top, rgba(88, 101, 242, 0.16), rgba(88, 101, 242, 0.04) 42%, rgba(10, 14, 26, 0.9) 100%);
    border: 1px solid rgba(148, 163, 184, 0.1);
}

.market-item-meta {
    justify-content: space-between;
    margin-top: 14px;
}

.item-card-seller {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 13px;
}

.discord-case-card .case-card-image {
    min-height: 208px;
}

.case-card-top-meta {
    position: absolute;
    top: 14px;
    left: 14px;
    right: 56px;
    justify-content: space-between;
    z-index: 2;
}

.case-card-subline {
    margin-top: -4px;
    margin-bottom: 12px;
    color: #b9c4ff;
    font-size: 12px;
    letter-spacing: 0.03em;
}

.case-card-badge-row {
    margin-bottom: 16px;
}

.case-odds-row,
.case-preview-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(12, 17, 30, 0.88);
    border: 1px solid rgba(148, 163, 184, 0.08);
    margin-bottom: 8px;
}

.case-odds-value,
.case-preview-value {
    color: var(--text-muted);
    font-size: 12px;
    text-align: right;
}

.discord-cases-page #case-modal .modal,
.discord-trading-page #trade-modal .modal {
    background: linear-gradient(180deg, rgba(23, 28, 47, 0.99) 0%, rgba(16, 20, 34, 0.99) 100%);
}

.discord-cases-page .cases-ops-grid {
    gap: 18px;
}

@media (max-width: 992px) {
    .trade-card-top,
    .live-pull-head,
    .market-item-topline,
    .case-card-top-meta {
        flex-direction: column;
        align-items: flex-start;
    }

    .live-pull-head-tags {
        margin-left: 0;
        justify-content: flex-start;
    }
}

@media (max-width: 700px) {
    .discord-hero-rail {
        justify-content: flex-start;
    }

    .trade-user-chip,
    .casevs-room-chip,
    .case-card-online,
    .discord-hero-chip {
        width: 100%;
        justify-content: center;
    }

    .market-item-meta {
        flex-direction: column;
        align-items: flex-start;
    }
}

.case-preview-modal {
    max-width: 1080px;
    width: min(1080px, 94vw);
    max-height: 94vh;
    display: flex;
    flex-direction: column;
}

.case-preview-modal-header {
    align-items: flex-start;
}

.case-preview-modal-kicker,
.case-preview-section-kicker {
    color: #a5b4fc;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
    margin-bottom: 8px;
}

.case-preview-modal-body {
    flex: 1;
    min-height: 0;
    max-height: none;
}

.discord-case-detail-grid {
    align-items: start;
    gap: 20px;
}

.case-preview-stack {
    display: grid;
    gap: 16px;
}

.case-preview-hero-card,
.case-preview-panel {
    background: rgba(12, 17, 30, 0.94);
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 22px;
    padding: 18px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
}

.case-preview-hero-card {
    position: relative;
    overflow: hidden;
}

.case-preview-hero-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.18), transparent 36%);
    pointer-events: none;
}

.case-preview-hero-icon-wrap,
.case-preview-main,
.case-preview-highlight-item,
.case-preview-panel-head,
.case-preview-list-head,
.case-preview-modal-footer,
.case-preview-channel-row,
.case-odds-card-top,
.case-preview-name-row,
.case-preview-sub-row,
.case-preview-balance-row {
    display: flex;
    align-items: center;
}

.case-preview-hero-icon-wrap,
.case-preview-main,
.case-preview-highlight-item,
.case-preview-panel-head,
.case-preview-list-head,
.case-preview-modal-footer,
.case-preview-channel-row,
.case-odds-card-top,
.case-preview-name-row,
.case-preview-sub-row {
    justify-content: space-between;
    gap: 14px;
}

.case-preview-hero-icon-wrap {
    align-items: stretch;
    margin-bottom: 18px;
}

.case-preview-hero-icon {
    width: 112px;
    min-width: 112px;
    height: 112px;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(37, 46, 78, 0.95), rgba(17, 23, 39, 0.96));
    border: 1px solid rgba(148, 163, 184, 0.16);
    display: grid;
    place-items: center;
    font-size: 54px;
    color: #c4b5fd;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}

.rarity-border-common { border-color: rgba(156, 163, 175, 0.38); }
.rarity-border-uncommon { border-color: rgba(16, 185, 129, 0.4); }
.rarity-border-rare { border-color: rgba(59, 130, 246, 0.42); }
.rarity-border-epic { border-color: rgba(139, 92, 246, 0.5); }
.rarity-border-legendary { border-color: rgba(251, 191, 36, 0.5); }
.rarity-border-mythical { border-color: rgba(236, 72, 153, 0.5); }

.case-preview-hero-copy {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
}

.case-preview-channel-row {
    justify-content: flex-start;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}

.case-preview-channel,
.case-preview-status-pill,
.case-preview-mini-chip,
.case-preview-value-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
}

.case-preview-channel {
    color: #c7d2fe;
    background: rgba(76, 88, 146, 0.3);
    border: 1px solid rgba(129, 140, 248, 0.18);
}

.case-preview-status-pill {
    color: #bfdbfe;
    background: rgba(37, 99, 235, 0.18);
    border: 1px solid rgba(96, 165, 250, 0.18);
}

.case-preview-description {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.65;
}

.case-preview-intel-grid,
.case-odds-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.case-preview-intel-card,
.case-odds-card {
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(17, 24, 39, 0.92);
    padding: 14px;
}

.case-preview-intel-card strong,
.case-odds-card-main {
    display: block;
    font-size: 22px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 6px 0 2px;
}

.case-preview-intel-card small,
.case-odds-card-sub {
    color: var(--text-muted);
    font-size: 12px;
}

.case-preview-intel-label {
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-weight: 700;
}

.case-odds-card {
    display: grid;
    gap: 10px;
}

.case-odds-card.common { border-color: rgba(156, 163, 175, 0.18); }
.case-odds-card.uncommon { border-color: rgba(16, 185, 129, 0.2); }
.case-odds-card.rare { border-color: rgba(59, 130, 246, 0.22); }
.case-odds-card.epic { border-color: rgba(139, 92, 246, 0.22); }
.case-odds-card.legendary { border-color: rgba(251, 191, 36, 0.24); }
.case-odds-card.mythical { border-color: rgba(236, 72, 153, 0.24); }

.case-preview-highlight-strip {
    display: grid;
    gap: 10px;
    margin-top: 14px;
}

.case-preview-highlight-item {
    justify-content: flex-start;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(20, 27, 45, 0.86);
    border: 1px solid rgba(148, 163, 184, 0.08);
}

.case-preview-highlight-sprite,
.case-preview-sprite {
    width: 54px;
    height: 54px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: rgba(9, 12, 22, 0.84);
    border: 1px solid rgba(148, 163, 184, 0.08);
    overflow: hidden;
    flex-shrink: 0;
}

.case-preview-highlight-sprite.shiny,
.case-preview-sprite.shiny {
    box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.24), 0 0 20px rgba(250, 204, 21, 0.15);
}

.case-preview-highlight-copy,
.case-preview-copy {
    min-width: 0;
    display: grid;
    gap: 5px;
}

.case-preview-highlight-copy strong,
.case-preview-copy strong {
    font-size: 14px;
}

.case-preview-highlight-copy span,
.case-preview-inline-meta,
.case-preview-cash {
    color: var(--text-muted);
    font-size: 12px;
}

.case-preview-panel-head-tight {
    align-items: flex-start;
}

.case-preview-toolbar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.case-preview-sort-btn {
    border: 1px solid rgba(148, 163, 184, 0.12);
    background: rgba(15, 23, 42, 0.88);
    color: var(--text-secondary);
    border-radius: 999px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.case-preview-sort-btn:hover,
.case-preview-sort-btn.active {
    color: #ffffff;
    border-color: rgba(129, 140, 248, 0.3);
    background: rgba(79, 70, 229, 0.24);
}

.case-preview-list-shell {
    border-radius: 18px;
    border: 1px solid rgba(148, 163, 184, 0.1);
    overflow: hidden;
    background: rgba(10, 15, 27, 0.9);
}

.case-preview-list-head {
    justify-content: space-between;
    padding: 12px 14px;
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.case-preview-list {
    max-height: 530px;
    overflow-y: auto;
    padding: 10px;
}

.case-preview-row-rich {
    background: rgba(18, 25, 41, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.08);
    margin-bottom: 10px;
    padding: 12px 14px;
}

.case-preview-row-rich.rarity-row-common { border-left: 3px solid rgba(156, 163, 175, 0.7); }
.case-preview-row-rich.rarity-row-uncommon { border-left: 3px solid rgba(16, 185, 129, 0.72); }
.case-preview-row-rich.rarity-row-rare { border-left: 3px solid rgba(59, 130, 246, 0.74); }
.case-preview-row-rich.rarity-row-epic { border-left: 3px solid rgba(139, 92, 246, 0.76); }
.case-preview-row-rich.rarity-row-legendary { border-left: 3px solid rgba(251, 191, 36, 0.78); }
.case-preview-row-rich.rarity-row-mythical { border-left: 3px solid rgba(236, 72, 153, 0.8); }

.case-preview-main {
    justify-content: flex-start;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.case-preview-copy {
    flex: 1;
}

.case-preview-name-row,
.case-preview-sub-row {
    justify-content: flex-start;
    gap: 8px;
    flex-wrap: wrap;
}

.case-preview-mini-chip {
    background: rgba(30, 41, 59, 0.9);
    color: #dbeafe;
    border: 1px solid rgba(148, 163, 184, 0.12);
    padding: 4px 8px;
}

.case-preview-mini-chip.shiny {
    color: #fef3c7;
    border-color: rgba(251, 191, 36, 0.25);
    background: rgba(120, 53, 15, 0.28);
}

.case-preview-mini-chip.form {
    color: #c7d2fe;
    background: rgba(49, 46, 129, 0.32);
    border-color: rgba(129, 140, 248, 0.22);
}

.case-preview-side {
    display: grid;
    gap: 8px;
    justify-items: end;
    text-align: right;
}

.case-preview-value-chip {
    background: rgba(30, 41, 59, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.12);
    color: #e2e8f0;
}

.case-preview-cash {
    font-size: 13px;
    color: #bfdbfe;
    font-weight: 700;
}

.case-preview-modal-footer {
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    position: sticky;
    bottom: 0;
    z-index: 4;
    background: linear-gradient(180deg, rgba(12, 17, 30, 0.62), rgba(8, 12, 22, 0.96));
    backdrop-filter: blur(14px);
}

.case-preview-balance-row {
    gap: 10px;
    color: var(--text-muted);
    align-items: flex-start;
    flex-direction: column;
}

.case-preview-balance-row strong {
    display: block;
    margin-top: 6px;
    color: var(--text-primary);
    font-size: 20px;
}

.case-preview-balance-sub {
    color: var(--text-muted);
    font-size: 12px;
}

.case-preview-open-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
    flex: 1;
}

.case-preview-open-bar {
    width: min(100%, 620px);
    margin-left: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 20px;
    background: rgba(10, 15, 28, 0.92);
    border: 1px solid rgba(129, 140, 248, 0.14);
    box-shadow: 0 18px 40px rgba(0,0,0,0.22);
}

.case-preview-open-kicker {
    color: #a5b4fc;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 800;
}

.case-preview-open-sub {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.45;
}

.case-preview-launch-btn {
    min-width: 220px;
    min-height: 54px;
    border-radius: 16px;
    box-shadow: 0 16px 34px rgba(79, 70, 229, 0.28);
}

@media (max-width: 900px) {
    .case-preview-intel-grid,
    .case-odds-grid {
        grid-template-columns: 1fr;
    }

    .case-preview-panel-head,
    .case-preview-modal-footer {
        align-items: flex-start;
        flex-direction: column;
    }

    .case-preview-toolbar,
    .case-preview-open-actions {
        width: 100%;
        justify-content: flex-start;
    }

    .case-preview-open-bar {
        width: 100%;
        grid-template-columns: 1fr;
    }

    .case-preview-launch-btn {
        width: 100%;
        min-width: 0;
    }
}

@media (max-width: 640px) {
    .case-preview-hero-icon-wrap,
    .case-preview-row-rich,
    .case-preview-highlight-item {
        align-items: flex-start;
        flex-direction: column;
    }

    .case-preview-side,
    .case-preview-list-head,
    .case-preview-toolbar,
    .opening-mode-segment,
    .opening-live-stats,
    .case-preview-roll-select {
        width: 100%;
    }

    .case-preview-side {
        justify-items: start;
        text-align: left;
    }

    .case-preview-list-head {
        gap: 8px;
        align-items: flex-start;
        flex-direction: column;
    }

    .case-preview-hero-icon {
        width: 88px;
        min-width: 88px;
        height: 88px;
        font-size: 44px;
    }
}


@media (max-width: 900px) {
    .opening-mode-rail {
        flex-direction: column;
        align-items: stretch;
    }

    .opening-mode-segment {
        justify-content: stretch;
    }

    .opening-mode-btn {
        flex: 1;
        min-width: 0;
    }
}

@media (max-width: 640px) {
    .case-preview-modal {
        width: calc(100vw - 8px);
        max-height: calc(100vh - 8px);
    }

    .case-preview-modal-header,
    .case-preview-modal-footer {
        padding-left: 14px;
        padding-right: 14px;
    }

    .case-preview-modal-body {
        padding: 14px;
    }

    .opening-shell-badge {
        top: 14px;
        max-width: calc(100% - 24px);
        text-align: center;
    }
}

@keyframes pointerPulse {
    0%, 100% { transform: translateX(-50%) rotate(45deg) scale(1); box-shadow: 0 0 24px rgba(59, 130, 246, 0.4); }
    50% { transform: translateX(-50%) rotate(45deg) scale(1.08); box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
}

@keyframes openingGlowPulse {
    0%, 100% { opacity: 0.24; transform: scale(1); }
    50% { opacity: 0.38; transform: scale(1.06); }
}

@keyframes winnerPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.045); }
}

@keyframes shellJackpotFlash {
    0%, 100% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 100px rgba(0, 0, 0, 0.36); }
    50% { box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(250, 204, 21, 0.22), 0 0 80px rgba(250, 204, 21, 0.18), 0 40px 100px rgba(0, 0, 0, 0.42); }
}

@keyframes modalImpactShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(3px); }
}

.opening-modal.impact-epic .opening-roller-shell,
.opening-modal.impact-legendary .opening-roller-shell,
.opening-modal.impact-mythical .opening-roller-shell {
    animation: shellJackpotFlash 1s ease-in-out 2;
}

.opening-modal.impact-legendary .modal,
.opening-modal.impact-mythical .modal {
    animation: modalImpactShake 420ms ease-in-out 2;
}

.opening-modal.rolling .opening-shell-scanline {
    animation: pointerPulse 1.8s ease-in-out infinite;
}


/* ============================================
   OPENING UI ENHANCEMENTS / SPECIAL REVEALS
   ============================================ */

.opening-roller-shell::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 28px;
    background:
        repeating-linear-gradient(90deg, rgba(255,255,255,0.016) 0 1px, transparent 1px 18px),
        linear-gradient(180deg, rgba(255,255,255,0.03), transparent 32%, transparent 72%, rgba(255,255,255,0.02));
    pointer-events: none;
    opacity: 0.24;
    mix-blend-mode: screen;
}

.roller-slot-topbar {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.roller-slot-tier,
.roller-slot-tier-meta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    backdrop-filter: blur(12px);
}

.roller-slot-tier {
    color: #f8fafc;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.1);
}

.roller-slot-tier.tier-common { background: rgba(71, 85, 105, 0.42); }
.roller-slot-tier.tier-uncommon { background: rgba(5, 150, 105, 0.22); border-color: rgba(16, 185, 129, 0.28); }
.roller-slot-tier.tier-rare { background: rgba(37, 99, 235, 0.22); border-color: rgba(96, 165, 250, 0.28); }
.roller-slot-tier.tier-epic { background: rgba(124, 58, 237, 0.24); border-color: rgba(167, 139, 250, 0.34); }
.roller-slot-tier.tier-legendary { background: rgba(180, 83, 9, 0.24); border-color: rgba(251, 191, 36, 0.34); }
.roller-slot-tier.tier-mythical { background: rgba(157, 23, 77, 0.28); border-color: rgba(244, 114, 182, 0.34); }

.roller-slot-tier-meta {
    color: rgba(255,255,255,0.76);
    background: rgba(3, 7, 18, 0.52);
    border: 1px solid rgba(255,255,255,0.08);
    max-width: 62px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.roller-slot-sprite-wrap {
    position: relative;
    width: 108px;
    height: 108px;
    margin: 14px auto 0;
    border-radius: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
        radial-gradient(circle at 30% 28%, rgba(255,255,255,0.14), transparent 38%),
        linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02));
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 30px rgba(0, 0, 0, 0.26);
}

.roller-slot-sprite-wrap.shiny {
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(251, 191, 36, 0.18), 0 18px 34px rgba(0, 0, 0, 0.3), 0 0 34px rgba(251, 191, 36, 0.18);
}

.roller-slot-sprite-wrap img {
    width: 88px;
    height: 88px;
}

.roller-slot-lane {
    position: absolute;
    left: 20px;
    right: 20px;
    bottom: 12px;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(148, 163, 184, 0.34), rgba(255,255,255,0.02));
    overflow: hidden;
}

.roller-slot-lane::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, rgba(96,165,250,0), rgba(96,165,250,0.8), rgba(168,85,247,0.9), rgba(96,165,250,0));
    opacity: 0.58;
}

.reward-sprite {
    position: relative;
    overflow: visible;
}

.reward-sprite::before,
.reward-sprite::after {
    content: '';
    position: absolute;
    inset: 18px;
    border-radius: 50%;
    pointer-events: none;
    opacity: 0;
}

.reward-sprite.epic::before,
.reward-sprite.legendary::before,
.reward-sprite.mythical::before {
    opacity: 1;
    animation: rewardHaloPulse 1.3s ease-in-out infinite;
}

.reward-sprite.epic::before {
    box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.36), 0 0 60px rgba(139, 92, 246, 0.28);
}

.reward-sprite.legendary::before {
    box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.42), 0 0 80px rgba(251, 191, 36, 0.3);
}

.reward-sprite.mythical::before {
    box-shadow: 0 0 0 1px rgba(236, 72, 153, 0.44), 0 0 88px rgba(236, 72, 153, 0.32), 0 0 120px rgba(139, 92, 246, 0.18);
}

.special-reveal-overlay {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 1999;
    opacity: 0;
    overflow: hidden;
    isolation: isolate;
    pointer-events: none;
    background: radial-gradient(circle at center, rgba(7, 10, 20, 0.12), rgba(0,0,0,0.84));
}

.special-reveal-noise,
.special-reveal-vignette,
.special-reveal-beam,
.special-reveal-ring {
    position: absolute;
    pointer-events: none;
}

.special-reveal-noise {
    inset: 0;
    opacity: 0.12;
    background: repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 3px);
    mix-blend-mode: soft-light;
    animation: specialNoiseShift 320ms linear infinite;
}

.special-reveal-vignette {
    inset: -10%;
    background: radial-gradient(circle at center, rgba(255,255,255,0), rgba(0,0,0,0.7) 58%, rgba(0,0,0,0.92));
}

.special-reveal-beam {
    top: -10%;
    bottom: -10%;
    width: 220px;
    filter: blur(26px);
    opacity: 0;
}

.special-reveal-beam.beam-left {
    left: 26%;
    transform: rotate(18deg);
    background: linear-gradient(180deg, rgba(255,255,255,0), var(--special-accent), rgba(255,255,255,0));
}

.special-reveal-beam.beam-right {
    right: 26%;
    transform: rotate(-18deg);
    background: linear-gradient(180deg, rgba(255,255,255,0), var(--special-accent-secondary), rgba(255,255,255,0));
}

.special-reveal-ring {
    width: 380px;
    height: 380px;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--special-accent) 70%, white);
    box-shadow: 0 0 70px color-mix(in srgb, var(--special-accent) 30%, transparent);
    opacity: 0;
}

.special-reveal-ring.ring-two {
    width: 560px;
    height: 560px;
    border-color: color-mix(in srgb, var(--special-accent-secondary) 54%, white);
}

.special-reveal-copy {
    position: relative;
    z-index: 2;
    display: grid;
    gap: 14px;
    justify-items: center;
    text-align: center;
    padding: 36px 42px;
    min-width: min(92vw, 860px);
    border-radius: 34px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(7, 10, 20, 0.72), rgba(3, 7, 18, 0.42));
    box-shadow: 0 40px 100px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.05);
    backdrop-filter: blur(18px);
}

.special-reveal-kicker {
    padding: 7px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(2, 6, 23, 0.56);
    color: #f8fafc;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
}

.special-reveal-title {
    font-size: clamp(42px, 7vw, 102px);
    line-height: 0.92;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: white;
    text-shadow: 0 0 28px color-mix(in srgb, var(--special-accent) 58%, transparent), 0 10px 30px rgba(0,0,0,0.4);
}

.special-reveal-name {
    font-size: clamp(20px, 2vw, 30px);
    font-weight: 800;
    color: color-mix(in srgb, var(--special-accent) 44%, white);
}

.special-reveal-name span {
    opacity: 0.74;
    font-weight: 700;
}

.special-reveal-meta {
    color: rgba(226, 232, 240, 0.84);
    font-size: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.special-reveal-streak {
    position: fixed;
    width: 128px;
    height: 3px;
    border-radius: 999px;
    opacity: 0;
    filter: blur(0.5px);
    transform-origin: left center;
    pointer-events: none;
    z-index: 2001;
}

.opening-modal.impact-legendary .modal,
.opening-modal.impact-mythical .modal {
    animation: modalImpactShake 480ms cubic-bezier(.22,.84,.19,1.01) 3;
}

.opening-modal.impact-epic .opening-roller-shell {
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(139, 92, 246, 0.22), 0 0 74px rgba(139, 92, 246, 0.14), 0 40px 100px rgba(0, 0, 0, 0.4);
}

.opening-modal.impact-legendary .opening-roller-shell {
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(251, 191, 36, 0.28), 0 0 96px rgba(251, 191, 36, 0.18), 0 40px 100px rgba(0, 0, 0, 0.42);
}

.opening-modal.impact-mythical .opening-roller-shell {
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(236, 72, 153, 0.26), 0 0 112px rgba(236, 72, 153, 0.18), 0 40px 100px rgba(0, 0, 0, 0.44);
}

@keyframes rewardHaloPulse {
    0%, 100% { transform: scale(0.96); opacity: 0.72; }
    50% { transform: scale(1.08); opacity: 1; }
}

@keyframes specialNoiseShift {
    from { transform: translateY(0); }
    to { transform: translateY(3px); }
}

@media (max-width: 720px) {
    .roller-slot-topbar {
        top: 8px;
        left: 8px;
        right: 8px;
    }

    .roller-slot-tier,
    .roller-slot-tier-meta {
        min-height: 20px;
        padding: 0 6px;
        font-size: 9px;
    }

    .roller-slot-sprite-wrap {
        width: 80px;
        height: 80px;
        margin-top: 10px;
        border-radius: 20px;
    }

    .roller-slot-sprite-wrap img {
        width: 64px;
        height: 64px;
    }

    .special-reveal-copy {
        padding: 26px 18px;
        min-width: min(94vw, 94vw);
        border-radius: 24px;
    }

    .special-reveal-title {
        letter-spacing: 0.08em;
    }

    .special-reveal-meta {
        font-size: 12px;
        line-height: 1.5;
    }

    .special-reveal-ring.ring-one {
        width: 280px;
        height: 280px;
    }

    .special-reveal-ring.ring-two {
        width: 400px;
        height: 400px;
    }
}


/* v10.10 opening result visibility + lock tension refinements */
.opening-modal {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 18px 0;
}

.opening-modal .modal {
    margin: auto;
}

.opening-modal-shell {
    overflow: visible;
}

.opening-topbar {
    position: sticky;
    top: 0;
    backdrop-filter: blur(18px);
    background: linear-gradient(180deg, rgba(9, 14, 28, 0.94), rgba(9, 14, 28, 0.82));
}

.reward-reveal {
    position: relative;
    z-index: 3;
    padding: 18px 18px 24px;
    scroll-margin-bottom: 140px;
}

.reward-heading-wrap {
    max-width: 720px;
    margin: 0 auto 14px;
}

.reward-meta-row {
    max-width: 900px;
    margin: 0 auto;
}

.reward-actions {
    position: sticky;
    bottom: 14px;
    z-index: 5;
    width: fit-content;
    max-width: calc(100% - 16px);
    margin: 24px auto 0;
    padding: 10px;
    border-radius: 18px;
    border: 1px solid rgba(129, 140, 248, 0.16);
    background: rgba(5, 10, 22, 0.84);
    backdrop-filter: blur(16px);
    box-shadow: 0 22px 40px rgba(0, 0, 0, 0.34);
    flex-wrap: wrap;
}

.multi-roll-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    max-width: 1040px;
    margin: 18px auto 0;
    text-align: left;
}

.multi-roll-chip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    min-height: 92px;
    border-radius: 18px;
    background: rgba(11, 18, 34, 0.84);
    border: 1px solid rgba(255,255,255,0.07);
}

.multi-roll-chip-order {
    align-self: flex-start;
    min-width: 38px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(37, 99, 235, 0.16);
    border: 1px solid rgba(96, 165, 250, 0.18);
    color: #dbeafe;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
}

.multi-roll-chip-meta {
    min-width: 0;
}

.multi-roll-chip-name {
    font-weight: 800;
    font-size: 15px;
}

.multi-roll-chip-value {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
}

.opening-modal.result-mode .opening-stage {
    justify-content: flex-start;
    gap: 18px;
    padding-bottom: 34px;
}

.opening-modal.result-mode .opening-stage-copy {
    gap: 10px;
}

.opening-modal.result-mode .opening-roller-shell {
    min-height: 220px;
    padding: 62px 0 42px;
}

.opening-modal.result-mode .opening-roller {
    height: 178px;
}

.opening-modal.result-mode .roller-slot {
    width: 132px;
}

.opening-modal.result-mode .roller-slot img {
    width: 72px;
    height: 72px;
}

.opening-modal.result-mode .opening-lower-rail {
    padding-top: 8px;
}

.opening-modal.result-mode .opening-drop-rail {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.opening-modal.rolling .roller-pointer,
.opening-modal.lock-tension .roller-pointer {
    animation-duration: 0.62s;
}

.opening-modal.lock-tension .roller-pointer {
    box-shadow: 0 0 18px rgba(255,255,255,0.6), 0 0 56px rgba(96, 165, 250, 0.74), 0 0 96px rgba(168, 85, 247, 0.34);
}

.opening-modal.lock-tension .roller-center-line {
    box-shadow: 0 0 30px rgba(255,255,255,0.72), 0 0 72px rgba(96, 165, 250, 0.32);
}

.opening-modal.lock-tension .opening-shell-scanline {
    opacity: 0.88;
    box-shadow: 0 0 40px rgba(96, 165, 250, 0.72);
}

.roller-slot.near-miss {
    border-color: rgba(167, 139, 250, 0.5);
    box-shadow: 0 22px 42px rgba(0,0,0,0.38), 0 0 0 1px rgba(139, 92, 246, 0.24), 0 0 34px rgba(139, 92, 246, 0.18);
    transform: translateY(-6px) scale(1.015);
}

@media (max-width: 900px) {
    .opening-modal .modal {
        width: min(98vw, 1560px);
        max-height: none;
    }

    .opening-topbar {
        grid-template-columns: 1fr;
        justify-items: center;
    }

    .opening-topbar-actions {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
    }

    .reward-actions {
        width: calc(100% - 8px);
    }
}

@media (max-width: 720px) {
    .reward-sprite {
        width: 132px;
        height: 132px;
        margin-bottom: 16px;
    }

    .reward-actions {
        bottom: 10px;
        gap: 10px;
    }

    .reward-actions .btn {
        width: 100%;
    }

    .opening-modal.result-mode .opening-roller-shell {
        min-height: 186px;
        padding: 56px 0 34px;
    }

    .opening-modal.result-mode .opening-roller {
        height: 144px;
    }

    .opening-modal.result-mode .roller-slot {
        width: 116px;
        padding: 16px 12px 14px;
    }

    .opening-modal.result-mode .roller-slot img {
        width: 58px;
        height: 58px;
    }
}


/* v10.11 premium reel cards / shiny + jackpot treatments */
.roller-slot {
    overflow: hidden;
    isolation: isolate;
    background:
        radial-gradient(circle at 50% 0%, rgba(255,255,255,0.12), transparent 34%),
        radial-gradient(circle at 50% 100%, rgba(255,255,255,0.02), transparent 42%),
        linear-gradient(180deg, rgba(20, 30, 58, 0.98), rgba(7, 10, 21, 0.98));
}

.roller-slot::after {
    content: '';
    position: absolute;
    inset: -18%;
    background: radial-gradient(circle at center, var(--slot-accent-glow, rgba(96,165,250,0.18)) 0%, transparent 62%);
    opacity: 0;
    transform: scale(0.82);
    transition: opacity 180ms ease, transform 180ms ease;
    pointer-events: none;
    z-index: 0;
}

.roller-slot-frame {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.02) 30%, rgba(255,255,255,0.05) 70%, rgba(255,255,255,0.18)),
        linear-gradient(135deg, color-mix(in srgb, var(--slot-accent, #60a5fa) 88%, white 12%), rgba(255,255,255,0.04) 36%, color-mix(in srgb, var(--slot-accent, #60a5fa) 74%, black 26%));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.9;
    pointer-events: none;
    z-index: 1;
}

.roller-slot.is-jackpot .roller-slot-frame,
.roller-slot.is-shiny .roller-slot-frame {
    background:
        linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.02) 28%, rgba(255,255,255,0.08) 72%, rgba(255,255,255,0.28)),
        conic-gradient(from 0deg, rgba(255,255,255,0.16), var(--slot-accent, #fbbf24), rgba(255,255,255,0.12), var(--slot-accent, #fbbf24), rgba(255,255,255,0.16));
    animation: premiumSlotFrameSpin 4.8s linear infinite;
}

.roller-slot-corner {
    position: absolute;
    width: 18px;
    height: 18px;
    border: 2px solid color-mix(in srgb, var(--slot-accent, #60a5fa) 78%, white 22%);
    opacity: 0.42;
    z-index: 1;
    pointer-events: none;
}

.roller-slot-corner.corner-a { top: 10px; left: 10px; border-right: 0; border-bottom: 0; border-top-left-radius: 10px; }
.roller-slot-corner.corner-b { top: 10px; right: 10px; border-left: 0; border-bottom: 0; border-top-right-radius: 10px; }
.roller-slot-corner.corner-c { bottom: 10px; left: 10px; border-right: 0; border-top: 0; border-bottom-left-radius: 10px; }
.roller-slot-corner.corner-d { bottom: 10px; right: 10px; border-left: 0; border-top: 0; border-bottom-right-radius: 10px; }

.roller-slot-orb {
    position: absolute;
    inset: auto 16px 18px;
    height: 44%;
    border-radius: 999px;
    background: radial-gradient(circle at 50% 100%, var(--slot-accent-soft, rgba(96,165,250,0.12)), transparent 74%);
    filter: blur(18px);
    opacity: 0.9;
    pointer-events: none;
    z-index: 0;
}

.roller-slot-topbar,
.roller-slot-sprite-wrap,
.roller-slot-name,
.roller-slot-footer,
.roller-slot-signal-row,
.roller-slot-lane {
    position: relative;
    z-index: 2;
}

.roller-slot-tier-meta,
.roller-slot-signal {
    gap: 5px;
}

.roller-slot-tier-meta i,
.roller-slot-signal i {
    font-size: 11px;
}

.roller-slot-tier-meta {
    max-width: 90px;
}

.roller-slot-tier-meta span,
.roller-slot-signal span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.roller-slot-sprite-wrap {
    overflow: hidden;
    background:
        radial-gradient(circle at 30% 26%, rgba(255,255,255,0.18), transparent 34%),
        radial-gradient(circle at 50% 100%, var(--slot-accent-soft, rgba(96,165,250,0.1)), transparent 66%),
        linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        inset 0 0 0 1px rgba(255,255,255,0.03),
        0 18px 30px rgba(0, 0, 0, 0.3),
        0 0 24px var(--slot-accent-soft, rgba(96,165,250,0.08));
}

.roller-slot-sprite-ring {
    position: absolute;
    inset: 12px;
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.08);
    pointer-events: none;
}

.roller-slot-sprite-ring.ring-a {
    inset: 12px;
    border-color: color-mix(in srgb, var(--slot-accent, #60a5fa) 44%, rgba(255,255,255,0.18));
}

.roller-slot-sprite-ring.ring-b {
    inset: 22px;
    border-color: rgba(255,255,255,0.05);
    opacity: 0.8;
}

.opening-modal.rolling .roller-slot-sprite-ring.ring-a,
.roller-slot.highlight .roller-slot-sprite-ring.ring-a,
.roller-slot.winner .roller-slot-sprite-ring.ring-a {
    animation: premiumSlotRingPulse 1.8s ease-in-out infinite;
}

.roller-slot.is-jackpot .roller-slot-sprite-ring.ring-a,
.roller-slot.is-shiny .roller-slot-sprite-ring.ring-a {
    animation-duration: 1.15s;
}

.roller-slot-shiny-flare {
    position: absolute;
    inset: -18px;
    background:
        linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.02) 38%, rgba(255,255,255,0.46) 50%, rgba(255,255,255,0.08) 58%, transparent 70%),
        radial-gradient(circle at 72% 22%, rgba(250, 204, 21, 0.38), transparent 18%),
        radial-gradient(circle at 26% 70%, rgba(255,255,255,0.14), transparent 24%);
    opacity: 0.92;
    mix-blend-mode: screen;
    pointer-events: none;
    animation: premiumShinySweep 1.9s ease-in-out infinite;
}

.roller-slot.is-shiny .roller-slot-sprite-wrap {
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.1),
        inset 0 0 0 1px rgba(255,255,255,0.05),
        0 18px 36px rgba(0,0,0,0.34),
        0 0 32px rgba(250, 204, 21, 0.22);
}

.roller-slot-name {
    margin-top: 12px;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.42);
}

.roller-slot-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-top: 12px;
}

.roller-slot-value,
.roller-slot-odds {
    min-width: 88px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}

.roller-slot-value {
    color: #ede9fe;
    background: linear-gradient(180deg, rgba(76, 29, 149, 0.42), rgba(49, 18, 114, 0.24));
    border-color: color-mix(in srgb, var(--slot-accent, #a78bfa) 26%, rgba(167,139,250,0.28));
}

.roller-slot-odds {
    color: #dbeafe;
    background: linear-gradient(180deg, rgba(30, 64, 175, 0.3), rgba(15, 23, 42, 0.22));
    border-color: color-mix(in srgb, var(--slot-accent, #60a5fa) 22%, rgba(96,165,250,0.22));
}

.roller-slot-signal-row {
    margin-top: 10px;
    display: flex;
    justify-content: center;
    width: 100%;
}

.roller-slot-signal {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--slot-accent, #60a5fa) 36%, rgba(255,255,255,0.1));
    background: linear-gradient(180deg, rgba(8, 15, 32, 0.88), rgba(8, 15, 32, 0.6));
    color: rgba(255,255,255,0.82);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.roller-slot-lane {
    left: 18px;
    right: 18px;
    bottom: 10px;
    height: 5px;
    background:
        linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.1), rgba(255,255,255,0.03)),
        linear-gradient(90deg, transparent, var(--slot-accent-soft, rgba(96,165,250,0.24)), transparent);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 0 18px var(--slot-accent-soft, rgba(96,165,250,0.14));
}

.roller-slot-lane::after {
    background: linear-gradient(90deg, rgba(255,255,255,0), color-mix(in srgb, var(--slot-accent, #60a5fa) 78%, white 22%), rgba(168,85,247,0.9), rgba(255,255,255,0));
}

.opening-modal.rolling .roller-slot.is-jackpot .roller-slot-lane::after,
.roller-slot.winner .roller-slot-lane::after {
    animation: premiumLaneDrift 0.85s linear infinite;
}

.roller-slot.highlight {
    transform: translateY(-12px) scale(1.028);
}

.roller-slot.highlight::after,
.roller-slot.winner::after,
.roller-slot.is-jackpot::after,
.roller-slot.is-shiny::after {
    opacity: 0.86;
    transform: scale(1);
}

.roller-slot.highlight .roller-slot-corner,
.roller-slot.winner .roller-slot-corner,
.roller-slot.is-jackpot .roller-slot-corner,
.roller-slot.is-shiny .roller-slot-corner {
    opacity: 0.92;
}

.roller-slot.near-miss {
    animation: premiumNearMissPulse 0.72s ease-in-out 2;
}

.roller-slot.is-jackpot {
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 18px 38px rgba(0, 0, 0, 0.36),
        0 0 0 1px color-mix(in srgb, var(--slot-accent, #fbbf24) 34%, rgba(255,255,255,0.06)),
        0 0 28px var(--slot-accent-soft, rgba(251,191,36,0.16));
}

.roller-slot.winner {
    box-shadow:
        0 28px 58px rgba(0,0,0,0.46),
        0 0 0 1px color-mix(in srgb, var(--slot-accent, #fbbf24) 38%, rgba(255,255,255,0.1)),
        0 0 58px color-mix(in srgb, var(--slot-accent, #fbbf24) 44%, transparent);
}

.opening-modal.rolling .roller-slot-frame,
.opening-modal.lock-tension .roller-slot-frame {
    animation-play-state: running;
}

@keyframes premiumSlotRingPulse {
    0%, 100% { transform: scale(0.94); opacity: 0.46; }
    50% { transform: scale(1.02); opacity: 0.94; }
}

@keyframes premiumSlotFrameSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes premiumShinySweep {
    0% { transform: translateX(-18%) rotate(0deg); opacity: 0.24; }
    28% { opacity: 0.96; }
    50% { transform: translateX(10%) rotate(6deg); opacity: 0.66; }
    100% { transform: translateX(28%) rotate(12deg); opacity: 0.14; }
}

@keyframes premiumLaneDrift {
    from { transform: translateX(-18%); }
    to { transform: translateX(18%); }
}

@keyframes premiumNearMissPulse {
    0%, 100% { transform: translateY(-6px) scale(1.015); }
    50% { transform: translateY(-10px) scale(1.028); }
}

@media (max-width: 900px) {
    .roller-slot-tier-meta {
        max-width: 74px;
    }

    .roller-slot-signal {
        padding: 0 8px;
        letter-spacing: 0.08em;
    }
}

@media (max-width: 720px) {
    .roller-slot-corner {
        width: 14px;
        height: 14px;
    }

    .roller-slot-signal span,
    .roller-slot-tier-meta span {
        max-width: 52px;
    }

    .roller-slot-footer {
        gap: 6px;
        margin-top: 10px;
    }
}


.opening-modal.result-mode .roller-slot-sprite-wrap {
    width: 88px;
    height: 88px;
    margin-top: 10px;
    border-radius: 24px;
}

.opening-modal.result-mode .roller-slot-sprite-wrap img {
    width: 64px;
    height: 64px;
}

.opening-modal.result-mode .roller-slot-tier,
.opening-modal.result-mode .roller-slot-tier-meta,
.opening-modal.result-mode .roller-slot-signal {
    min-height: 22px;
    font-size: 9px;
}

.opening-modal.result-mode .roller-slot-value,
.opening-modal.result-mode .roller-slot-odds {
    min-height: 24px;
    font-size: 10px;
    padding: 0 8px;
}

.opening-modal.result-mode .roller-slot-footer {
    gap: 6px;
    margin-top: 10px;
}

@media (max-width: 720px) {
    .opening-modal.result-mode .roller-slot-sprite-wrap {
        width: 74px;
        height: 74px;
        border-radius: 20px;
    }

    .opening-modal.result-mode .roller-slot-sprite-wrap img {
        width: 54px;
        height: 54px;
    }

    .opening-modal.result-mode .roller-slot-signal {
        min-height: 20px;
        font-size: 8px;
    }
}


/* ============================================
   CASE OPENING - REAL RNG / PERFORMANCE TUNE
   ============================================ */

.opening-modal .modal,
.opening-roller-shell,
.opening-roller,
.roller-track,
.roller-slot,
.reward-reveal {
    backface-visibility: hidden;
    transform: translateZ(0);
}

.opening-modal .modal {
    contain: layout paint style;
}

.opening-stage {
    gap: 22px;
}

.opening-stage-copy {
    gap: 12px;
}

.opening-stage-hint {
    max-width: 64ch;
    margin: 0 auto;
}

.opening-mode-rail {
    gap: 12px;
}

.opening-mode-segment,
.case-preview-roll-select {
    background: linear-gradient(180deg, rgba(8, 13, 24, 0.92), rgba(6, 11, 20, 0.82));
    border-color: rgba(96, 165, 250, 0.16);
}

.opening-mode-btn:hover,
.opening-mode-btn.active,
.case-preview-roll-btn:hover,
.case-preview-roll-btn.active {
    background: linear-gradient(180deg, rgba(67, 56, 202, 0.42), rgba(30, 64, 175, 0.24));
    box-shadow: 0 10px 20px rgba(30, 64, 175, 0.18);
}

.opening-live-chip {
    background: linear-gradient(180deg, rgba(13, 20, 35, 0.8), rgba(8, 14, 28, 0.68));
}

.opening-roller-shell {
    padding: 74px 0 78px;
    min-height: 388px;
    background:
        radial-gradient(circle at 50% 18%, rgba(96, 165, 250, 0.16), transparent 24%),
        radial-gradient(circle at 18% 82%, rgba(59, 130, 246, 0.1), transparent 28%),
        radial-gradient(circle at 82% 16%, rgba(168, 85, 247, 0.13), transparent 22%),
        linear-gradient(180deg, rgba(10, 16, 30, 0.98), rgba(5, 10, 22, 0.99));
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 26px 60px rgba(0, 0, 0, 0.34);
}

.opening-roller-shell::before {
    inset: 12px;
    border-color: rgba(255,255,255,0.05);
}

.opening-shell-badge {
    top: 16px;
    padding: 7px 12px;
    background: rgba(4, 8, 18, 0.86);
    border-color: rgba(99, 102, 241, 0.18);
    color: #d8e4ff;
    letter-spacing: 0.16em;
}

.opening-shell-glow {
    opacity: 0.22;
    filter: blur(72px);
}

.opening-shell-glow.glow-left {
    left: -90px;
}

.opening-shell-glow.glow-right {
    right: -90px;
}

.opening-shell-beam {
    opacity: 0.14;
    filter: blur(28px);
}

.opening-shell-scanline {
    inset: auto 20px 20px 20px;
    height: 1px;
    opacity: 0.4;
    box-shadow: 0 0 18px rgba(96, 165, 250, 0.28);
}

.opening-roller {
    height: 224px;
}

.opening-roller::before {
    content: '';
    position: absolute;
    inset: 12px 14px;
    border-radius: 22px;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.03), transparent 20%, transparent 80%, rgba(255,255,255,0.02)),
        repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 118px);
    border: 1px solid rgba(255,255,255,0.03);
    pointer-events: none;
    z-index: 0;
}

.roller-track {
    gap: 14px;
    padding: 0 132px;
    filter: drop-shadow(0 12px 18px rgba(0,0,0,0.2));
}

.roller-center-line {
    width: 1px;
    top: 22px;
    bottom: 18px;
    box-shadow: 0 0 18px rgba(255,255,255,0.32);
}

.roller-pointer {
    top: 14px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    box-shadow: 0 0 24px rgba(59, 130, 246, 0.36);
}

.roller-pointer::after {
    inset: 6px;
    border-radius: 6px;
}

.roller-slot {
    width: 142px;
    padding: 16px 14px 14px;
    border-radius: 22px;
    background:
        radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 28%),
        linear-gradient(180deg, rgba(18, 28, 52, 0.98), rgba(8, 13, 27, 0.99));
    border-color: rgba(255,255,255,0.06);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 24px rgba(0, 0, 0, 0.26);
    transition: transform 90ms ease, border-color 90ms ease, box-shadow 90ms ease, filter 90ms ease;
    contain: layout paint style;
}

.roller-slot::after {
    opacity: 0.55;
}

.roller-slot-frame,
.roller-slot-shiny-flare,
.roller-slot-sprite-ring.ring-a {
    animation-play-state: paused;
}

.opening-modal.rolling .roller-slot.highlight .roller-slot-frame,
.opening-modal.rolling .roller-slot.highlight .roller-slot-shiny-flare,
.opening-modal.rolling .roller-slot.highlight .roller-slot-sprite-ring.ring-a,
.roller-slot.winner .roller-slot-frame,
.roller-slot.winner .roller-slot-shiny-flare,
.roller-slot.winner .roller-slot-sprite-ring.ring-a,
.roller-slot.is-jackpot.winner .roller-slot-frame,
.roller-slot.is-shiny.winner .roller-slot-frame {
    animation-play-state: running;
}

.roller-slot-topbar {
    gap: 6px;
}

.roller-slot-tier,
.roller-slot-tier-meta,
.roller-slot-signal {
    min-height: 22px;
    font-size: 9px;
}

.roller-slot-sprite-wrap {
    width: 92px;
    height: 92px;
    border-radius: 22px;
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.07),
        inset 0 0 0 1px rgba(255,255,255,0.025),
        0 12px 20px rgba(0, 0, 0, 0.24),
        0 0 18px var(--slot-accent-soft, rgba(96,165,250,0.07));
}

.roller-slot-sprite-wrap img {
    width: 62px;
    height: 62px;
}

.roller-slot-name {
    margin-top: 10px;
    font-size: 13px;
}

.roller-slot-footer {
    gap: 6px;
    margin-top: 10px;
}

.roller-slot-value,
.roller-slot-odds {
    min-width: 84px;
    min-height: 24px;
    font-size: 10px;
}

.roller-slot-signal-row {
    margin-top: 8px;
}

.roller-slot-lane {
    left: 16px;
    right: 16px;
    bottom: 9px;
    height: 4px;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 0 12px var(--slot-accent-soft, rgba(96,165,250,0.1));
}

.roller-slot.highlight {
    transform: translateY(-9px) scale(1.02);
    box-shadow: 0 18px 34px rgba(0,0,0,0.32), 0 0 0 1px rgba(96, 165, 250, 0.2);
}

.roller-slot.near-miss {
    animation-duration: 0.56s;
}

.roller-slot.winner {
    box-shadow: 0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px color-mix(in srgb, var(--slot-accent, #fbbf24) 32%, rgba(255,255,255,0.08)), 0 0 34px color-mix(in srgb, var(--slot-accent, #fbbf24) 24%, transparent);
}

.reward-reveal {
    contain: layout paint style;
}

.opening-modal.perf-mode .opening-shell-glow,
.opening-modal.perf-mode .opening-shell-beam,
.opening-modal.perf-mode .special-reveal-noise,
.opening-modal.perf-mode .special-reveal-vignette,
.opening-modal.perf-mode .roller-slot-orb {
    opacity: 0.12;
}

.opening-modal.perf-mode .opening-shell-glow,
.opening-modal.perf-mode .opening-shell-beam {
    animation: none !important;
    filter: blur(42px);
}

.opening-modal.perf-mode .roller-track {
    filter: none;
}

.opening-modal.perf-mode .roller-slot,
.opening-modal.perf-mode .roller-slot-sprite-wrap,
.opening-modal.perf-mode .reward-sprite {
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 18px rgba(0, 0, 0, 0.22);
}

.opening-modal.perf-mode .roller-slot-frame,
.opening-modal.perf-mode .roller-slot-shiny-flare,
.opening-modal.perf-mode .roller-slot-sprite-ring.ring-a,
.opening-modal.perf-mode .roller-slot.near-miss,
.opening-modal.perf-mode .roller-pointer,
.opening-modal.perf-mode .opening-shell-scanline {
    animation: none !important;
}

.opening-modal.perf-mode .roller-slot.highlight {
    transform: translateY(-6px) scale(1.015);
}

@media (max-width: 900px) {
    .opening-roller-shell {
        min-height: 344px;
        padding: 68px 0 68px;
    }

    .opening-roller {
        height: 210px;
    }

    .roller-track {
        gap: 12px;
        padding: 0 110px;
    }

    .roller-slot {
        width: 130px;
        border-radius: 20px;
    }

    .roller-slot-sprite-wrap {
        width: 82px;
        height: 82px;
        border-radius: 20px;
    }

    .roller-slot-sprite-wrap img {
        width: 56px;
        height: 56px;
    }
}

@media (max-width: 720px) {
    .opening-stage {
        gap: 18px;
        padding-inline: 18px;
    }

    .opening-roller-shell {
        min-height: 314px;
        padding: 62px 0 60px;
        border-radius: 24px;
    }

    .opening-roller {
        height: 188px;
    }

    .roller-track {
        padding: 0 96px;
    }

    .roller-slot {
        width: 118px;
        padding: 14px 12px 12px;
    }

    .roller-slot-sprite-wrap {
        width: 72px;
        height: 72px;
        border-radius: 18px;
    }

    .roller-slot-sprite-wrap img {
        width: 48px;
        height: 48px;
    }

    .roller-slot-name {
        font-size: 12px;
    }

    .roller-slot-value,
    .roller-slot-odds {
        min-width: 72px;
        font-size: 9px;
    }
}


/* ============================================
   FINAL OPENING OVERRIDES - SOL STYLE PASS
   ============================================ */

.opening-modal {
    background:
        radial-gradient(circle at 50% 0%, rgba(76, 29, 149, 0.18), transparent 26%),
        radial-gradient(circle at 20% 20%, rgba(30, 64, 175, 0.12), transparent 22%),
        rgba(1, 4, 10, 0.96);
}

.opening-modal .modal {
    background:
        linear-gradient(180deg, rgba(8, 11, 20, 0.985), rgba(4, 7, 15, 0.992));
    border-color: rgba(148, 163, 184, 0.12);
    box-shadow: 0 36px 120px rgba(0, 0, 0, 0.62);
}

.opening-stage-kicker,
.opening-title-eyebrow {
    color: #9fb8ff;
}

.opening-stage-hint,
.opening-subtitle {
    color: rgba(203, 213, 225, 0.78);
}

.opening-roller-shell {
    background:
        radial-gradient(circle at 50% 12%, rgba(124, 58, 237, 0.12), transparent 24%),
        radial-gradient(circle at 50% 54%, rgba(37, 99, 235, 0.08), transparent 20%),
        linear-gradient(180deg, rgba(6, 8, 16, 0.99), rgba(3, 5, 12, 1));
    border-color: rgba(148, 163, 184, 0.1);
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.04),
        inset 0 0 0 1px rgba(255,255,255,0.02),
        0 30px 80px rgba(0, 0, 0, 0.44);
}

.opening-roller-shell::after {
    opacity: 0.14;
}

.opening-roller::after {
    content: '';
    position: absolute;
    top: 14px;
    bottom: 14px;
    left: 50%;
    width: 188px;
    transform: translateX(-50%);
    border-radius: 34px;
    background:
        linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
        radial-gradient(circle at center, rgba(96, 165, 250, 0.12), rgba(96, 165, 250, 0.02) 56%, transparent 78%);
    box-shadow:
        inset 0 0 0 1px rgba(255,255,255,0.04),
        0 0 48px rgba(59, 130, 246, 0.08);
    pointer-events: none;
    z-index: 1;
}

.roller-center-line {
    width: 2px;
    background: linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,0.86), rgba(255,255,255,0));
    box-shadow: 0 0 16px rgba(255,255,255,0.26), 0 0 44px rgba(59, 130, 246, 0.18);
}

.roller-center-line::before {
    content: '';
    position: absolute;
    top: 12px;
    left: 50%;
    width: 110px;
    height: 110px;
    transform: translate(-50%, 0);
    border-radius: 50%;
    border: 1px solid rgba(125, 211, 252, 0.24);
    box-shadow: 0 0 40px rgba(59, 130, 246, 0.12), inset 0 0 32px rgba(255,255,255,0.04);
    opacity: 0.72;
}

.roller-pointer {
    top: 10px;
    width: 30px;
    height: 30px;
    background: linear-gradient(180deg, rgba(191, 219, 254, 1), rgba(59, 130, 246, 0.96));
    box-shadow: 0 0 22px rgba(96, 165, 250, 0.34), 0 0 60px rgba(59, 130, 246, 0.14);
}

.roller-pointer::before {
    content: '';
    position: absolute;
    inset: -14px;
    border-radius: 14px;
    background: radial-gradient(circle, rgba(96,165,250,0.24), transparent 70%);
    z-index: -1;
}

.opening-modal.rolling .roller-pointer,
.opening-modal.lock-tension .roller-pointer {
    animation: pointerPulse 1.1s ease-in-out infinite;
}

.opening-modal.lock-tension .roller-center-line,
.opening-modal.lock-tension .roller-center-line::before {
    box-shadow: 0 0 22px rgba(255,255,255,0.32), 0 0 76px rgba(96, 165, 250, 0.22);
}

.roller-track {
    gap: 12px;
    padding: 0 138px;
}

.roller-slot {
    width: 136px;
    border-radius: 20px;
    background:
        radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05), transparent 22%),
        linear-gradient(180deg, rgba(16, 22, 38, 0.99), rgba(5, 8, 16, 1));
    border-color: rgba(148, 163, 184, 0.09);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 18px rgba(0,0,0,0.26);
}

.roller-slot-topbar {
    top: 10px;
    left: 10px;
    right: 10px;
}

.roller-slot-tier,
.roller-slot-tier-meta,
.roller-slot-signal {
    min-height: 20px;
    font-size: 8px;
    letter-spacing: 0.12em;
}

.roller-slot-tier-meta,
.roller-slot-signal {
    background: rgba(2, 6, 16, 0.74);
    border-color: rgba(148, 163, 184, 0.1);
}

.roller-slot-tier-meta {
    max-width: 90px;
}

.roller-slot-sprite-wrap {
    width: 86px;
    height: 86px;
    margin-top: 12px;
    border-radius: 20px;
    background:
        radial-gradient(circle at 30% 24%, rgba(255,255,255,0.08), transparent 34%),
        linear-gradient(180deg, rgba(19, 26, 44, 0.92), rgba(7, 11, 22, 0.96));
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.05),
        inset 0 0 0 1px rgba(255,255,255,0.02),
        0 10px 18px rgba(0,0,0,0.24),
        0 0 14px var(--slot-accent-soft, rgba(96,165,250,0.05));
}

.roller-slot-sprite-wrap img {
    width: 60px;
    height: 60px;
}

.roller-slot-name {
    margin-top: 10px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.01em;
}

.roller-slot-footer {
    gap: 5px;
    margin-top: 10px;
}

.roller-slot-value,
.roller-slot-odds {
    min-width: 78px;
    min-height: 22px;
    padding: 0 8px;
    font-size: 9px;
}

.roller-slot-signal-row {
    margin-top: 6px;
}

.roller-slot-lane {
    left: 14px;
    right: 14px;
    bottom: 8px;
    height: 3px;
}

.roller-slot.highlight {
    transform: translateY(-10px) scale(1.026);
    border-color: color-mix(in srgb, var(--slot-accent, #60a5fa) 42%, rgba(255,255,255,0.12));
    box-shadow:
        0 18px 30px rgba(0,0,0,0.34),
        0 0 0 1px color-mix(in srgb, var(--slot-accent, #60a5fa) 18%, rgba(255,255,255,0.06)),
        0 0 24px color-mix(in srgb, var(--slot-accent, #60a5fa) 18%, transparent);
}

.roller-slot.near-miss {
    box-shadow:
        0 16px 26px rgba(0,0,0,0.28),
        0 0 0 1px rgba(251, 191, 36, 0.14),
        0 0 20px rgba(251, 191, 36, 0.12);
}

.roller-slot.winner {
    transform: translateY(-12px) scale(1.03);
}

.opening-modal.rarity-epic .roller-pointer,
.opening-modal.rarity-epic .roller-center-line::before {
    box-shadow: 0 0 24px rgba(139, 92, 246, 0.28), 0 0 66px rgba(139, 92, 246, 0.12);
}

.opening-modal.rarity-legendary .roller-pointer,
.opening-modal.rarity-legendary .roller-center-line::before {
    box-shadow: 0 0 26px rgba(251, 191, 36, 0.34), 0 0 78px rgba(251, 191, 36, 0.14);
}

.opening-modal.rarity-mythical .roller-pointer,
.opening-modal.rarity-mythical .roller-center-line::before {
    box-shadow: 0 0 26px rgba(236, 72, 153, 0.34), 0 0 84px rgba(236, 72, 153, 0.16);
}

.reward-reveal {
    padding: 10px 0 2px;
}

.reward-panel {
    max-width: 980px;
    margin: 0 auto;
    padding: 26px 20px 6px;
    border-radius: 30px;
    background:
        radial-gradient(circle at 50% 0%, rgba(255,255,255,0.035), transparent 26%),
        linear-gradient(180deg, rgba(8, 12, 24, 0.86), rgba(4, 7, 16, 0.8));
    border: 1px solid rgba(148, 163, 184, 0.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 58px rgba(0,0,0,0.28);
}

.reward-rarity-banner {
    margin-top: 10px;
    font-size: clamp(34px, 6vw, 72px);
    line-height: 0.92;
    font-weight: 900;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.18);
    text-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.reward-panel-epic .reward-rarity-banner { color: rgba(167, 139, 250, 0.3); }
.reward-panel-legendary .reward-rarity-banner { color: rgba(251, 191, 36, 0.34); }
.reward-panel-mythical .reward-rarity-banner { color: rgba(244, 114, 182, 0.34); }

.reward-heading-wrap {
    margin-bottom: 8px;
}

.reward-heading-kicker {
    letter-spacing: 0.24em;
}

.reward-sprite {
    width: 170px;
    height: 170px;
    margin-bottom: 18px;
}

.reward-name {
    font-size: clamp(28px, 3vw, 48px);
    margin-bottom: 10px;
}

.reward-actions {
    margin-top: 18px;
    padding-bottom: 6px;
}

.special-reveal-copy {
    background: linear-gradient(180deg, rgba(3, 6, 14, 0.8), rgba(1, 4, 12, 0.58));
    border-color: rgba(255,255,255,0.08);
}

.special-reveal-title {
    letter-spacing: 0.18em;
}

@media (max-width: 900px) {
    .opening-roller::after {
        width: 154px;
    }

    .roller-track {
        padding: 0 112px;
    }

    .roller-slot {
        width: 126px;
    }

    .reward-panel {
        padding-inline: 16px;
    }
}

@media (max-width: 720px) {
    .opening-roller::after {
        width: 118px;
        top: 10px;
        bottom: 10px;
    }

    .roller-center-line::before {
        width: 82px;
        height: 82px;
    }

    .roller-slot {
        width: 114px;
    }

    .roller-slot-tier-meta {
        max-width: 68px;
    }

    .reward-rarity-banner {
        font-size: 30px;
        letter-spacing: 0.14em;
    }

    .reward-panel {
        padding-top: 20px;
        border-radius: 24px;
    }
}

/* v10.12 surprise reel cleanup */
.opening-stage {
    gap: 18px;
}

.opening-roller-shell {
    min-height: 290px;
    padding: 64px 0 56px;
}

.opening-roller {
    height: 196px;
}

.roller-track {
    padding: 0 136px;
    gap: 16px;
}

.reward-reveal {
    width: 100%;
    padding: 0;
}

.reward-reveal.active {
    margin-bottom: 2px;
}

.reward-panel {
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px 26px;
    border-radius: 26px;
    border: 1px solid rgba(255,255,255,0.08);
    background: linear-gradient(180deg, rgba(11, 16, 32, 0.96), rgba(7, 10, 22, 0.96));
    box-shadow: 0 28px 60px rgba(0, 0, 0, 0.32);
}

.reward-primary-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 22px;
    align-items: center;
    text-align: left;
}

.reward-copy-block {
    min-width: 0;
}

.reward-copy-block .reward-name {
    margin-bottom: 10px;
}

.reward-actions {
    position: static;
    width: auto;
    max-width: none;
    margin: 20px 0 0;
    padding: 0;
    border: 0;
    background: transparent;
    backdrop-filter: none;
    box-shadow: none;
    justify-content: flex-start;
}

.opening-lower-rail {
    padding-top: 6px;
}

.opening-lower-rail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.opening-lower-rail-copy {
    display: grid;
    gap: 4px;
}

.opening-lower-rail-copy span:last-child {
    color: var(--text-secondary);
    font-size: 12px;
    letter-spacing: 0.04em;
}

.opening-pool-toggle {
    min-height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid rgba(129, 140, 248, 0.18);
    background: rgba(11, 18, 34, 0.88);
    color: #dbeafe;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
}

.opening-drop-rail {
    display: none;
    margin-top: 14px;
    grid-template-columns: repeat(4, minmax(0, 1fr));
}

.opening-lower-rail.expanded .opening-drop-rail {
    display: grid;
}

.roller-slot.is-masked {
    justify-content: center;
}

.roller-slot-mask {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
}

.roller-slot-mask-badge {
    min-height: 24px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(11, 18, 34, 0.86);
    color: rgba(255,255,255,0.82);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
}

.roller-slot-mask-icon {
    width: 96px;
    height: 96px;
    border-radius: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
        radial-gradient(circle at 30% 26%, rgba(255,255,255,0.16), transparent 34%),
        radial-gradient(circle at 50% 100%, var(--slot-accent-soft, rgba(96,165,250,0.12)), transparent 66%),
        linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        inset 0 0 0 1px rgba(255,255,255,0.03),
        0 18px 30px rgba(0,0,0,0.3),
        0 0 24px var(--slot-accent-soft, rgba(96,165,250,0.08));
    color: color-mix(in srgb, var(--slot-accent, #60a5fa) 72%, white 28%);
    font-size: 44px;
}

.roller-slot-mask-copy {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.02em;
}

.roller-slot-mask-sub {
    color: var(--text-secondary);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.roller-slot.revealed-card {
    justify-content: center;
}

.roller-slot.revealing {
    pointer-events: none;
}

.opening-modal.result-mode .opening-stage {
    justify-content: flex-start;
    gap: 16px;
}

.opening-modal.result-mode .opening-roller-shell {
    min-height: 220px;
    padding: 52px 0 34px;
}

.opening-modal.result-mode .opening-roller {
    height: 148px;
}

.opening-modal.result-mode .roller-slot {
    width: 124px;
}

.opening-modal.result-mode .roller-slot-mask-icon {
    width: 72px;
    height: 72px;
    border-radius: 22px;
    font-size: 34px;
}

.opening-modal.result-mode .roller-slot-mask-copy {
    font-size: 13px;
}

@media (max-width: 900px) {
    .reward-primary-row {
        grid-template-columns: 1fr;
        justify-items: center;
        text-align: center;
    }

    .reward-actions {
        justify-content: center;
    }

    .opening-drop-rail {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 720px) {
    .opening-roller-shell {
        min-height: 252px;
        padding: 58px 0 40px;
    }

    .opening-roller {
        height: 176px;
    }

    .roller-track {
        padding: 0 112px;
        gap: 14px;
    }

    .roller-slot-mask-icon {
        width: 78px;
        height: 78px;
        font-size: 36px;
    }

    .roller-slot-mask-copy {
        font-size: 14px;
    }

    .opening-drop-rail {
        grid-template-columns: 1fr;
    }
}


/* Auth sign-in toggle */
.auth-login-method-toggle {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 8px;
    border-radius: 18px;
    border: 1px solid rgba(129, 140, 248, 0.16);
    background: rgba(8, 13, 26, 0.88);
    margin-bottom: 18px;
}

.auth-login-method-btn {
    min-height: 44px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
    color: rgba(226, 232, 240, 0.82);
    border-radius: 14px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: 180ms ease;
}

.auth-login-method-btn.active {
    background: rgba(99, 102, 241, 0.22);
    border-color: rgba(129, 140, 248, 0.38);
    color: #f8fbff;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(15, 23, 42, 0.34);
}

/* Opening reel lock-only winner state */
.roller-slot {
    overflow: hidden;
}

.roller-slot-mask-copy,
.roller-slot-mask-sub {
    max-width: 120px;
}

.roller-slot.winner-locked {
    border-color: color-mix(in srgb, var(--slot-accent, #60a5fa) 34%, rgba(255,255,255,0.12));
    box-shadow:
        0 18px 34px rgba(0,0,0,0.34),
        0 0 0 1px color-mix(in srgb, var(--slot-accent, #60a5fa) 22%, rgba(255,255,255,0.08)),
        0 0 22px color-mix(in srgb, var(--slot-accent, #60a5fa) 18%, transparent);
}

.roller-slot.winner-locked .roller-slot-mask-badge {
    background: color-mix(in srgb, var(--slot-accent, #60a5fa) 14%, rgba(11, 18, 34, 0.88));
    border-color: color-mix(in srgb, var(--slot-accent, #60a5fa) 34%, rgba(255,255,255,0.08));
    color: white;
}

.roller-slot.winner-locked .roller-slot-mask-icon {
    box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.1),
        inset 0 0 0 1px rgba(255,255,255,0.03),
        0 18px 30px rgba(0,0,0,0.34),
        0 0 28px color-mix(in srgb, var(--slot-accent, #60a5fa) 20%, transparent);
}

.opening-drop-chip {
    min-height: 90px;
}

.opening-drop-chip-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Admin extras */
.admin-inline-checks {
    justify-content: flex-start;
    gap: 18px;
    flex-wrap: wrap;
}

.admin-case-manage-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
}

.admin-case-manage-flags {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}


/* Chat hard-hide refresh */
.community-sidebar {
    transition: transform .28s ease, opacity .22s ease, visibility .22s ease;
}
.community-sidebar.closed {
    transform: translateX(calc(100% + 42px)) !important;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}
.community-sidebar.closed .community-sidebar-inner {
    pointer-events: none;
}
.community-sidebar-launcher {
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 64;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid rgba(148,163,184,.18);
    background: rgba(15,18,28,.96);
    color: var(--text-primary);
    box-shadow: 0 20px 44px rgba(0,0,0,.34);
    opacity: 0;
    visibility: hidden;
    transform: translateY(12px);
    transition: opacity .2s ease, transform .2s ease, visibility .2s ease;
}
.community-sidebar-launcher.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}
.community-sidebar-launcher i { font-size: 18px; }
.community-sidebar-launcher span { font-weight: 700; font-size: 13px; }
@media (max-width: 1100px) {
    .community-sidebar.closed {
        transform: translateY(calc(100% + 88px)) !important;
    }
    .community-sidebar-launcher {
        right: 12px;
        bottom: 12px;
    }
}

/* ===== Trade + Inventory premium revamp ===== */
.trade-partner-preview {
    display: grid;
    margin-bottom: 12px;
}

.trade-partner-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    background: rgba(11, 16, 28, 0.78);
}

.trade-partner-card.empty {
    color: var(--text-secondary);
}

.trade-partner-card.empty i {
    font-size: 18px;
}

.trade-partner-meta p,
.trade-detail-column-head p,
.pokemon-box-kicker {
    margin: 4px 0 0;
    color: var(--text-muted);
    font-size: 12px;
}

.trade-compose-insight {
    display: grid;
    gap: 14px;
}

.trade-compose-stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
}

.trade-stage-lane {
    display: grid;
    gap: 10px;
    padding: 12px;
    border-radius: 16px;
    background: rgba(11, 16, 28, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.12);
}

.trade-stage-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary);
}

.trade-stage-head strong {
    color: var(--text-primary);
    font-size: 14px;
}

.trade-stage-link {
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: rgba(88, 101, 242, 0.14);
    color: #c6d0ff;
    border: 1px solid rgba(88, 101, 242, 0.24);
}

.trade-item-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.trade-strip-slot,
.trade-strip-more {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(18, 24, 41, 0.95);
    border: 1px solid rgba(148, 163, 184, 0.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}

.trade-strip-slot.empty {
    color: var(--text-muted);
}

.trade-strip-slot img {
    width: 34px;
    height: 34px;
    image-rendering: pixelated;
}

.trade-strip-more {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 700;
}

.trade-showdown-card {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
}

.trade-showdown-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 140px minmax(0, 1fr);
    gap: 14px;
    align-items: center;
}

.trade-showdown-side {
    display: grid;
    gap: 8px;
}

.trade-showdown-label {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
}

.trade-showdown-mid {
    display: grid;
    gap: 8px;
    justify-items: center;
}

.trade-showdown-value {
    font-family: var(--font-mono);
    font-size: 16px;
    color: var(--text-primary);
}

.trade-showdown-balance {
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    background: rgba(148, 163, 184, 0.12);
    color: var(--text-secondary);
}

.trade-showdown-balance.balanced { background: rgba(16, 185, 129, 0.16); color: #a7f3d0; }
.trade-showdown-balance.notice { background: rgba(59, 130, 246, 0.16); color: #bfdbfe; }
.trade-showdown-balance.warning,
.trade-showdown-balance.danger { background: rgba(245, 158, 11, 0.18); color: #fde68a; }

.trade-box-shell {
    padding: 14px;
    border-radius: 18px;
    background: rgba(11, 16, 28, 0.7);
    border: 1px solid rgba(148, 163, 184, 0.12);
}

.trade-box-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.trade-box-item {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 12px 10px 10px;
    text-align: center;
    min-height: 148px;
}

.trade-box-check {
    position: absolute;
    top: 10px;
    left: 10px;
    color: var(--text-muted);
}

.trade-box-item.selected .trade-box-check {
    color: #9eb4ff;
}

.trade-box-sprite {
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: rgba(255,255,255,0.03);
}

.trade-box-sprite img {
    width: 48px;
    height: 48px;
}

.trade-box-name {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.2;
}

.trade-box-value {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
}

.trade-detail-showcase {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
}

.trade-detail-column {
    display: grid;
    gap: 14px;
    padding: 16px;
    border-radius: 18px;
    background: rgba(11, 16, 28, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.12);
}

.trade-detail-column-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
}

.trade-detail-column-head h4 {
    margin: 0;
}

.trade-detail-list {
    display: grid;
    gap: 10px;
}

.trade-detail-card {
    display: flex;
    gap: 12px;
    padding: 12px;
    border-radius: 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(148, 163, 184, 0.1);
}

.trade-detail-sprite {
    width: 68px;
    height: 68px;
    flex: 0 0 auto;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.03);
}

.trade-detail-sprite img {
    width: 52px;
    height: 52px;
}

.trade-detail-name {
    font-weight: 700;
    font-size: 13px;
}

.trade-detail-sub {
    margin-top: 4px;
    font-size: 11px;
    color: var(--text-secondary);
}

.trade-detail-return-block {
    margin-top: 4px;
    padding-top: 14px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.trade-return-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--text-secondary);
}

.trade-return-item {
    min-height: 62px;
}

.trade-transfer-overlay {
    position: fixed;
    inset: 0;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(4, 6, 12, 0.88);
    z-index: 1200;
    opacity: 0;
}

.trade-transfer-overlay.active {
    display: flex;
    opacity: 1;
}

.trade-transfer-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px minmax(0, 1fr);
    align-items: center;
    gap: 24px;
    width: min(920px, calc(100vw - 40px));
    padding: 28px;
    border-radius: 28px;
    background: rgba(11, 16, 28, 0.96);
    border: 1px solid rgba(148, 163, 184, 0.14);
    box-shadow: 0 30px 80px rgba(0,0,0,0.45);
}

.trade-transfer-side {
    display: grid;
    gap: 14px;
    justify-items: center;
}

.trade-transfer-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
}

.trade-transfer-pod {
    position: relative;
    width: 180px;
    height: 180px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(18, 24, 41, 0.96);
    border: 1px solid rgba(148, 163, 184, 0.16);
}

.trade-transfer-orbit {
    position: absolute;
    inset: 10px;
    border-radius: 999px;
    border: 1px dashed rgba(148, 163, 184, 0.2);
}

.trade-transfer-sprite img {
    width: 72px;
    height: 72px;
    image-rendering: pixelated;
}

.trade-transfer-center {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 18px;
}

.trade-transfer-beam {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.42);
    box-shadow: 0 0 20px rgba(88,101,242,0.35);
}

.trade-transfer-ball {
    width: 66px;
    height: 66px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.92);
    color: #dc2626;
    font-size: 28px;
    box-shadow: 0 18px 40px rgba(0,0,0,0.35);
}

.trade-transfer-status {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #eef2ff;
}

.pokemon-box-shell {
    padding: 18px;
    border-radius: 22px;
    background: rgba(11, 16, 28, 0.82);
    border: 1px solid rgba(148, 163, 184, 0.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 50px rgba(0,0,0,0.2);
}

.pokemon-box-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 16px;
}

.pokemon-box-header h3 {
    margin: 2px 0 0;
}

.pokemon-box-kicker {
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.pokemon-box-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-secondary);
    font-size: 12px;
}

.pokemon-box-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
}

.pokemon-box-slot {
    position: relative;
    min-height: 210px;
    display: grid;
    align-content: space-between;
    padding-top: 36px;
    overflow: hidden;
    border-radius: 18px;
    background: rgba(18, 24, 41, 0.96);
    border: 1px solid rgba(148, 163, 184, 0.16);
}

.pokemon-box-slot.empty {
    background: rgba(15, 20, 32, 0.6);
    border-style: dashed;
    min-height: 210px;
}

.pokemon-box-empty {
    display: grid;
    place-items: center;
    gap: 8px;
    align-self: center;
    color: var(--text-muted);
    font-size: 12px;
}

.pokemon-box-empty i {
    font-size: 24px;
}

.pokemon-box-select {
    position: absolute;
    top: 10px;
    left: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: var(--text-muted);
    cursor: pointer;
}

.pokemon-box-select input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.pokemon-box-select input:checked + span {
    color: #b6c4ff;
}

.pokemon-box-flags {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 6px;
}

.pokemon-box-flag {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.08);
    color: var(--text-secondary);
    font-size: 11px;
}

.pokemon-box-flag.lock { color: #fde68a; }
.pokemon-box-flag.fav { color: #f9a8d4; }
.pokemon-box-flag.listed { color: #86efac; }

.pokemon-box-sprite {
    aspect-ratio: auto;
    min-height: 92px;
    background: transparent;
}

.pokemon-box-sprite img {
    width: 86px;
    height: 86px;
}

.pokemon-box-info {
    display: grid;
    gap: 8px;
    text-align: center;
    padding: 10px 10px 12px;
    background: rgba(255,255,255,0.03);
    border-top: 1px solid rgba(148, 163, 184, 0.08);
}

.pokemon-box-name {
    font-size: 12px;
    line-height: 1.25;
    white-space: normal;
    min-height: 30px;
}

.pokemon-box-value {
    font-size: 11px;
}

.pokemon-box-tags {
    display: flex;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
}

.pokemon-box-tags span {
    padding: 4px 7px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    font-size: 10px;
    color: var(--text-secondary);
}

.pokemon-box-actions {
    display: flex;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
}

@media (max-width: 1200px) {
    .pokemon-box-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

@media (max-width: 980px) {
    .trade-compose-stage,
    .trade-showdown-grid,
    .trade-detail-showcase,
    .trade-transfer-shell {
        grid-template-columns: 1fr;
    }
    .trade-stage-link,
    .trade-showdown-mid {
        justify-self: center;
    }
    .trade-box-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pokemon-box-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
    .pokemon-box-header,
    .trade-detail-column-head {
        flex-direction: column;
        align-items: flex-start;
    }
    .trade-box-grid,
    .pokemon-box-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .trade-transfer-pod {
        width: 132px;
        height: 132px;
    }
}

/* === profile media + avatar deco refresh === */
.profile-shell-themed {
    position: relative;
    border-radius: 30px;
    padding: 10px;
    background-size: cover;
    background-position: center;
}

.profile-banner-card.profile-banner-themed {
    overflow: hidden;
    background-size: cover;
    background-position: center;
}

.profile-banner-card.profile-banner-themed::before {
    background: rgba(10,14,26,0.72);
    height: 100%;
    backdrop-filter: blur(2px);
}

.profile-banner-card.profile-banner-themed::after {
    display: none;
}

.profile-media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 16px;
}

.profile-media-card {
    border-radius: 22px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    padding: 16px;
    display: grid;
    gap: 12px;
}

.profile-media-preview {
    min-height: 118px;
    border-radius: 18px;
    border: 1px dashed rgba(255,255,255,0.12);
    background: rgba(8,11,18,0.76);
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    overflow: hidden;
}

.profile-media-preview.avatar {
    min-height: 180px;
}

.profile-media-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-media-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.profile-file-input {
    display: none;
}

.profile-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(88,101,242,0.14);
    color: var(--text-primary);
    cursor: pointer;
    border: 1px solid rgba(88,101,242,0.24);
}

.profile-media-history {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 10px;
}

.profile-history-swatch {
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    background: rgba(255,255,255,0.04);
    cursor: pointer;
    min-height: 64px;
    position: relative;
}

.profile-history-swatch img,
.profile-history-swatch .cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-history-swatch .meta {
    position: absolute;
    inset: auto 6px 6px 6px;
    font-size: 10px;
    border-radius: 999px;
    padding: 3px 6px;
    background: rgba(10,14,26,0.78);
    color: #fff;
    text-align: center;
}

.profile-decoration-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
}

.profile-deco-option {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.03);
    padding: 14px;
    display: grid;
    justify-items: center;
    gap: 10px;
    cursor: pointer;
    transition: transform .18s ease, border-color .18s ease, background .18s ease;
}

.profile-deco-option:hover,
.profile-deco-option.active {
    transform: translateY(-1px);
    border-color: rgba(88,101,242,0.35);
    background: rgba(88,101,242,0.1);
}

.profile-deco-label {
    font-size: 12px;
    color: var(--text-secondary);
    text-transform: capitalize;
}

.trade-terminal-banner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 18px;
    padding: 20px 22px;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.03);
    margin-bottom: 24px;
}

.trade-terminal-banner h3 {
    margin: 0 0 8px;
}

.trade-terminal-metrics {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.trade-terminal-stat {
    min-width: 120px;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
}

.trade-terminal-stat strong {
    display: block;
    font-size: 18px;
}

.trade-terminal-stat span {
    color: var(--text-secondary);
    font-size: 12px;
}

.trade-game-card {
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(12,16,26,0.96);
    padding: 18px;
}

.trade-game-card::before {
    content: '';
    position: absolute;
    inset: auto -24px -42px auto;
    width: 130px;
    height: 130px;
    border-radius: 999px;
    background: rgba(255,255,255,0.04);
    box-shadow: 0 0 0 18px rgba(0,0,0,0.16), 0 0 0 19px rgba(255,255,255,0.05);
}

.trade-link-wire {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .08em;
}

.trade-card.trade-showdown-card.trade-pokemon-card {
    text-align: left;
    padding: 0;
    overflow: hidden;
    border-radius: 24px;
}

.trade-pokemon-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 16px 18px 12px;
}

.trade-pokemon-trainers {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.trade-pokemon-trainer {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.trade-pokemon-trainer-name {
    font-size: 13px;
    font-weight: 700;
}

.trade-pokemon-vs {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    background: rgba(255,255,255,0.07);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.trade-pokemon-body {
    padding: 0 18px 18px;
    display: grid;
    gap: 14px;
}

.trade-pokemon-lanes {
    display: grid;
    grid-template-columns: minmax(0,1fr) 104px minmax(0,1fr);
    gap: 12px;
    align-items: stretch;
}

.trade-pokemon-lane {
    border-radius: 18px;
    padding: 14px;
    background: rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.05);
}

.trade-pokemon-lane strong {
    display: block;
    margin-bottom: 8px;
}

.trade-pokemon-mid {
    border-radius: 18px;
    padding: 14px;
    background: rgba(88,101,242,0.11);
    border: 1px solid rgba(88,101,242,0.2);
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 6px;
}

.trade-terminal-empty {
    padding: 28px;
    border-radius: 22px;
    border: 1px dashed rgba(255,255,255,0.12);
    color: var(--text-secondary);
    text-align: center;
}

@media (max-width: 900px) {
    .trade-terminal-banner,
    .trade-pokemon-lanes,
    .profile-media-grid {
        grid-template-columns: 1fr;
    }
}
