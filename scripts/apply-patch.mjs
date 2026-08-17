#!/usr/bin/env node
// DSH "临时聊天" 特性安装脚本：把 6 个改动后的核心文件覆盖到已安装的
// @deepseek-ai/dsh-* 包目录，并在覆盖前备份原文件为 .bak。
// 幂等（目标已一致则跳过）、尽力而为（永不因打补丁失败而让 npm 安装报错）。

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 相对 DSH 安装根目录的包内路径（本包 packages/ 下同构）。
const FILES = [
  'dsh-host-apiproxy/lib/index.js',
  'dsh-session-persistence/lib/index.js',
  'dsh-client-connection/lib/client.js',
  'dsh-client-runtime/lib/client.js',
  'dsh-client-ui-workspace/lib/client.js',
  'dsh-client-ui-conversation/lib/client.js'
];

const log = (m) => console.log('[dsh-temporary-chat] ' + m);
const warn = (m) => console.warn('[dsh-temporary-chat] ' + m);

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
  return roots;
}

function targetRel(rel) {
  return join('@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai', rel);
}

function locate(rel) {
  for (const root of candidateRoots()) {
    const p = join(root, targetRel(rel));
    if (p && existsSync(p)) return p;
  }
  return null;
}

let applied = 0;
let skipped = 0;
let missing = 0;

for (const rel of FILES) {
  const source = join(ROOT, 'packages', rel);
  if (!existsSync(source)) {
    warn('缺少打包文件：' + source);
    missing += 1;
    continue;
  }
  const target = locate(rel);
  if (!target) {
    warn('未找到 DSH 目标，跳过：' + rel + '（可设 DSH_ROOT 指向 npm 全局根目录后重试）');
    missing += 1;
    continue;
  }
  const src = readFileSync(source, 'utf8');
  const dst = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (src === dst) {
    log('已应用，跳过：' + target);
    skipped += 1;
    continue;
  }
  const bak = target + '.bak';
  if (!existsSync(bak)) {
    copyFileSync(target, bak);
    log('已备份原文件：' + bak);
  }
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  log('已应用：' + target);
  applied += 1;
}

console.log('[dsh-temporary-chat] 完成：应用 ' + applied + ' / 跳过 ' + skipped + ' / 未找到 ' + missing);
if (applied > 0) {
  console.log('[dsh-temporary-chat] 请重启 dsh web（host 端需重启），并硬刷新浏览器 Ctrl+Shift+R。');
}
