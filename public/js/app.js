(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));
  const byId = (id) => document.getElementById(id);

  const readLS = (k, fallback) => {
    try{
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    }catch(_){
      return fallback;
    }
  };
  const writeLS = (k, v) => {
    try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){ /* ignore */ }
  };

  // Theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');

  function setTheme(mode){
    if (mode === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', mode);
    updateThemeIcon();
  }

  function toggleTheme(){
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    setTheme(isLight ? 'dark' : 'light');
  }

  function updateThemeIcon(){
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const btn = qs('#themeBtn');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isLight));
    btn.title = isLight ? 'Switch to dark' : 'Switch to light';
  }

  // Boot
  function boot(){
    const bootEl = qs('#boot');
    if (!bootEl) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lines = qsa('.boot-line', bootEl);

    const finish = () => {
      if (bootEl.classList.contains('hidden')) return;
      bootEl.classList.add('boot-out');
      setTimeout(() => bootEl.classList.add('hidden'), 520);
      try { sessionStorage.setItem('booted', '1'); } catch(_){ /* ignore */ }
    };

    const skip = () => finish();
    bootEl.addEventListener('click', skip, { once:true });
    document.addEventListener('keydown', skip, { once:true });

    // If you've already booted this tab, keep it snappy.
    let already = false;
    try { already = sessionStorage.getItem('booted') === '1'; } catch(_){ /* ignore */ }
    if (already || reduced){
      setTimeout(finish, 160);
      return;
    }

    // Show hint a moment later.
    setTimeout(() => bootEl.classList.add('hint'), 900);

    // Walk through the boot lines.
    if (!lines.length){
      setTimeout(finish, 900);
      return;
    }

    let i = 0;
    lines.forEach(l => l.classList.remove('active','done'));
    lines[0].classList.add('active','done');
    i = 1;

    const stepMs = 460;
    const t = setInterval(() => {
      if (i >= lines.length){
        clearInterval(t);
        setTimeout(finish, 520);
        return;
      }
      lines[i-1].classList.remove('active');
      lines[i].classList.add('active','done');
      i++;
    }, stepMs);
  }

  // Clock
  function tick(){
    const el = qs('#tbClock');
    if (!el) return;
    const d = new Date();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const t1 = el.querySelector('.t1');
    const t2 = el.querySelector('.t2');
    if (t1 && t2){
      t1.textContent = time;
      t2.textContent = date;
    }else{
      el.textContent = `${time} · ${date}`;
    }
    // Flyout header date
    const fd = byId('flyoutDate');
    if (fd){
      fd.textContent = d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    }
  }

  // Start menu
  let startOpen = false;
  const backdropEl = () => byId('uiBackdrop');
  function syncBackdrop(){
    const b = backdropEl();
    if (!b) return;
    const on = startOpen || flyoutOpen;
    b.classList.toggle('show', on);
    b.style.pointerEvents = on ? 'auto' : 'none';
  }
  function openStart(){
    const menu = qs('#startMenu');
    const btn = qs('#startBtn');
    if (!menu || !btn) return;
    menu.classList.add('show');
    btn.classList.add('active');
    startOpen = true;
    syncBackdrop();
    const input = qs('#startSearch');
    if (input) setTimeout(() => input.focus(), 0);
  }
  function closeStart(){
    const menu = qs('#startMenu');
    const btn = qs('#startBtn');
    if (!menu || !btn) return;
    menu.classList.remove('show');
    btn.classList.remove('active');
    startOpen = false;
    syncBackdrop();
  }
  function toggleStart(){
    if (startOpen) closeStart();
    else openStart();
  }

  // Right flyout (calendar/widgets)
  let flyoutOpen = false;
  const flyout = () => byId('rightFlyout');
  function openFlyout(){
    const f = flyout();
    if (!f) return;
    f.classList.add('show');
    f.setAttribute('aria-hidden', 'false');
    flyoutOpen = true;
    syncBackdrop();
    // close start if open
    if (startOpen) closeStart();
  }
  function closeFlyout(){
    const f = flyout();
    if (!f) return;
    f.classList.remove('show');
    f.setAttribute('aria-hidden', 'true');
    flyoutOpen = false;
    syncBackdrop();
  }
  function toggleFlyout(){
    if (flyoutOpen) closeFlyout();
    else openFlyout();
  }

  // Calendar + agenda
  const todayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  };
  let sel = todayKey();
  let viewY = new Date().getFullYear();
  let viewM = new Date().getMonth();

  function setSelected(key){
    sel = key;
    renderCalendar();
    renderAgenda();
  }

  function renderCalendar(){
    const grid = byId('calGrid');
    const label = byId('calMonth');
    if (!grid || !label) return;

    const first = new Date(viewY, viewM, 1);
    const last = new Date(viewY, viewM + 1, 0);
    const monthName = first.toLocaleDateString('en-US', { month:'long', year:'numeric' });
    label.textContent = monthName;

    const startDow = first.getDay();
    const daysInMonth = last.getDate();

    const prevLast = new Date(viewY, viewM, 0);
    const prevDays = prevLast.getDate();

    const cells = [];
    // prev month fill
    for (let i = 0; i < startDow; i++){
      const dayNum = prevDays - (startDow - 1 - i);
      const d = new Date(viewY, viewM - 1, dayNum);
      cells.push({ date: d, mute:true });
    }
    // current
    for (let d = 1; d <= daysInMonth; d++){
      cells.push({ date: new Date(viewY, viewM, d), mute:false });
    }
    // next fill to 42 cells
    while (cells.length < 42){
      const idx = cells.length - (startDow + daysInMonth) + 1;
      cells.push({ date: new Date(viewY, viewM + 1, idx), mute:true });
    }

    const tkey = todayKey();
    grid.innerHTML = cells.map(({date, mute}) => {
      const y = date.getFullYear();
      const m = String(date.getMonth()+1).padStart(2,'0');
      const da = String(date.getDate()).padStart(2,'0');
      const key = `${y}-${m}-${da}`;
      const cls = [
        'cday',
        mute ? 'mute' : '',
        key === tkey ? 'today' : '',
        key === sel ? 'sel' : ''
      ].filter(Boolean).join(' ');
      return `<button class="${cls}" data-date="${key}" aria-label="${key}">${date.getDate()}</button>`;
    }).join('');

    // wire day clicks
    qsa('.cday', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.date;
        if (!k) return;
        const parts = k.split('-').map(n => parseInt(n,10));
        if (parts.length === 3){
          viewY = parts[0];
          viewM = parts[1]-1;
        }
        setSelected(k);
      });
    });
  }

  function renderAgenda(){
    const meta = byId('agendaMeta');
    const list = byId('agendaList');
    if (!meta || !list) return;

    const d = new Date(sel + 'T00:00:00');
    meta.textContent = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

    // View-only schedule panel (no add/remove UI on purpose)
    list.innerHTML = '<div class="subtitle">No events to show.</div>' +
      '<div class="subtitle" style="margin-top:8px">(Calendar syncing can be added later if you want.)</div>';
  }

// Panels
  function showPanel(id){
    qsa('.navitem').forEach(b => b.classList.toggle('active', b.dataset.panel === id));
    qsa('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${id}`));
    // close start menu when navigating
    closeStart();
    // close flyout when navigating
    closeFlyout();
  }

  function wire(){
    // nav buttons
    qsa('.navitem').forEach(btn => {
      btn.addEventListener('click', () => showPanel(btn.dataset.panel));
    });

    // desktop icons
    qsa('.desk-icon').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        const href = btn.dataset.href;
        if (href){
          if (href.startsWith('/')) window.location.href = href;
          else window.open(href, '_blank', 'noopener,noreferrer');
        }
        if (panel) showPanel(panel);
      });
    });

    // taskbar
    const startBtn = qs('#startBtn');
    if (startBtn) startBtn.addEventListener('click', toggleStart);

    const clockBtn = qs('#tbClock');
    if (clockBtn) clockBtn.addEventListener('click', toggleFlyout);

    const flyClose = byId('flyoutClose');
    if (flyClose) flyClose.addEventListener('click', closeFlyout);

    // calendar nav
    const calPrev = byId('calPrev');
    const calNext = byId('calNext');
    if (calPrev) calPrev.addEventListener('click', () => { viewM--; if (viewM < 0){ viewM = 11; viewY--; } renderCalendar(); });
    if (calNext) calNext.addEventListener('click', () => { viewM++; if (viewM > 11){ viewM = 0; viewY++; } renderCalendar(); });

    const openCal = byId('openCalendar');
    if (openCal) openCal.addEventListener('click', () => { openFlyout(); });

    // tilecards that navigate panels
    qsa('.tilecard[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        if (panel) showPanel(panel);
      });
    });

    // pinned apps (start menu)
    qsa('[data-pin]').forEach(pin => {
      pin.addEventListener('click', () => {
        const panel = pin.dataset.panel;
        const href = pin.dataset.href;
        if (href){
          if (href.startsWith('/')) window.location.href = href;
          else window.open(href, '_blank', 'noopener,noreferrer');
        }
        if (panel) showPanel(panel);
      });
    });

    // theme toggle
    const themeBtn = qs('#themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // outside click close start
    document.addEventListener('click', (e) => {
      const menu = qs('#startMenu');
      const btn = qs('#startBtn');
      if (!menu || !btn) return;
      if (!startOpen) return;
      const within = menu.contains(e.target) || btn.contains(e.target);
      if (!within) closeStart();
    });

    // outside click close flyout
    document.addEventListener('click', (e) => {
      const f = flyout();
      const clock = qs('#tbClock');
      if (!f || !clock) return;
      if (!flyoutOpen) return;
      const within = f.contains(e.target) || clock.contains(e.target);
      if (!within) closeFlyout();
    });

    // keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && startOpen) closeStart();
      if (e.key === 'Escape' && flyoutOpen) closeFlyout();
      // Win key-ish: Ctrl/Cmd+Space toggles start
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === 'Space'){
        e.preventDefault();
        toggleStart();
      }
    });

    // start search filtering (pinned)
    const search = qs('#startSearch');
    if (search){
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        qsa('[data-pin]').forEach(pin => {
          const label = (pin.dataset.label || '').toLowerCase();
          pin.style.display = (!q || label.includes(q)) ? '' : 'none';
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot();
    tick();
    setInterval(tick, 1000);
    wire();
    updateThemeIcon();
    // init calendar + schedule
    renderCalendar();
    renderAgenda();

    // feather icons
    if (window.feather && typeof window.feather.replace === 'function'){
      window.feather.replace();
    }
  });
})();
