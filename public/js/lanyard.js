(function(){
  const USER_ID = '481475041217871882';
  const el = () => document.getElementById('discordContent');

  let tickers = [];

  const ACT_TYPES = {
    0: 'Playing',
    1: 'Streaming',
    2: 'Listening',
    3: 'Watching',
    4: 'Custom Status',
    5: 'Competing'
  };

  function clearTickers(){
    tickers.forEach(t => clearInterval(t));
    tickers = [];
  }

  function statusClass(s){
    if (s === 'online') return 'status-online';
    if (s === 'idle') return 'status-idle';
    if (s === 'dnd') return 'status-dnd';
    return 'status-offline';
  }

  function safe(v){
    return (v === null || v === undefined) ? '' : v.toString().replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function fmtMs(ms){
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2,'0')}`;
  }

  function fmtTs(ts){
    if (!ts) return '';
    try{
      const d = new Date(ts);
      return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    }catch(_){
      return String(ts);
    }
  }

  function resolveAsset(appId, key){
    if (!key) return null;
    if (typeof key !== 'string') return null;

    // Media proxy
    if (key.startsWith('mp:')){
      return `https://media.discordapp.net/${key.slice(3)}`;
    }

    // Spotify activity keys sometimes look like spotify:...
    if (key.startsWith('spotify:')){
      const id = key.split(':')[1];
      if (id) return `https://i.scdn.co/image/${id}`;
    }

    if (!appId) return null;
    return `https://cdn.discordapp.com/app-assets/${appId}/${key}.png?size=256`;
  }

  function platformTags(data){
    const tags = [];
    if (data.active_on_discord_desktop) tags.push({ icon:'monitor', label:'Desktop' });
    if (data.active_on_discord_mobile) tags.push({ icon:'smartphone', label:'Mobile' });
    if (data.active_on_discord_web) tags.push({ icon:'globe', label:'Web' });
    if (data.active_on_discord_embedded) tags.push({ icon:'box', label:'Embedded' });
    return tags;
  }


  function findSoundCloud(acts){
    return (acts || []).find(a => {
      if (!a) return false;
      if (a.name === 'SoundCloud') return true;
      const st = a.assets && a.assets.small_text ? String(a.assets.small_text).toLowerCase() : '';
      return st.includes('soundcloud');
    });
  }

  function updateMusicWidget(data){
    const w = document.getElementById('musicWidget');
    if (!w) return;

    const acts = data && Array.isArray(data.activities) ? data.activities : [];
    const sc = findSoundCloud(acts);

    if (!sc){
      w.classList.add('hidden');
      w.setAttribute('aria-hidden', 'true');
      return;
    }

    const title = sc.details || (sc.assets && sc.assets.large_text) || sc.name || 'SoundCloud';
    const artist = sc.state || (sc.assets && sc.assets.small_text) || '';

    const artKey = sc.assets && sc.assets.large_image ? sc.assets.large_image : null;
    const artUrl = resolveAsset(sc.application_id || '', artKey);

    const artEl = document.getElementById('musicArt');
    if (artEl){
      artEl.src = artUrl || 'https://cdn.discordapp.com/embed/avatars/0.png';
    }

    const tEl = document.getElementById('musicTrack');
    if (tEl) tEl.textContent = title;

    const aEl = document.getElementById('musicArtist');
    if (aEl) aEl.textContent = artist;

    const open = document.getElementById('musicOpen');
    if (open){
      open.href = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(title)}`;
    }

    // progress
    const start = sc.timestamps && sc.timestamps.start ? sc.timestamps.start : null;
    const end = sc.timestamps && sc.timestamps.end ? sc.timestamps.end : null;

    const wrap = document.getElementById('musicProgWrap');
    if (wrap){
      if (start && end && end > start) wrap.classList.remove('hidden');
      else wrap.classList.add('hidden');
    }

    w.classList.remove('hidden');
    w.setAttribute('aria-hidden', 'false');

    if (window.feather && typeof window.feather.replace === 'function'){
      window.feather.replace();
    }

    if (start && end && end > start){
      const run = () => {
        const now = Date.now();
        const cur = Math.min(end, Math.max(start, now));
        const pct = ((cur - start) / (end - start)) * 100;

        const bar = document.getElementById('musicProg');
        const curEl = document.getElementById('musicCur');
        const endEl = document.getElementById('musicEnd');

        if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        if (curEl) curEl.textContent = fmtMs(cur - start);
        if (endEl) endEl.textContent = fmtMs(end - start);
      };
      setTimeout(run, 0);
      tickers.push(setInterval(run, 1000));
    }
  }

  function kvRow(k, v){
    return `<div class="kvItem"><div class="kvKey">${safe(k)}</div><div class="kvVal">${safe(v)}</div></div>`;
  }

  function colorSwatch(hex){
    if (!hex) return '';
    const h = String(hex).replace(/^#/, '');
    const css = `#${h.padStart(6,'0').slice(-6)}`;
    return `<span class="swatch" style="background:${css}"></span><span>${safe(css)}</span>`;
  }

  function tryJson(x){
    try{ return JSON.stringify(x, null, 2); }catch(_){ return String(x); }
  }

  function renderActivity(a, idx){
    const typeLabel = ACT_TYPES[a.type] || `Type ${a.type}`;
    const name = a.name || '';
    const appId = a.application_id || '';
    const created = a.created_at ? fmtTs(a.created_at) : '';

    const largeKey = a.assets && a.assets.large_image ? a.assets.large_image : null;
    const smallKey = a.assets && a.assets.small_image ? a.assets.small_image : null;
    const largeImg = resolveAsset(appId, largeKey);
    const smallImg = resolveAsset(appId, smallKey);

    const details = a.details || '';
    const state = a.state || '';
    const emoji = a.emoji ? (a.emoji.name || '') : '';
    const platform = a.platform || '';
    const sessionId = a.session_id || '';

    const hasTimes = a.timestamps && (a.timestamps.start || a.timestamps.end);
    const start = hasTimes ? a.timestamps.start : null;
    const end = hasTimes ? a.timestamps.end : null;

    const progId = `actProg_${idx}`;
    const curId = `actCur_${idx}`;
    const endId = `actEnd_${idx}`;

    let html = '';
    html += `<div class="actCard">`;
    html += `  <div class="actTop">`;
    html += `    <div class="actTitle"><span class="actType">${safe(typeLabel)}</span><span class="actName">${safe(name)}</span></div>`;
    html += `    <div class="actMeta">${safe(created)}</div>`;
    html += `  </div>`;

    if (largeImg || smallImg){
      html += `  <div class="actAssets">`;
      if (largeImg){
        html += `    <div class="assetBlock"><img src="${safe(largeImg)}" alt="large asset" loading="lazy">`;
        if (a.assets && a.assets.large_text) html += `<div class="assetLabel">${safe(a.assets.large_text)}</div>`;
        html += `    </div>`;
      }
      if (smallImg){
        html += `    <div class="assetBlock"><img src="${safe(smallImg)}" alt="small asset" loading="lazy">`;
        if (a.assets && a.assets.small_text) html += `<div class="assetLabel">${safe(a.assets.small_text)}</div>`;
        html += `    </div>`;
      }
      html += `  </div>`;
    }

    if (details || state){
      html += `  <div class="actText">`;
      if (details) html += `    <div class="actDetails">${safe(details)}</div>`;
      if (state) html += `    <div class="actState">${safe(state)}</div>`;
      html += `  </div>`;
    }

    // Time progress (for activities with timestamps)
    if (start && end && end > start){
      html += `  <div class="actProg">`;
      html += `    <div class="progbar"><span id="${progId}"></span></div>`;
      html += `    <div class="progt"><span id="${curId}">0:00</span><span id="${endId}">0:00</span></div>`;
      html += `  </div>`;
    }

    // Key details grid
    html += `  <div class="kvGrid">`;
    if (a.id) html += kvRow('id', a.id);
    if (platform) html += kvRow('platform', platform);
    if (sessionId) html += kvRow('session_id', sessionId);
    if (emoji) html += kvRow('emoji', emoji);
    html += `  </div>`;
    html += `</div>`;

    // attach ticker after injection
    if (start && end && end > start){
      const run = () => {
        const now = Date.now();
        const cur = Math.min(end, Math.max(start, now));
        const pct = ((cur - start) / (end - start)) * 100;

        const bar = document.getElementById(progId);
        const curEl = document.getElementById(curId);
        const endEl = document.getElementById(endId);

        if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        if (curEl) curEl.textContent = fmtMs(cur - start);
        if (endEl) endEl.textContent = fmtMs(end - start);
      };
      setTimeout(run, 0);
      tickers.push(setInterval(run, 1000));
    }

    return html;
  }

    function render(data){
    const c = el();
    if (!c) return;

    clearTickers();
    updateMusicWidget(data);

    if (!data || !data.discord_user){
      c.innerHTML = '<div class="card"><div class="subtitle">Discord is currently unavailable.</div></div>';
      return;
    }

    const u = data.discord_user;
    const status = data.discord_status || 'offline';
    const acts = Array.isArray(data.activities) ? data.activities : [];

    const avatar = u.avatar
      ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const decorAsset = u.avatar_decoration_data && u.avatar_decoration_data.asset ? u.avatar_decoration_data.asset : null;
    const decor = decorAsset ? `https://cdn.discordapp.com/avatar-decoration-presets/${decorAsset}.png?size=96` : null;

    const displayName = safe(u.global_name || u.display_name || u.username);
    const username = safe(u.username);
    const tag = u.primary_guild && u.primary_guild.tag ? u.primary_guild.tag : '';

    const custom = acts.find(a => a && a.type === 4 && (a.state || a.name));

    // --- Hero / presence card
    let hero = '';
    hero += '<div class="card discordHero">';
    hero += '  <div class="lanyard">';
    hero += `    <div class="avatarWrap">`;
    hero += `      <img class="avatar" src="${avatar}" alt="avatar">`;
    if (decor) hero += `      <img class="decor" src="${decor}" alt="decoration" loading="lazy">`;
    hero += `    </div>`;
    hero += '    <div style="flex:1;min-width:0">';
    hero += `      <div class="name">${displayName}</div>`;
    hero += `      <div class="handle">@${username}${tag ? ` <span class="guildTag">${safe(tag)}</span>` : ''}</div>`;
    hero += '    </div>';
    hero += `    <div class="statusDot ${statusClass(status)}" title="${safe(status)}"></div>`;
    hero += '  </div>';

    hero += '  <div class="presenceRow">';
    hero += `    <span class="tag"><span class="statusDot ${statusClass(status)}" style="width:10px;height:10px;border-width:1px"></span><span>${safe(status)}</span></span>`;
    platformTags(data).forEach(t => {
      hero += `    <span class="tag"><i data-feather="${t.icon}"></i><span>${safe(t.label)}</span></span>`;
    });
    if (data.listening_to_spotify) hero += `    <span class="tag"><i data-feather="music"></i><span>Spotify</span></span>`;
    hero += '  </div>';

    if (custom && custom.state){
      hero += `  <div class="activity" style="margin-top:10px">`;
      hero += `    <div style="flex:1;min-width:0">`;
      hero += `      <div class="an">Custom status</div>`;
      hero += `      <div class="ad" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safe(custom.state)}</div>`;
      hero += `    </div>`;
      hero += `  </div>`;
    }

    hero += '</div>';

    // --- Account section
    let account = '';
    account += '<div class="card discordSection">';
    account += '  <div class="sectionHead"><div class="st">Account</div><div class="badge">Live</div></div>';
    account += '  <div class="kvGrid">';
    account += kvRow('id', u.id);
    account += kvRow('username', u.username || '');
    account += kvRow('display_name', u.display_name || '');
    account += kvRow('global_name', u.global_name || '');
    account += kvRow('discriminator', u.discriminator || '');
    account += kvRow('bot', String(!!u.bot));
    if (u.public_flags !== undefined) account += kvRow('public_flags', String(u.public_flags));
    account += kvRow('status', status);
    account += kvRow('active_desktop', String(!!data.active_on_discord_desktop));
    account += kvRow('active_mobile', String(!!data.active_on_discord_mobile));
    account += kvRow('active_web', String(!!data.active_on_discord_web));
    account += kvRow('active_embedded', String(!!data.active_on_discord_embedded));
    account += '  </div>';
    account += '</div>';

    // --- Cosmetics section (decoration / collectibles / name styles)
    let cosmetics = '';
    const hasCosmetics = !!u.avatar_decoration_data || !!u.collectibles || !!u.display_name_styles;
    if (hasCosmetics){
      cosmetics += '<div class="card discordSection">';
      cosmetics += '  <div class="sectionHead"><div class="st">Cosmetics</div><div class="badge">Profile</div></div>';
      cosmetics += '  <div class="kvGrid">';

      if (u.avatar_decoration_data){
        cosmetics += kvRow('decoration.asset', u.avatar_decoration_data.asset || '');
        if (u.avatar_decoration_data.sku_id) cosmetics += kvRow('decoration.sku_id', u.avatar_decoration_data.sku_id);
        cosmetics += kvRow('decoration.expires_at', u.avatar_decoration_data.expires_at || 'null');
      }

      if (u.collectibles && u.collectibles.nameplate){
        const np = u.collectibles.nameplate;
        cosmetics += kvRow('nameplate.asset', np.asset || '');
        cosmetics += kvRow('nameplate.palette', np.palette || '');
        if (np.sku_id) cosmetics += kvRow('nameplate.sku_id', np.sku_id);
        cosmetics += kvRow('nameplate.expires_at', np.expires_at || 'null');
      }

      if (u.display_name_styles){
        const colors = Array.isArray(u.display_name_styles.colors) ? u.display_name_styles.colors : [];
        if (colors.length){
          cosmetics += `<div class="kvItem"><div class="kvKey">colors</div><div class="kvVal">${colors.map(n => colorSwatch(Number(n).toString(16))).join(' ')}</div></div>`;
        }
        if (u.display_name_styles.effect_id !== undefined) cosmetics += kvRow('style.effect_id', String(u.display_name_styles.effect_id));
        if (u.display_name_styles.font_id !== undefined) cosmetics += kvRow('style.font_id', String(u.display_name_styles.font_id));
      }

      cosmetics += '  </div>';
      cosmetics += '</div>';
    }

    // --- Spotify native (if present)
    let spotify = '';
    if (data.listening_to_spotify && data.spotify){
      const sp = data.spotify;
      const art = safe(sp.album_art_url);
      const song = safe(sp.song);
      const artist = safe(sp.artist);
      const start = sp.timestamps && sp.timestamps.start ? sp.timestamps.start : null;
      const end = sp.timestamps && sp.timestamps.end ? sp.timestamps.end : null;
      const pid = safe(sp.track_id || '');

      spotify += '<div class="card discordSection">';
      spotify += '  <div class="sectionHead"><div class="st">Spotify</div><div class="badge">Listening</div></div>';
      spotify += '  <div class="spotify" style="margin-top:0">';
      spotify += `    <img src="${art}" alt="album art">`;
      spotify += '    <div style="flex:1;min-width:0">';
      spotify += `      <div class="sn">${song}</div>`;
      spotify += `      <div class="sd">${artist}</div>`;
      spotify += '      <div class="prog">';
      spotify += '        <div class="progbar"><span id="spProg"></span></div>';
      spotify += '        <div class="progt"><span id="spCur">0:00</span><span id="spEnd">0:00</span></div>';
      spotify += '      </div>';
      spotify += '    </div>';
      spotify += `    <a class="tag" style="text-decoration:none" href="https://open.spotify.com/track/${pid}" target="_blank" rel="noreferrer noopener"><i data-feather="external-link"></i><span>Open</span></a>`;
      spotify += '  </div>';
      spotify += '</div>';

      const run = () => {
        if (!start || !end || end <= start) return;
        const now = Date.now();
        const cur = Math.min(end, Math.max(start, now));
        const pct = ((cur - start) / (end - start)) * 100;
        const bar = document.getElementById('spProg');
        const curEl = document.getElementById('spCur');
        const endEl = document.getElementById('spEnd');
        if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        if (curEl) curEl.textContent = fmtMs(cur - start);
        if (endEl) endEl.textContent = fmtMs(end - start);
      };
      setTimeout(run, 0);
      tickers.push(setInterval(run, 1000));
    }

    // --- Activities section (scrolls inside its own card)
    let actsHtml = '';
    actsHtml += '<div class="card discordActivities discordSection">';
    actsHtml += `  <div class="sectionHead"><div class="st">Activities</div><div class="badge">${acts.length}</div></div>`;
    if (!acts.length){
      actsHtml += '  <div class="subtitle">No activity data right now.</div>';
    }else{
      actsHtml += '  <div class="actList">';
      acts.forEach((a, idx) => {
        if (!a) return;
        actsHtml += renderActivity(a, idx);
      });
      actsHtml += '  </div>';
    }
    actsHtml += '</div>';

    c.innerHTML = `
      <div class="discordLayout">
        <div class="discordCol">
          ${hero}
          ${account}
          ${cosmetics}
          ${spotify}
        </div>
        <div class="discordCol">
          ${actsHtml}
        </div>
      </div>
    `;

    if (window.feather && typeof window.feather.replace === 'function'){
      window.feather.replace();
    }
  }

  async function poll(){
    try{
      const r = await fetch(`https://api.lanyard.rest/v1/users/${USER_ID}`, { cache: 'no-store' });
      const j = await r.json();
      render(j && j.data);
    }catch(_){
      render(null);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    poll();
    setInterval(poll, 30000);
  });
})();