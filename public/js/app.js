(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

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
    const bar = qs('#bootprogress');
    if (!bootEl || !bar) return;

    let p = 0;
    const t = setInterval(() => {
      p += Math.random()*14 + 6;
      if (p >= 100){
        p = 100;
        clearInterval(t);
        setTimeout(() => bootEl.classList.add('hidden'), 480);
      }
      bar.style.width = p + '%';
    }, 140);
  }

  // Clock
  function tick(){
    const el = qs('#tbClock');
    if (!el) return;
    const d = new Date();
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    el.textContent = `${time} · ${date}`;
  }

  // Start menu
  let startOpen = false;
  function openStart(){
    const menu = qs('#startMenu');
    const btn = qs('#startBtn');
    if (!menu || !btn) return;
    menu.classList.add('show');
    btn.classList.add('active');
    startOpen = true;
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
  }
  function toggleStart(){
    if (startOpen) closeStart();
    else openStart();
  }

  // Panels
  function showPanel(id){
    qsa('.navitem').forEach(b => b.classList.toggle('active', b.dataset.panel === id));
    qsa('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${id}`));
    // close start menu when navigating
    closeStart();
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
        if (href.startsWith('/') ) window.location.href = href;
        else window.open(href, '_blank', 'noopener,noreferrer');
      }
        if (panel) showPanel(panel);
      });
    });

    // taskbar
    const startBtn = qs('#startBtn');
    if (startBtn) startBtn.addEventListener('click', toggleStart);

    // pinned apps
    qsa('[data-pin]').forEach(pin => {
      pin.addEventListener('click', () => {
        const panel = pin.dataset.panel;
        const href = pin.dataset.href;
        if (href){
        if (href.startsWith('/') ) window.location.href = href;
        else window.open(href, '_blank', 'noopener,noreferrer');
      }
        if (panel) showPanel(panel);
      });
    });

    // theme toggle
    const themeBtn = qs('#themeBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // outside click close
    document.addEventListener('click', (e) => {
      const menu = qs('#startMenu');
      const btn = qs('#startBtn');
      if (!menu || !btn) return;
      if (!startOpen) return;
      const within = menu.contains(e.target) || btn.contains(e.target);
      if (!within) closeStart();
    });

    // keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && startOpen) closeStart();
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

    // feather icons
    if (window.feather && typeof window.feather.replace === 'function'){
      window.feather.replace();
    }
  });
})();
