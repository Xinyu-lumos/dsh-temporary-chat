import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { PATCH_MANIFEST } from './manifest.js';

export const PATCH_SPEC_VERSION = 1;
export const SUPPORTED_DSH_VERSION = '0.1.0-rc.6';

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const canonicalSha256 = (value) => sha256(value.replaceAll(CRLF, LF));

function countOccurrences(text, needle) {
  let count = 0;
  let offset = 0;
  while ((offset = text.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += Math.max(needle.length, 1);
  }
  return count;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function npmGlobalRoot() {
  try {
    return execSync('npm root -g', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

function defaultCandidates() {
  const roots = [];
  const globalRoot = npmGlobalRoot();
  if (globalRoot) roots.push(globalRoot);
  if (process.platform === 'win32') {
    for (const base of [process.env.LOCALAPPDATA, process.env.APPDATA]) {
      if (base) roots.push(join(base, 'dsh', 'node_modules'));
    }
  } else {
    roots.push(join(homedir(), '.dsh', 'node_modules'));
  }
  return roots;
}

function isInside(root, path) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
}

function inspectCandidate(nodeModulesRoot) {
  const root = resolve(nodeModulesRoot);
  const dshRoot = join(root, '@deepseek-ai', 'dsh');
  const dshManifestPath = join(dshRoot, 'package.json');
  if (!existsSync(dshManifestPath)) return null;
  const realDshRoot = realpathSync(dshRoot);
  const dshManifest = readJson(dshManifestPath);
  const files = [];
  for (const entry of PATCH_MANIFEST) {
    const packageRoot = join(dshRoot, 'node_modules', '@deepseek-ai', entry.packageDir);
    const packageManifestPath = join(packageRoot, 'package.json');
    const target = join(packageRoot, entry.relativePath);
    if (!existsSync(packageManifestPath) || !existsSync(target)) return null;
    const realTarget = realpathSync(target);
    if (!isInside(realDshRoot, realTarget)) {
      throw new Error('Target escapes the selected DSH installation: ' + target);
    }
    if (!lstatSync(realTarget).isFile()) throw new Error('Target is not a regular file: ' + target);
    const packageManifest = readJson(packageManifestPath);
    files.push({ entry, packageRoot, target: realTarget, packageVersion: packageManifest.version });
  }
  return {
    nodeModulesRoot: root,
    dshRoot: realDshRoot,
    dshVersion: dshManifest.version,
    files
  };
}

export function resolveInstallation(options = {}) {
  const selected = options.root ?? process.env.DSH_ROOT;
  const candidates = selected ? [selected] : [...(options.rootCandidates ?? []), ...defaultCandidates()];
  const found = [];
  const seen = new Set();
  for (const candidate of candidates) {
    if (!candidate || !existsSync(candidate)) continue;
    const inspected = inspectCandidate(candidate);
    if (inspected === null || seen.has(inspected.dshRoot)) continue;
    seen.add(inspected.dshRoot);
    found.push(inspected);
  }
  if (found.length === 0) {
    throw new Error('DSH installation not found. Set DSH_ROOT to the node_modules root reported by "npm root -g".');
  }
  if (found.length > 1) {
    throw new Error('Multiple DSH installations found. Set DSH_ROOT to the one that should be patched: ' + found.map((item) => item.nodeModulesRoot).join(', '));
  }
  const installation = found[0];
  if (installation.dshVersion !== SUPPORTED_DSH_VERSION) {
    throw new Error('Unsupported @deepseek-ai/dsh version ' + installation.dshVersion + '; expected ' + SUPPORTED_DSH_VERSION + '. No files were changed.');
  }
  for (const file of installation.files) {
    if (file.packageVersion !== file.entry.version) {
      throw new Error('Unsupported ' + file.entry.package + ' version ' + file.packageVersion + '; expected ' + file.entry.version + '. No files were changed.');
    }
  }
  return installation;
}

function stateRootFor(installation, options) {
  if (options.stateRoot) return resolve(options.stateRoot);
  const dshHome = process.env.DSH_HOME ? resolve(process.env.DSH_HOME) : join(homedir(), '.dsh');
  return join(dshHome, 'storages', 'dsh-temporary-chat', sha256(installation.dshRoot).slice(0, 16));
}

function adaptEol(value, eol) {
  return eol === LF ? value : value.replaceAll(LF, eol);
}

function transformFile(file, direction) {
  const current = readFileSync(file.target, 'utf8');
  const eol = current.includes(CRLF) ? CRLF : LF;
  let next = current;
  let matchedBefore = 0;
  let matchedAfter = 0;

  for (const change of file.entry.changes) {
    const before = adaptEol(change.before, eol);
    const after = adaptEol(change.after, eol);
    const afterCount = countOccurrences(next, after);
    if (afterCount > 1) throw new Error('Ambiguous patched anchor ' + change.id + ' in ' + file.target);
    if (afterCount === 1) {
      matchedAfter += 1;
      if (direction === 'unpatch') next = next.replace(after, before);
      continue;
    }
    const beforeCount = countOccurrences(next, before);
    if (beforeCount !== 1) {
      throw new Error('Incompatible or modified anchor ' + change.id + ' in ' + file.target + ' (expected exactly one pristine or patched match). No files were changed.');
    }
    matchedBefore += 1;
    if (direction === 'apply') next = next.replace(before, after);
  }

  const state = matchedAfter === file.entry.changes.length
    ? 'patched'
    : matchedBefore === file.entry.changes.length
      ? 'unpatched'
      : 'partial';
  return {
    ...file,
    current,
    next,
    currentHash: sha256(current),
    canonicalCurrentHash: canonicalSha256(current),
    nextHash: sha256(next),
    state,
    externalEdits: state === 'patched' && canonicalSha256(current) !== file.entry.patchedSha256,
    changed: current !== next
  };
}

function buildPlan(installation, direction) {
  const files = installation.files.map((file) => transformFile(file, direction));
  const states = new Set(files.map((file) => file.state));
  return {
    direction,
    files,
    state: states.size === 1 ? files[0].state : 'partial',
    changedFiles: files.filter((file) => file.changed).length
  };
}

function writeJsonAtomic(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = path + '.' + randomUUID() + '.tmp';
  writeFileSync(temp, JSON.stringify(value, null, 2) + LF, 'utf8');
  rmSync(path, { force: true });
  renameSync(temp, path);
}

function processIsRunning(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function acquireLock(stateRoot) {
  mkdirSync(stateRoot, { recursive: true });
  const path = join(stateRoot, 'lock.json');
  if (existsSync(path)) {
    let lock;
    try {
      lock = readJson(path);
    } catch {
      lock = null;
    }
    if (lock && processIsRunning(lock.pid)) {
      throw new Error('Another dsh-temporary-chat patch operation is running (pid ' + lock.pid + ').');
    }
    rmSync(path, { force: true });
  }
  const fd = openSync(path, 'wx');
  writeFileSync(fd, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }) + LF, 'utf8');
  closeSync(fd);
  return () => rmSync(path, { force: true });
}

function backupPathFor(stateRoot, file) {
  return join(
    stateRoot,
    'backups',
    file.entry.packageDir,
    dirname(file.entry.relativePath),
    basename(file.entry.relativePath) + '.' + file.currentHash + '.bak'
  );
}

function ensureBackup(path, content, expectedHash) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    if (sha256(readFileSync(path)) !== expectedHash) throw new Error('Backup hash mismatch: ' + path);
    return;
  }
  writeFileSync(path, content, { encoding: 'utf8', flag: 'wx' });
  if (sha256(readFileSync(path)) !== expectedHash) throw new Error('Backup verification failed: ' + path);
}

function journalPath(stateRoot) {
  return join(stateRoot, 'transaction.json');
}

function recoverPendingTransaction(stateRoot, installation) {
  const path = journalPath(stateRoot);
  if (!existsSync(path)) return { recovered: 0 };
  const journal = readJson(path);
  if (!['prepared', 'committing'].includes(journal.status)) return { recovered: 0 };
  if (journal.dshRoot !== installation.dshRoot) {
    throw new Error('Pending transaction belongs to another DSH installation: ' + journal.dshRoot);
  }
  let recovered = 0;
  for (const item of journal.files) {
    if (!existsSync(item.target) || !existsSync(item.backup)) {
      throw new Error('Cannot recover pending transaction; target or backup is missing: ' + item.target);
    }
    const currentHash = sha256(readFileSync(item.target));
    if (currentHash === item.currentHash) continue;
    const wasAttempted = journal.attempting === item.target || journal.written.includes(item.target);
    if (currentHash !== item.nextHash && !wasAttempted) {
      throw new Error('Cannot recover because a target was modified externally: ' + item.target);
    }
    const backup = readFileSync(item.backup);
    if (sha256(backup) !== item.currentHash) throw new Error('Recovery backup hash mismatch: ' + item.backup);
    writeFileSync(item.target, backup);
    recovered += 1;
  }
  journal.status = 'recovered';
  journal.recoveredAt = new Date().toISOString();
  journal.attempting = null;
  writeJsonAtomic(path, journal);
  return { recovered };
}

export function inspectPatches(options = {}) {
  const installation = resolveInstallation(options);
  const stateRoot = stateRootFor(installation, options);
  const release = acquireLock(stateRoot);
  try {
    recoverPendingTransaction(stateRoot, installation);
    const plan = buildPlan(installation, 'apply');
    return {
      dshRoot: installation.dshRoot,
      dshVersion: installation.dshVersion,
      patchSpecVersion: PATCH_SPEC_VERSION,
      state: plan.state,
      changedFiles: plan.changedFiles,
      files: plan.files.map((file) => ({
        package: file.entry.package,
        relativePath: file.entry.relativePath,
        state: file.state,
        currentHash: file.currentHash,
        pristineHashMatch: file.currentHash === file.entry.upstreamSha256,
        patchedHashMatch: file.canonicalCurrentHash === file.entry.patchedSha256,
        externalEdits: file.externalEdits
      }))
    };
  } finally {
    release();
  }
}

function mutate(direction, options = {}) {
  const installation = resolveInstallation(options);
  const stateRoot = stateRootFor(installation, options);
  const release = acquireLock(stateRoot);
  let journal = null;
  try {
    recoverPendingTransaction(stateRoot, installation);
    const plan = buildPlan(installation, direction);
    if (options.dryRun || plan.changedFiles === 0) {
      return {
        direction,
        dshRoot: installation.dshRoot,
        stateBefore: plan.state,
        changedFiles: plan.changedFiles,
        dryRun: options.dryRun === true
      };
    }

    const changed = plan.files.filter((file) => file.changed);
    const journalFiles = changed.map((file) => {
      const backup = backupPathFor(stateRoot, file);
      ensureBackup(backup, file.current, file.currentHash);
      return {
        target: file.target,
        package: file.entry.package,
        relativePath: file.entry.relativePath,
        currentHash: file.currentHash,
        nextHash: file.nextHash,
        backup
      };
    });
    journal = {
      schemaVersion: 1,
      patchSpecVersion: PATCH_SPEC_VERSION,
      dshRoot: installation.dshRoot,
      dshVersion: installation.dshVersion,
      direction,
      status: 'prepared',
      createdAt: new Date().toISOString(),
      attempting: null,
      written: [],
      files: journalFiles
    };
    const path = journalPath(stateRoot);
    writeJsonAtomic(path, journal);
    journal.status = 'committing';
    writeJsonAtomic(path, journal);

    for (let index = 0; index < changed.length; index += 1) {
      const file = changed[index];
      journal.attempting = file.target;
      writeJsonAtomic(path, journal);
      writeFileSync(file.target, file.next, 'utf8');
      if (sha256(readFileSync(file.target)) !== file.nextHash) {
        throw new Error('Post-write hash verification failed: ' + file.target);
      }
      journal.written.push(file.target);
      journal.attempting = null;
      writeJsonAtomic(path, journal);
      if (options.faultAfterWrites === index + 1) throw new Error('Injected write failure after file ' + (index + 1));
    }

    journal.status = 'complete';
    journal.completedAt = new Date().toISOString();
    writeJsonAtomic(path, journal);
    return {
      direction,
      dshRoot: installation.dshRoot,
      stateBefore: plan.state,
      changedFiles: changed.length,
      dryRun: false
    };
  } catch (error) {
    if (journal !== null) {
      try {
        recoverPendingTransaction(stateRoot, installation);
      } catch (recoveryError) {
        throw new AggregateError([error, recoveryError], 'Patch transaction failed and automatic rollback was incomplete. Run the recover command before retrying.');
      }
    }
    throw error;
  } finally {
    release();
  }
}

export function applyPatches(options = {}) {
  return mutate('apply', options);
}

export function unpatchPatches(options = {}) {
  return mutate('unpatch', options);
}

export function recoverPatches(options = {}) {
  const installation = resolveInstallation(options);
  const stateRoot = stateRootFor(installation, options);
  const release = acquireLock(stateRoot);
  try {
    return recoverPendingTransaction(stateRoot, installation);
  } finally {
    release();
  }
}
