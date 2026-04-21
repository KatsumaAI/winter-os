const fs = require('fs');
const path = require('path');

let loaded = false;

function parseEnvValue(value = '') {
    const trimmed = String(value).trim();
    if (!trimmed) return '';
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1).replace(/\\n/g, '\n');
    }
    return trimmed;
}

function loadEnv(filePath = path.join(__dirname, '..', '.env')) {
    if (loaded) return process.env;
    loaded = true;
    try {
        if (!fs.existsSync(filePath)) return process.env;
        const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        for (const rawLine of lines) {
            const line = String(rawLine || '').trim();
            if (!line || line.startsWith('#')) continue;
            const cleaned = line.startsWith('export ') ? line.slice(7) : line;
            const match = cleaned.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
            if (!match) continue;
            const key = match[1];
            if (process.env[key] !== undefined && process.env[key] !== '') continue;
            process.env[key] = parseEnvValue(match[2]);
        }
    } catch (error) {
        console.warn('Failed to load .env file:', error.message || error);
    }
    return process.env;
}

module.exports = { loadEnv };
