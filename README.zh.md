# dsh-temporary-chat

[English](README.md) | 中文

一个 DSH Web 插件，加入 ChatGPT 风格的「临时聊天」：没打开工作区时，默认的「新建会话」是一个真正临时的会话——不落盘、不进侧边栏历史、关闭/刷新即丢弃；工具仍跑在默认目录 `~/.dsh` 下。

> 注意：本插件依赖 DSH 的**内部（非公开）API**，绑定特定 DSH 版本；已在 `@deepseek-ai/dsh@0.1.0-rc.6` 验证。DSH 升级后需重新验证。

## 功能

- **默认临时聊天** —— 无工作区时，默认新建会话即临时会话。
- **真正临时** —— 不写磁盘、不进侧边栏、关闭/刷新即丢弃。
- **工具可用** —— 会话运行在默认目录 `~/.dsh`。
- **有工作区时不变** —— 打开项目/工作区时行为不变（正常持久化）。

## 安装

```sh
dsh plugin --profile web add https://github.com/Xinyu-lumos/dsh-temporary-chat
```

安装后重启 DSH Web 进程并硬刷新浏览器。

发布到 npm 后，也可用：

```sh
npm install -g dsh-temporary-chat
# 或
npx dsh-temporary-chat-patch
```

## 原理

DSH 目前没有为「临时会话」提供扩展点（会话模型没有 `temporary` 标记，持久化层无条件持久化每个会话），因此本特性通过给六个编译产物打补丁实现：

| 文件 | 包 | 作用 |
| --- | --- | --- |
| `lib/index.js` | `dsh-host-apiproxy` | `temporary` 标记透传 + `~/.dsh` 默认目录 |
| `lib/index.js` | `dsh-session-persistence` | 临时会话跳过持久化 |
| `lib/client.js` | `dsh-client-connection` | wire schema 加 `temporary` |
| `lib/client.js` | `dsh-client-runtime` | 连接时默认进入临时会话 |
| `lib/client.js` | `dsh-client-ui-workspace` | 侧边栏隐藏临时会话 |
| `lib/client.js` | `dsh-client-ui-conversation` | 无需选择工作区即可输入 |

本包是标准 DSH host 插件。DSH 激活插件时，`index.js` 会调用 `lib/apply.js` 中的可复用补丁器；无需 install/build 脚本，因此不需要执行 pnpm `approve-builds`。补丁过程幂等（目标一致则跳过）、失败不阻断启动，原文件备份为 `.bak`。

若插件激活时定位不到 DSH，可在 profile 目录手动执行补丁器：

```sh
node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs
```

仍定位不到时，把 `DSH_ROOT` 指向 DSH 安装根目录（`npm root -g` 的输出）：

```sh
DSH_ROOT="/absolute/path/to/node_modules" node node_modules/dsh-temporary-chat/scripts/apply-patch.mjs
```

重装或升级对应的 `@deepseek-ai/dsh-*` 包会覆盖补丁；重跑脚本即可重新应用。

## 回滚

用每个被改文件旁的 `.bak` 备份覆盖回去，或直接重装 DSH。

## 兼容性

已在 `@deepseek-ai/dsh@0.1.0-rc.6` 验证。依赖 `@deepseek-ai/dsh-host-apiproxy`、`dsh-session-persistence`、`dsh-client-connection`、`dsh-client-runtime`、`dsh-client-ui-workspace`、`dsh-client-ui-conversation` 的内部 API；DSH 升级后需重新验证。

## 已知限制

- 临时会话存活期间可能短暂出现在 `session.search` 结果里（搜索可见性与 `session.list` 共用基线）。
- 被丢弃的临时会话在 host 重启前仍留在内存里（隐藏、未落盘）。
- 顶部 chip 显示 `.dsh`，而非本地化的「临时聊天」标签。

## 许可证

[MIT](LICENSE)
