
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');
const configPath = path.join(dataDir, 'git-backup-config.json');
const defaultRepoPath = path.join(dataDir, 'git-backup-repo');
const trackedFiles = ['katsucases.json', 'community.json', 'casevs.json', 'replays.json', 'sessions.json'];

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

function loadConfig() {
    ensureDir(dataDir);
    return safeReadJson(configPath, {
        repoPath: defaultRepoPath,
        branch: 'main',
        remoteUrl: '',
        pushOnBackup: false,
        lastBackupAt: null,
        lastBackupCommit: null,
        lastRestoreAt: null,
        lastRestoreRef: null
    });
}

function saveConfig(config) {
    ensureDir(dataDir);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return config;
}

function runGit(args, cwd) {
    return execFileSync('git', args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8'
    }).trim();
}

function hasGitRepo(repoPath) {
    return fs.existsSync(path.join(repoPath, '.git'));
}

function ensureRepo(config = loadConfig()) {
    const repoPath = path.resolve(config.repoPath || defaultRepoPath);
    ensureDir(repoPath);
    if (!hasGitRepo(repoPath)) {
        if (config.remoteUrl) {
            if (fs.readdirSync(repoPath).length) {
                throw new Error('Backup repo path must be empty before cloning a remote repository.');
            }
            runGit(['clone', '--branch', config.branch || 'main', config.remoteUrl, repoPath], projectRoot);
        } else {
            runGit(['init', '-b', config.branch || 'main'], repoPath);
        }
    }

    try { runGit(['config', 'user.name', 'KatsuCases Backup'], repoPath); } catch (error) {}
    try { runGit(['config', 'user.email', 'backup@katsucases.local'], repoPath); } catch (error) {}

    if (config.remoteUrl) {
        try {
            const origin = runGit(['remote', 'get-url', 'origin'], repoPath);
            if (origin !== config.remoteUrl) {
                runGit(['remote', 'set-url', 'origin', config.remoteUrl], repoPath);
            }
        } catch (error) {
            runGit(['remote', 'add', 'origin', config.remoteUrl], repoPath);
        }
    }

    ensureDir(path.join(repoPath, 'backup_data'));
    return repoPath;
}

function copyDataIntoRepo(repoPath) {
    const targetDir = path.join(repoPath, 'backup_data');
    ensureDir(targetDir);
    const copied = [];
    for (const fileName of trackedFiles) {
        const src = path.join(dataDir, fileName);
        if (!fs.existsSync(src)) continue;
        const dest = path.join(targetDir, fileName);
        fs.copyFileSync(src, dest);
        copied.push(fileName);
    }
    fs.writeFileSync(path.join(repoPath, 'backup_data', 'manifest.json'), JSON.stringify({
        created_at: new Date().toISOString(),
        files: copied
    }, null, 2));
    return copied;
}

function restoreDataFromRepo(repoPath) {
    const targetDir = path.join(repoPath, 'backup_data');
    if (!fs.existsSync(targetDir)) {
        throw new Error('No backup_data directory exists in the configured repository.');
    }
    const restored = [];
    for (const fileName of trackedFiles) {
        const src = path.join(targetDir, fileName);
        if (!fs.existsSync(src)) continue;
        const dest = path.join(dataDir, fileName);
        fs.copyFileSync(src, dest);
        restored.push(fileName);
    }
    return restored;
}

function getStatus(config = loadConfig()) {
    const repoPath = path.resolve(config.repoPath || defaultRepoPath);
    const status = {
        config: { ...config, repoPath },
        repoExists: hasGitRepo(repoPath),
        repoPath,
        branch: null,
        latestCommit: null,
        trackedFiles
    };
    if (status.repoExists) {
        try { status.branch = runGit(['branch', '--show-current'], repoPath) || config.branch || 'main'; } catch (error) {}
        try { status.latestCommit = runGit(['rev-parse', '--short', 'HEAD'], repoPath); } catch (error) {}
    }
    return status;
}

function backupNow(overrides = {}) {
    const config = { ...loadConfig(), ...overrides };
    const repoPath = ensureRepo(config);
    const copied = copyDataIntoRepo(repoPath);
    runGit(['add', 'backup_data'], repoPath);
    let commit = null;
    try {
        runGit(['commit', '-m', `KatsuCases backup ${new Date().toISOString()}`], repoPath);
        commit = runGit(['rev-parse', '--short', 'HEAD'], repoPath);
    } catch (error) {
        if (!String(error.stderr || '').includes('nothing to commit')) {
            throw error;
        }
        commit = runGit(['rev-parse', '--short', 'HEAD'], repoPath);
    }
    if (config.remoteUrl && config.pushOnBackup) {
        runGit(['push', '-u', 'origin', config.branch || 'main'], repoPath);
    }
    config.lastBackupAt = new Date().toISOString();
    config.lastBackupCommit = commit;
    saveConfig(config);
    return { repoPath, copied, commit, branch: config.branch || 'main' };
}

function restoreNow(ref = '', overrides = {}) {
    const config = { ...loadConfig(), ...overrides };
    const repoPath = ensureRepo(config);
    if (config.remoteUrl) {
        try { runGit(['fetch', 'origin'], repoPath); } catch (error) {}
    }
    if (ref) {
        runGit(['checkout', ref], repoPath);
    } else if (config.branch) {
        try { runGit(['checkout', config.branch], repoPath); } catch (error) {}
        if (config.remoteUrl) {
            try { runGit(['pull', 'origin', config.branch], repoPath); } catch (error) {}
        }
    }
    const restored = restoreDataFromRepo(repoPath);
    config.lastRestoreAt = new Date().toISOString();
    config.lastRestoreRef = ref || config.branch || 'main';
    saveConfig(config);
    return { repoPath, restored, ref: config.lastRestoreRef };
}

module.exports = {
    loadConfig,
    saveConfig,
    ensureRepo,
    getStatus,
    backupNow,
    restoreNow,
    trackedFiles
};
