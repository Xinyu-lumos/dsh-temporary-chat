import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { applyPatches, inspectPatches, unpatchPatches } from '../lib/apply.js';
import { PATCH_MANIFEST } from '../lib/manifest.js';

const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13, 10);

function adaptEol(value, eol) {
  return eol === LF ? value : value.replaceAll(LF, eol);
}

function createFixture(options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dsh-temporary-chat-'));
  const nodeModulesRoot = join(root, 'node_modules');
  const dshRoot = join(nodeModulesRoot, '@deepseek-ai', 'dsh');
  const packageBase = join(dshRoot, 'node_modules', '@deepseek-ai');
  const eol = options.eol ?? LF;
  mkdirSync(packageBase, { recursive: true });
  writeFileSync(join(dshRoot, 'package.json'), JSON.stringify({
    name: '@deepseek-ai/dsh',
    version: options.dshVersion ?? '0.1.0-rc.6'
  }));

  const targets = new Map();
  for (const entry of PATCH_MANIFEST) {
    const packageRoot = join(packageBase, entry.packageDir);
    const target = join(packageRoot, entry.relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({
      name: entry.package,
      version: options.packageVersions?.[entry.package] ?? entry.version
    }));
    const content = entry.changes
      .map((change) => '/* ' + change.id + ' */' + eol + adaptEol(change.before, eol))
      .join(eol + '/* unrelated boundary */' + eol) + eol;
    writeFileSync(target, content, 'utf8');
    targets.set(entry.package, target);
  }

  const stateRoot = join(root, 'state');
  return {
    root,
    nodeModulesRoot,
    stateRoot,
    targets,
    cleanup: () => rmSync(root, { recursive: true, force: true })
  };
}

function snapshot(fixture) {
  return new Map([...fixture.targets].map(([name, path]) => [name, readFileSync(path, 'utf8')]));
}

function assertSnapshot(fixture, expected) {
  for (const [name, path] of fixture.targets) {
    assert.equal(readFileSync(path, 'utf8'), expected.get(name), name + ' changed unexpectedly');
  }
}

function engineOptions(fixture, extra = {}) {
  return { root: fixture.nodeModulesRoot, stateRoot: fixture.stateRoot, ...extra };
}

test('manifest contains only temporary-chat changes', () => {
  const text = JSON.stringify(PATCH_MANIFEST);
  assert.equal(text.includes('onSessionDelete'), false);
  assert.equal(text.includes('/_dsh/session-delete'), false);
  assert.equal(PATCH_MANIFEST.length, 6);
  assert.equal(PATCH_MANIFEST.reduce((count, entry) => count + entry.changes.length, 0), 24);
  const host = PATCH_MANIFEST.find((entry) => entry.package.endsWith('dsh-host-apiproxy'));
  const cwdChange = host.changes.find((change) => change.id === 'dsh-host-apiproxy-7');
  assert.match(cwdChange.after, /temporary === true \? resolveDshHome\(\) : defaults\.cwd/);
});

test('apply is idempotent and unpatch is reversible', () => {
  const fixture = createFixture();
  try {
    const pristine = snapshot(fixture);
    assert.equal(inspectPatches(engineOptions(fixture)).state, 'unpatched');
    assert.equal(applyPatches(engineOptions(fixture)).changedFiles, 6);
    assert.equal(inspectPatches(engineOptions(fixture)).state, 'patched');
    assert.equal(applyPatches(engineOptions(fixture)).changedFiles, 0);
    assert.equal(unpatchPatches(engineOptions(fixture)).changedFiles, 6);
    assert.equal(inspectPatches(engineOptions(fixture)).state, 'unpatched');
    assertSnapshot(fixture, pristine);
  } finally {
    fixture.cleanup();
  }
});

test('unrelated plugin edits survive apply and unpatch', () => {
  const fixture = createFixture();
  try {
    const workspace = fixture.targets.get('@deepseek-ai/dsh-client-ui-workspace');
    writeFileSync(workspace, readFileSync(workspace, 'utf8') + 'UNRELATED_PLUGIN_MARKER' + LF, 'utf8');
    const before = snapshot(fixture);
    applyPatches(engineOptions(fixture));
    const status = inspectPatches(engineOptions(fixture));
    assert.equal(status.state, 'patched');
    assert.equal(status.files.find((file) => file.package.endsWith('dsh-client-ui-workspace')).externalEdits, true);
    assert.match(readFileSync(workspace, 'utf8'), /UNRELATED_PLUGIN_MARKER/);
    unpatchPatches(engineOptions(fixture));
    assertSnapshot(fixture, before);
  } finally {
    fixture.cleanup();
  }
});

test('version mismatch refuses with zero writes', () => {
  const fixture = createFixture({ dshVersion: '0.1.0-rc.7' });
  try {
    const before = snapshot(fixture);
    assert.throws(() => applyPatches(engineOptions(fixture)), /Unsupported @deepseek-ai\/dsh version/);
    assertSnapshot(fixture, before);
  } finally {
    fixture.cleanup();
  }
});

test('missing anchor refuses the entire transaction', () => {
  const fixture = createFixture();
  try {
    const last = PATCH_MANIFEST.at(-1);
    const target = fixture.targets.get(last.package);
    const content = readFileSync(target, 'utf8').replace(last.changes[0].before, 'BROKEN_ANCHOR');
    writeFileSync(target, content, 'utf8');
    const before = snapshot(fixture);
    assert.throws(() => applyPatches(engineOptions(fixture)), /Incompatible or modified anchor/);
    assertSnapshot(fixture, before);
  } finally {
    fixture.cleanup();
  }
});

test('injected write failure rolls every file back', () => {
  const fixture = createFixture();
  try {
    const before = snapshot(fixture);
    assert.throws(
      () => applyPatches(engineOptions(fixture, { faultAfterWrites: 2 })),
      /Injected write failure/
    );
    assertSnapshot(fixture, before);
    assert.equal(inspectPatches(engineOptions(fixture)).state, 'unpatched');
  } finally {
    fixture.cleanup();
  }
});

test('CRLF files retain CRLF through apply and unpatch', () => {
  const fixture = createFixture({ eol: CRLF });
  try {
    const before = snapshot(fixture);
    applyPatches(engineOptions(fixture));
    for (const path of fixture.targets.values()) {
      const content = readFileSync(path, 'utf8');
      assert.equal(content.replaceAll(CRLF, '').includes(LF), false);
    }
    unpatchPatches(engineOptions(fixture));
    assertSnapshot(fixture, before);
  } finally {
    fixture.cleanup();
  }
});
