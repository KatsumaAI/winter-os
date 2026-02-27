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

    const custom = acts.find(a => a && a.type === 4);

    let html = '';
    html += '<div class="card">';
    html += '  <div class="lanyard">';
    html += `    <div class="avatarWrap">`;
    html += `      <img class="avatar" src="${avatar}" alt="avatar">`;
    if (decor) html += `      <img class="decor" src="${decor}" alt="decoration" loading="lazy">`;
    html += `    </div>`;
    html += '    <div style="flex:1;min-width:0">';
    html += `      <div class="name">${displayName}</div>`;
    html += `      <div class="handle">@${username}${tag ? ` <span class="guildTag">${safe(tag)}</span>` : ''}</div>`;
    html += '    </div>';
    html += `    <div class="statusDot ${statusClass(status)}" title="${safe(status)}"></div>`;
    html += '  </div>';

    // presence tags row
    html += '  <div class="presenceRow">';
    html += `    <span class="tag"><span class="statusDot ${statusClass(status)}" style="width:10px;height:10px;border-width:1px"></span><span>${safe(status)}</span></span>`;
    platformTags(data).forEach(t => {
      html += `    <span class="tag"><i data-feather="${t.icon}"></i><span>${safe(t.label)}</span></span>`;
    });
    if (data.listening_to_spotify) html += `    <span class="tag"><i data-feather="music"></i><span>Spotify</span></span>`;
    if (custom && (custom.state || custom.name)){
      html += `    <span class="tag"><i data-feather="message-square"></i><span>${safe(custom.state || custom.name)}</span></span>`;
    }
    html += '  </div>';

    // Info blocks
    html += '  <div class="subhead">Account</div>';
    html += '  <div class="kvGrid">';
    html += kvRow('id', u.id);
    html += kvRow('display_name', u.display_name || '');
    html += kvRow('global_name', u.global_name || '');
    html += kvRow('discriminator', u.discriminator || '');
    html += kvRow('bot', String(!!u.bot));
    if (u.public_flags !== undefined) html += kvRow('public_flags', String(u.public_flags));
    if (u.primary_guild && u.primary_guild.identity_enabled !== undefined) html += kvRow('primary_guild.identity_enabled', String(!!u.primary_guild.identity_enabled));
    html += '  </div>';

    if (u.avatar_decoration_data){
      html += '  <div class="subhead">Avatar decoration</div>';
      html += '  <div class="kvGrid">';
      html += kvRow('asset', u.avatar_decoration_data.asset || '');
      if (u.avatar_decoration_data.sku_id) html += kvRow('sku_id', u.avatar_decoration_data.sku_id);
      html += kvRow('expires_at', u.avatar_decoration_data.expires_at || 'null');
      html += '  </div>';
    }

    if (u.collectibles){
      html += '  <div class="subhead">Collectibles</div>';
      html += '  <div class="kvGrid">';
      if (u.collectibles.nameplate){
        const np = u.collectibles.nameplate;
        html += kvRow('nameplate.asset', np.asset || '');
        html += kvRow('nameplate.palette', np.palette || '');
        if (np.sku_id) html += kvRow('nameplate.sku_id', np.sku_id);
        html += kvRow('nameplate.expires_at', np.expires_at || 'null');
      }else{
        html += kvRow('collectibles', 'present');
      }
      html += '  </div>';
    }

    if (u.display_name_styles){
      html += '  <div class="subhead">Display name style</div>';
      html += '  <div class="kvGrid">';
      const colors = Array.isArray(u.display_name_styles.colors) ? u.display_name_styles.colors : [];
      if (colors.length){
        html += `<div class="kvItem"><div class="kvKey">colors</div><div class="kvVal">${colors.map(n => colorSwatch(Number(n).toString(16))).join(' ')}</div></div>`;
      }
      if (u.display_name_styles.effect_id !== undefined) html += kvRow('effect_id', String(u.display_name_styles.effect_id));
      if (u.display_name_styles.font_id !== undefined) html += kvRow('font_id', String(u.display_name_styles.font_id));
      html += '  </div>';
    }

    if (u.primary_guild){
      html += '  <div class="subhead">Primary guild</div>';
      html += '  <div class="kvGrid">';
      if (u.primary_guild.identity_guild_id) html += kvRow('identity_guild_id', u.primary_guild.identity_guild_id);
      if (u.primary_guild.tag) html += kvRow('tag', u.primary_guild.tag);
      if (u.primary_guild.badge) html += kvRow('badge', u.primary_guild.badge);
      html += '  </div>';
    }

    // Spotify native (if present)
    if (data.listening_to_spotify && data.spotify){
      const sp = data.spotify;
      const art = safe(sp.album_art_url);
      const song = safe(sp.song);
      const artist = safe(sp.artist);
      const start = sp.timestamps && sp.timestamps.start ? sp.timestamps.start : null;
      const end = sp.timestamps && sp.timestamps.end ? sp.timestamps.end : null;
      const pid = safe(sp.track_id || '');

      html += '  <div class="subhead">Spotify</div>';
      html += '  <div class="spotify">';
      html += `    <img src="${art}" alt="album art">`;
      html += '    <div style="flex:1">';
      html += `      <div class="sn">${song}</div>`;
      html += `      <div class="sd">${artist}</div>`;
      html += '      <div class="prog">';
      html += '        <div class="progbar"><span id="spProg"></span></div>';
      html += '        <div class="progt"><span id="spCur">0:00</span><span id="spEnd">0:00</span></div>';
      html += '      </div>';
      html += '    </div>';
      html += `    <a class="tag" style="text-decoration:none" href="https://open.spotify.com/track/${pid}" target="_blank" rel="noreferrer noopener"><i data-feather="external-link"></i><span>Open</span></a>`;
      html += '  </div>';

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

    // Activities list
    html += '  <div class="subhead">Activities</div>';
    if (!acts.length){
      html += '  <div class="subtitle">No activity data right now.</div>';
    }else{
      html += '  <div class="actList">';
      acts.forEach((a, idx) => {
        if (!a) return;
        html += renderActivity(a, idx);
      });
      html += '  </div>';
    }

    html += '</div>';

    c.innerHTML = html;

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