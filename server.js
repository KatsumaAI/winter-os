const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const PAGES_DIR = path.join(__dirname, 'pages');

// Static assets
app.use('/public', express.static(path.join(__dirname, 'public'), {
  fallthrough: true,
  etag: true,
  maxAge: '7d'
}));

// Pages
app.get('/', (req, res) => res.sendFile(path.join(PAGES_DIR, 'index.html')));
app.get('/nohello', (req, res) => res.sendFile(path.join(PAGES_DIR, 'nohello.html')));
app.get('/now', (req, res) => res.sendFile(path.join(PAGES_DIR, 'now.html')));
app.get('/fakeisloading', (req, res) => res.sendFile(path.join(PAGES_DIR, 'fakeisloading.html')));

// .well-known (Discord domain verification / association)
// Use app.use so it reliably matches "/.well-known/discord" with/without trailing slash.
app.use('/.well-known/discord', (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.sendStatus(405);
  }
  res.type('text/plain; charset=utf-8');
  return res.send('dh=b684faa1f7b0cc2947d4139e09851f0158b1461e');
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(PAGES_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Katsuma Social running on port ${PORT}`);
});
