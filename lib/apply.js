import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
  'dsh-host-apiproxy/lib/index.js',
  'dsh-session-persistence/lib/index.js',
  'dsh-client-connection/lib/client.js',
  'dsh-client-runtime/lib/client.js',
  'dsh-client-ui-workspace/lib/client.js',
  'dsh-client-ui-conversation/lib/client.js'
];

function npmGlobalRoot() {
  try {
    return execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function candidateRoots() {
  const roots = [];
  if (process.env.DSH_ROOT) roots.push(process.env.DSH_ROOT);
  const root = npmGlobalRoot();
  if (root) roots.push(root);
  if (process.platform === 'win32') {
    for (const base of [process.env.LOCALAPPDATA, process.env.APPDATA]) {
      if (base) roots.push(join(base, 'dsh', 'node_modules'));
    }
  } else if (process.env.HOME) {
    roots.push(join(process.env.HOME, '.dsh', 'node_modules'));
  }
  return [...new Set(roots)];
}

function targetRel(rel) {
  return join('@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai', rel);
}

function locate(rel) {
  for (const root of candidateRoots()) {
    const path = join(root, targetRel(rel));
    if (existsSync(path)) return path;
  }
  return null;
}

export function applyPatches(options = {}) {
  const log = options.log ?? ((message) => console.log('[dsh-temporary-chat] ' + message));
  const warn = options.warn ?? ((message) => console.warn('[dsh-temporary-chat] ' + message));
  let applied = 0;
  let skipped = 0;
  let missing = 0;

  for (const rel of FILES) {
    const source = join(ROOT, 'packages', rel);
    if (!existsSync(source)) {
      warn('Missing packaged file / 缺少打包文件: ' + source);
      missing += 1;
      continue;
    }
    const target = locate(rel);
    if (!target) {
      warn('DSH target not found / 未找到 DSH 目标: ' + rel + ' (set DSH_ROOT to the npm global root and retry)');
      missing += 1;
      continue;
    }
    const sourceContent = readFileSync(source, 'utf8');
    const targetContent = readFileSync(target, 'utf8');
    if (sourceContent === targetContent) {
      skipped += 1;
      continue;
    }
    const backup = target + '.bak';
    if (!existsSync(backup)) {
      copyFileSync(target, backup);
      log('Backed up / 已备份: ' + backup);
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    log('Applied / 已应用: ' + target);
    applied += 1;
  }

  const result = { applied, skipped, missing };
  log('Done / 完成: applied ' + applied + ', skipped ' + skipped + ', missing ' + missing);
  if (applied > 0) {
    warn('Restart dsh web and hard-refresh the browser / 请重启 dsh web 并硬刷新浏览器');
  }
  return result;
}
