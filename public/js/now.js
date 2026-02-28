(function(){
  function update(){
    const t = document.getElementById('t');
    const d = document.getElementById('d');
    if (!t || !d) return;
    const now = new Date();
    t.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    d.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  document.addEventListener('DOMContentLoaded', () => {
    update();
    setInterval(update, 1000);
    if (window.feather && typeof window.feather.replace === 'function') window.feather.replace();
  });
})();
