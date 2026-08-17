# DSH 临时聊天（dsh-temporary-chat）

ChatGPT 风格「临时聊天」：**没打开项目/工作区时，默认进入一个真正临时的会话** —— 不落盘、不进侧边栏历史、关闭/刷新即丢弃，但工具仍跑在默认目录 `~/.dsh` 下。

## 一键安装（三选一）

**方式一：npx 直接打补丁（推荐，不装全局包）**

```bash
npx dsh-temporary-chat-patch
```

**方式二：npm 全局安装（postinstall 自动打补丁）**

```bash
npm install -g dsh-temporary-chat
```

**方式三：DSH 插件市场（发布到 awesome-dsh-plugin 后可用）**

```bash
dsh plugin add dsh-temporary-chat
```

安装完成后：**重启 `dsh web`**（host 端改动需重启）＋ **硬刷新浏览器**（Ctrl+Shift+R）。

> 若脚本自动找不到 DSH 安装位置（多在非标准安装时），设置环境变量 `DSH_ROOT` 指向 npm 全局根目录（`npm root -g` 的结果）后重试。

## 行为

- 无工作区时（启动 / 点「新建会话」）直接进入可输入的临时会话
- 该会话**不保存到磁盘**、**不出现在侧边栏历史**
- 关闭标签页 / 刷新后消失，重新进入是全新的空临时会话
- 打开真实项目/工作区时行为不变（正常持久化）

## 原理

本包随包分发 6 个改动后的 DSH 核心文件（`packages/` 目录，与原包目录同构），安装时把它们覆盖到已安装的 `@deepseek-ai/dsh-*` 包目录，并在覆盖前备份原文件为 `.bak`。改动分两部分：

- **host 端**（`dsh-host-apiproxy`、`dsh-session-persistence`）：`temporary` 标记透传＋持久化跳过 —— 需重启 `dsh web`
- **client 端**（`dsh-client-connection`、`dsh-client-runtime`、`dsh-client-ui-workspace`、`dsh-client-ui-conversation`）：默认进临时会话＋侧边栏隐藏 —— 刷新即生效

逐点变更见 `CHANGES.md`。脚本**幂等**（目标已一致则跳过）、**尽力而为**（失败不阻断安装）。

## 回滚 / 卸载

把目标文件旁自动生成的 `.bak` 覆盖回去即可（每个被改文件旁都有一个 `xxx.bak`）。或直接重装 DSH。

## 发布

```bash
cd dsh-temporary-chat
npm publish --access public
```

发布到 npm 后，他人即可用上面三种方式之一一键安装。若想进入 DSH 官方插件市场，再向 awesome-dsh-plugin 注册仓库即可（参照社区插件 `dsh-session-delete` / `dsh-better-sidebar` 的做法）。

## 已知限制

- 临时会话存活期间可能短暂出现在 `session.search` 结果里（搜索可见性与 `session.list` 共用基线）
- host 重启前，被丢弃的临时会话仍在内存里（隐藏、未落盘，量级很小）
- 顶部 chip 文案显示 `.dsh`，而非「临时聊天」
- 覆盖式打补丁绑定当前 DSH 版本；DSH 升级后若这 6 个文件变动，需重跑安装脚本
