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

Restart the DSH Web process and hard-refresh the browser after installing.

Once published to npm, these also work:

```sh
npm install -g dsh-temporary-chat
# or
npx dsh-temporary-chat-patch
```

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

The package is a standard DSH host plugin. When DSH activates it, `index.js` invokes the reusable patcher in `lib/apply.js`; no install/build script is required, so pnpm `approve-builds` is not needed. Applying is idempotent (matching files are skipped), non-fatal, and the original files are backed up as `.bak`.

If plugin activation could not locate DSH, run the patcher manually from the profile directory:

```sh
node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs
```

If DSH still cannot be located, point `DSH_ROOT` at the DSH install root (the output of `npm root -g`):

```sh
DSH_ROOT="/absolute/path/to/node_modules" node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs
```

Reinstalling or upgrading the matching `@deepseek-ai/dsh-*` package overwrites the patch; re-run the script to re-apply.

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
