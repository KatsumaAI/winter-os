(function(){
  const USER_ID = '481475041217871882';
  const el = () => document.getElementById('discordContent');

  function statusClass(s){
    if (s === 'online') return 'status-online';
    if (s === 'idle') return 'status-idle';
    if (s === 'dnd') return 'status-dnd';
    return 'status-offline';
  }

  function safe(v){
    return (v || '').toString().replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }

  function render(data){
    const c = el();
    if (!c) return;

    if (!data || !data.discord_user){
      c.innerHTML = '<div class="card"><div class="subtitle">Discord is currently unavailable.</div></div>';
      return;
    }

    const u = data.discord_user;
    const status = data.discord_status || 'offline';
    const acts = data.activities || [];
    const playing = acts.find(a => a && a.type === 0);

    const avatar = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`;

    let html = '';
    html += '<div class="card">';
    html += '  <div class="lanyard">';
    html += `    <img src="${avatar}" alt="avatar">`;
    html += '    <div style="flex:1">';
    html += `      <div class="name">${safe(u.global_name || u.username)}</div>`;
    html += `      <div class="handle">@${safe(u.username)}</div>`;
    html += '    </div>';
    html += `    <div class="statusDot ${statusClass(status)}" title="${safe(status)}"></div>`;
    html += '  </div>';

    if (playing){
      html += '  <div class="activity">';
      if (playing.assets && playing.assets.large_image && playing.application_id){
        const img = `https://cdn.discordapp.com/app-assets/${playing.application_id}/${playing.assets.large_image}.png?size=128`;
        html += `    <img src="${img}" alt="activity">`;
      }
      html += '    <div>';
      html += `      <div class="an">${safe(playing.name)}</div>`;
      if (playing.details) html += `      <div class="ad">${safe(playing.details)}</div>`;
      html += '    </div>';
      html += '  </div>';
    }

    html += '</div>';
    c.innerHTML = html;
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
