const { loadEnv } = require('./env');
loadEnv();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const projectRoot = path.join(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const configPath = path.join(dataDir, 'gist-backup-config.json');
const trackedFiles = ['katsucases.json', 'community.json', 'casevs.json', 'replays.json', 'sessions.json'];
const GITHUB_API = 'https://api.github.com';
let scheduler = null;

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

function parseBool(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    return /^(1|true|yes|on)$/i.test(String(value).trim());
}

function parsePositiveInt(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envConfig() {
    const token = String(process.env.GIST_BACKUP_TOKEN || process.env.GITHUB_GIST_TOKEN || '').trim();
    const gistId = normalizeGistId(process.env.GIST_BACKUP_ID || process.env.GITHUB_GIST_ID || '');
    const description = String(process.env.GIST_BACKUP_DESCRIPTION || '').trim();
    const isPublicRaw = process.env.GIST_BACKUP_PUBLIC;
    const autoSaveMinutes = parsePositiveInt(process.env.GIST_BACKUP_AUTO_SAVE_MINUTES || process.env.GIST_BACKUP_AUTOSAVE_MINUTES || '', 0);
    const maxVersions = parsePositiveInt(process.env.GIST_BACKUP_MAX_VERSIONS || '', 8);
    return {
        token,
        gistId,
        description,
        hasPublicOverride: isPublicRaw !== undefined,
        isPublic: parseBool(isPublicRaw, false),
        autoSaveMinutes,
        maxVersions
    };
}

function baseConfig() {
    return {
        token: '',
        gistId: '',
        description: 'KatsuCases site data backup',
        isPublic: false,
        lastBackupAt: null,
        lastBackupGistId: null,
        lastBackupVersion: null,
        lastRestoreAt: null,
        lastRestoreVersion: null,
        autoSaveMinutes: 0,
        maxVersions: 8,
        source: {
            token: 'env',
            gistId: 'env',
            description: 'file',
            isPublic: 'file'
        }
    };
}

function loadStoredConfig() {
    ensureDir(dataDir);
    return safeReadJson(configPath, baseConfig());
}

function loadConfig() {
    const stored = { ...baseConfig(), ...loadStoredConfig() };
    const env = envConfig();
    const config = {
        ...stored,
        gistId: env.gistId,
        token: env.token,
        description: env.description || String(stored.description || 'KatsuCases site data backup').trim() || 'KatsuCases site data backup',
        isPublic: env.hasPublicOverride ? env.isPublic : Boolean(stored.isPublic),
        autoSaveMinutes: env.autoSaveMinutes || parsePositiveInt(stored.autoSaveMinutes || '', 0),
        maxVersions: env.maxVersions || parsePositiveInt(stored.maxVersions || '', 8)
    };
    config.source = {
        token: env.token ? 'env' : 'env_missing',
        gistId: env.gistId ? 'env' : 'env_missing',
        description: env.description ? 'env' : 'file',
        isPublic: env.hasPublicOverride ? 'env' : 'file'
    };
    return config;
}

function saveConfig(config) {
    ensureDir(dataDir);
    const env = envConfig();
    const stored = { ...loadStoredConfig(), ...config };
    const next = {
        ...baseConfig(),
        ...stored,
        token: '',
        gistId: '',
        description: env.description || String(stored.description || 'KatsuCases site data backup').trim() || 'KatsuCases site data backup',
        isPublic: env.hasPublicOverride ? env.isPublic : Boolean(stored.isPublic),
        autoSaveMinutes: env.autoSaveMinutes || parsePositiveInt(stored.autoSaveMinutes || '', 0),
        maxVersions: env.maxVersions || parsePositiveInt(stored.maxVersions || '', 8)
    };
    delete next.source;
    fs.writeFileSync(configPath, JSON.stringify(next, null, 2));
    return loadConfig();
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
        format_version: 2
    };
}

function readLocalTrackedFiles() {
    const files = {};
    const copied = [];
    for (const fileName of trackedFiles) {
        const src = path.join(dataDir, fileName);
        if (!fs.existsSync(src)) continue;
        files[fileName] = fs.readFileSync(src, 'utf8');
        copied.push(fileName);
    }
    return { files, copied };
}

function createSnapshotFilename() {
    return `backup-snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

function buildSnapshotBundle(files) {
    return {
        site: 'KatsuCases',
        format_version: 1,
        created_at: new Date().toISOString(),
        tracked_files: files
    };
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

async function readHistoryFromGist(gist) {
    if (!gist?.files?.['backup-history.json']) return [];
    try {
        const content = await readGistFileContent(gist.files['backup-history.json']);
        const parsed = JSON.parse(content);
        return Array.isArray(parsed.versions) ? parsed.versions : [];
    } catch (error) {
        return [];
    }
}

async function listVersions(config = loadConfig()) {
    const gistId = normalizeGistId(config.gistId || '');
    if (!gistId) return { versions: [] };
    const gist = await fetchGist(gistId, config.token || '');
    const versions = await readHistoryFromGist(gist);
    return {
        gistId: gist.id,
        gistUrl: gist.html_url || '',
        versions: versions.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    };
}

async function getStatus(config = loadConfig()) {
    const gistId = normalizeGistId(config.gistId || '');
    const safeConfig = { ...config, gistId, token: config.token ? 'env_or_saved' : '' };
    const status = {
        config: safeConfig,
        gistConfigured: Boolean(gistId || config.token),
        gistExists: false,
        gistId,
        gistUrl: '',
        gistUpdatedAt: null,
        gistPublic: Boolean(config.isPublic),
        trackedFiles,
        autoSaveEnabled: Number(config.autoSaveMinutes || 0) > 0,
        autoSaveMinutes: Number(config.autoSaveMinutes || 0)
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
        const history = await readHistoryFromGist(gist);
        status.versionCount = history.length;
        status.versions = history.slice(0, 10);
    } catch (error) {
        status.error = error.message;
    }
    return status;
}

async function backupNow(overrides = {}) {
    const config = saveConfig({ ...loadConfig(), ...overrides });
    const token = String(config.token || '').trim();
    if (!token) throw new Error('Set GIST_BACKUP_TOKEN in your .env before backing up.');

    const { files: localFiles, copied } = readLocalTrackedFiles();
    const payloadFiles = {};
    Object.entries(localFiles).forEach(([fileName, content]) => {
        payloadFiles[fileName] = { content };
    });
    payloadFiles['manifest.json'] = { content: JSON.stringify(buildManifest(copied), null, 2) };

    let previousGist = null;
    let existingHistory = [];
    if (config.gistId) {
        try {
            previousGist = await fetchGist(config.gistId, token);
            existingHistory = await readHistoryFromGist(previousGist);
        } catch (error) {
            if (!/not found/i.test(error.message || '')) throw error;
        }
    }

    const snapshotFile = createSnapshotFilename();
    payloadFiles[snapshotFile] = { content: JSON.stringify(buildSnapshotBundle(localFiles), null, 2) };
    const versionEntry = {
        file: snapshotFile,
        created_at: new Date().toISOString(),
        tracked_files: copied
    };
    const maxVersions = Math.max(1, parsePositiveInt(config.maxVersions || '', 8));
    const history = [versionEntry, ...existingHistory].slice(0, maxVersions);
    payloadFiles['backup-history.json'] = { content: JSON.stringify({ versions: history }, null, 2) };

    const keepFiles = new Set(history.map((entry) => entry.file));
    if (previousGist?.files) {
        Object.keys(previousGist.files)
            .filter((name) => name.startsWith('backup-snapshot-') && name.endsWith('.json') && !keepFiles.has(name))
            .forEach((name) => {
                payloadFiles[name] = null;
            });
    }

    const payload = {
        description: String(config.description || 'KatsuCases site data backup').trim() || 'KatsuCases site data backup',
        public: Boolean(config.isPublic),
        files: payloadFiles
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
        public: Boolean(gist.public),
        snapshotFile,
        versionCount: history.length
    };
}

async function restoreNow(ref = '', overrides = {}) {
    const config = saveConfig({ ...loadConfig(), ...overrides });
    const refText = String(ref || '').trim();
    const gistId = normalizeGistId(refText || config.gistId || '');
    const targetGistId = gistId || normalizeGistId(config.gistId || '');
    if (!targetGistId) throw new Error('Set GIST_BACKUP_ID in your .env before restoring, or paste a specific Gist URL/ID into the restore field.');
    const gist = await fetchGist(targetGistId, config.token || '');
    ensureDir(dataDir);

    const snapshotFile = gist.files?.[refText] ? refText : null;
    const restored = [];

    if (snapshotFile) {
        const content = await readGistFileContent(gist.files[snapshotFile]);
        const parsed = JSON.parse(content);
        const tracked = parsed?.tracked_files || {};
        Object.entries(tracked).forEach(([fileName, fileContent]) => {
            fs.writeFileSync(path.join(dataDir, fileName), String(fileContent || ''), 'utf8');
            restored.push(fileName);
        });
    } else {
        for (const fileName of trackedFiles) {
            const file = gist.files?.[fileName];
            if (!file) continue;
            const content = await readGistFileContent(file);
            fs.writeFileSync(path.join(dataDir, fileName), content, 'utf8');
            restored.push(fileName);
        }
    }

    config.gistId = gist.id;
    config.lastRestoreAt = new Date().toISOString();
    config.lastRestoreVersion = gist.updated_at || config.lastRestoreAt;
    saveConfig(config);
    return {
        gistId: gist.id,
        gistUrl: gist.html_url || '',
        restored,
        version: gist.updated_at || config.lastRestoreAt,
        snapshotFile: snapshotFile || null
    };
}

function startAutoBackupScheduler() {
    const config = loadConfig();
    const intervalMinutes = Number(config.autoSaveMinutes || 0);
    if (scheduler) {
        clearInterval(scheduler);
        scheduler = null;
    }
    if (!intervalMinutes || !String(config.token || '').trim()) {
        return { enabled: false, intervalMinutes: 0 };
    }
    const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
    scheduler = setInterval(() => {
        backupNow().catch((error) => {
            console.error('Gist autosave failed:', error.message || error);
        });
    }, intervalMs);
    return { enabled: true, intervalMinutes: Math.max(5, intervalMinutes) };
}

module.exports = {
    loadConfig,
    saveConfig,
    getStatus,
    listVersions,
    backupNow,
    restoreNow,
    startAutoBackupScheduler,
    trackedFiles
};
