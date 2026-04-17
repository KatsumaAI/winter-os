
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const projectRoot = path.join(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const configPath = path.join(dataDir, 'gist-backup-config.json');
const trackedFiles = ['katsucases.json', 'community.json', 'casevs.json', 'replays.json', 'sessions.json'];
const GITHUB_API = 'https://api.github.com';

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function safeReadJson(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return fallback;
    }
}

function normalizeGistId(value = '') {
    const text = String(value || '').trim();
    if (!text) return '';
    const gistMatch = text.match(/(?:gist\.github\.com\/(?:[^/]+\/)?|\/gists\/)([a-f0-9]{8,})/i);
    return gistMatch ? gistMatch[1] : text.replace(/[^a-f0-9]/ig, '').slice(0, 64);
}

function loadConfig() {
    ensureDir(dataDir);
    return safeReadJson(configPath, {
        token: '',
        gistId: '',
        description: 'KatsuCases site data backup',
        isPublic: false,
        lastBackupAt: null,
        lastBackupGistId: null,
        lastBackupVersion: null,
        lastRestoreAt: null,
        lastRestoreVersion: null
    });
}

function saveConfig(config) {
    ensureDir(dataDir);
    const next = {
        ...loadConfig(),
        ...config,
        gistId: normalizeGistId(config.gistId || ''),
        token: String(config.token || '').trim()
    };
    fs.writeFileSync(configPath, JSON.stringify(next, null, 2));
    return next;
}

function githubHeaders(token = '') {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'KatsuCases-Backup',
        'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function githubRequest(method, url, token = '', data) {
    const response = await axios({
        method,
        url,
        data,
        headers: githubHeaders(token),
        timeout: 30000,
        validateStatus: () => true
    });
    if (response.status >= 200 && response.status < 300) return response.data;
    const message = response.data?.message || `GitHub API request failed with status ${response.status}`;
    throw new Error(message);
}

function buildManifest(files) {
    return {
        created_at: new Date().toISOString(),
        files,
        site: 'KatsuCases',
        format_version: 1
    };
}

function buildGistFiles() {
    const files = {};
    const copied = [];
    for (const fileName of trackedFiles) {
        const src = path.join(dataDir, fileName);
        if (!fs.existsSync(src)) continue;
        files[fileName] = { content: fs.readFileSync(src, 'utf8') };
        copied.push(fileName);
    }
    files['manifest.json'] = { content: JSON.stringify(buildManifest(copied), null, 2) };
    return { files, copied };
}

async function readGistFileContent(file) {
    if (!file) return '';
    if (!file.truncated && typeof file.content === 'string') return file.content;
    if (file.raw_url) {
        const response = await axios.get(file.raw_url, { timeout: 30000, responseType: 'text', validateStatus: () => true });
        if (response.status >= 200 && response.status < 300) return String(response.data || '');
    }
    throw new Error(`Could not read gist file ${file.filename || 'unknown file'}`);
}

async function fetchGist(gistId, token = '') {
    const cleanId = normalizeGistId(gistId);
    if (!cleanId) throw new Error('A Gist ID is required.');
    return githubRequest('get', `${GITHUB_API}/gists/${cleanId}`, token);
}

async function getStatus(config = loadConfig()) {
    const gistId = normalizeGistId(config.gistId || '');
    const status = {
        config: { ...config, gistId },
        gistConfigured: Boolean(gistId),
        gistExists: false,
        gistId,
        gistUrl: '',
        gistUpdatedAt: null,
        gistPublic: Boolean(config.isPublic),
        trackedFiles
    };
    if (!gistId) return status;
    try {
        const gist = await fetchGist(gistId, config.token || '');
        status.gistExists = true;
        status.gistId = gist.id;
        status.gistUrl = gist.html_url || '';
        status.gistUpdatedAt = gist.updated_at || null;
        status.gistPublic = Boolean(gist.public);
        status.owner = gist.owner?.login || '';
    } catch (error) {
        status.error = error.message;
    }
    return status;
}

async function backupNow(overrides = {}) {
    const config = saveConfig({ ...loadConfig(), ...overrides });
    const token = String(config.token || '').trim();
    if (!token) throw new Error('Add a GitHub token with Gists write access before backing up.');

    const { files, copied } = buildGistFiles();
    const payload = {
        description: String(config.description || 'KatsuCases site data backup').trim() || 'KatsuCases site data backup',
        public: Boolean(config.isPublic),
        files
    };

    let gist;
    if (config.gistId) {
        gist = await githubRequest('patch', `${GITHUB_API}/gists/${normalizeGistId(config.gistId)}`, token, payload);
    } else {
        gist = await githubRequest('post', `${GITHUB_API}/gists`, token, payload);
        config.gistId = gist.id;
    }

    config.lastBackupAt = new Date().toISOString();
    config.lastBackupGistId = gist.id;
    config.lastBackupVersion = gist.updated_at || config.lastBackupAt;
    saveConfig(config);

    return {
        gistId: gist.id,
        gistUrl: gist.html_url || '',
        copied,
        version: gist.updated_at || config.lastBackupAt,
        public: Boolean(gist.public)
    };
}

async function restoreNow(ref = '', overrides = {}) {
    const config = saveConfig({ ...loadConfig(), ...overrides });
    const gistId = normalizeGistId(ref || config.gistId || '');
    if (!gistId) throw new Error('Set or enter a Gist ID before restoring.');
    const gist = await fetchGist(gistId, config.token || '');
    ensureDir(dataDir);
    const restored = [];
    for (const fileName of trackedFiles) {
        const file = gist.files?.[fileName];
        if (!file) continue;
        const content = await readGistFileContent(file);
        fs.writeFileSync(path.join(dataDir, fileName), content, 'utf8');
        restored.push(fileName);
    }
    config.gistId = gist.id;
    config.lastRestoreAt = new Date().toISOString();
    config.lastRestoreVersion = gist.updated_at || config.lastRestoreAt;
    saveConfig(config);
    return {
        gistId: gist.id,
        gistUrl: gist.html_url || '',
        restored,
        version: gist.updated_at || config.lastRestoreAt
    };
}

module.exports = {
    loadConfig,
    saveConfig,
    getStatus,
    backupNow,
    restoreNow,
    trackedFiles
};
