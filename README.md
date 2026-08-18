# dsh-temporary-chat

English | [中文](README.zh.md)

A DSH Web plugin that adds a ChatGPT-style temporary chat: with no workspace open, the default new session is a genuinely temporary conversation — never persisted, hidden from the sidebar, and discarded on close or refresh. Tools still run under the default directory `~/.dsh`.

> Note: this plugin depends on **internal (non-public) DSH APIs** and is coupled to a specific DSH version; verified against `@deepseek-ai/dsh@0.1.0-rc.6`. Re-verify after DSH upgrades.

## Features

- **Default temporary chat** — with no workspace open, the default new session is temporary.
- **Truly ephemeral** — not persisted to disk, not listed in the sidebar, gone on close/refresh.
- **Tools still work** — the session runs under the default directory `~/.dsh`.
- **Unchanged with a workspace** — with a project/workspace open, behavior is normal (persisted).

## Install

```sh
dsh plugin --profile web add https://github.com/Xinyu-lumos/dsh-temporary-chat
```

After installation, apply the patch while DSH Web is stopped, then start DSH Web:

```sh
node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs apply
dsh web
```

After the next start, hard-refresh the browser. The first activation may only install the on-disk patch; restarting once more is safe and may be required if DSH was already running during activation.

## How it works

DSH does not currently expose extension points for temporary sessions (the session model has no `temporary` flag and persistence writes every session unconditionally), so this feature is implemented by patching six compiled files:

| File | Package | Effect |
| --- | --- | --- |
| `lib/index.js` | `dsh-host-apiproxy` | `temporary` flag propagation + `~/.dsh` default cwd |
| `lib/index.js` | `dsh-session-persistence` | skip persistence for temporary sessions |
| `lib/client.js` | `dsh-client-connection` | `temporary` in the wire schemas |
| `lib/client.js` | `dsh-client-runtime` | default temporary session on connect |
| `lib/client.js` | `dsh-client-ui-workspace` | hide temporary sessions from the sidebar |
| `lib/client.js` | `dsh-client-ui-conversation` | typeable without selecting a workspace |

The package is a standard DSH host plugin. It applies a small, declarative patch manifest when DSH activates it; no install/build script is required, so pnpm `approve-builds` is not needed. Before changing anything it checks one canonical DSH installation, requires `@deepseek-ai/dsh@0.1.0-rc.6` and all six matching package versions, and validates every owned anchor. The transaction is all-or-nothing, preserves CRLF files, writes content-addressed backups under the DSH home, and supports status, recovery, and reversible unpatching.

For an explicit operation, use the bundled CLI:

```sh
node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs status
node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs apply
node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs unpatch
node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs recover
```

Set `DSH_ROOT` to the DSH npm root when more than one installation exists or automatic discovery cannot find the intended installation. Unsupported versions and changed anchors are rejected without modifying files.

Reinstalling or upgrading the matching `@deepseek-ai/dsh-*` package does not silently reapply the patch; inspect status and apply again only after the package has been verified.

## Rollback

Restore each patched file from its adjacent `.bak` backup, or reinstall DSH.

## Compatibility

Verified against `@deepseek-ai/dsh@0.1.0-rc.6`. Depends on internal APIs of `@deepseek-ai/dsh-host-apiproxy`, `@deepseek-ai/dsh-session-persistence`, `@deepseek-ai/dsh-client-connection`, `@deepseek-ai/dsh-client-runtime`, `@deepseek-ai/dsh-client-ui-workspace` and `@deepseek-ai/dsh-client-ui-conversation`; re-verify after DSH upgrades.

## Known limitations

- A live temporary session may briefly appear in `session.search` (search visibility shares the `session.list` baseline).
- Discarded temporary sessions remain in memory until the host restarts (hidden, never persisted).
- The header chip shows `.dsh` rather than a localized label.

## License

[MIT](LICENSE)