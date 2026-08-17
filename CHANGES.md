# 变更说明（CHANGES）

目标 DSH 版本：当前安装的 `@deepseek-ai/dsh` 发布产物。所有文件用 tab 缩进、LF 行尾。

## 1. dsh-host-apiproxy/lib/index.js（host，需重启）

1. 顶部新增 import：`resolveDshHome` from `@deepseek-ai/dsh-home-paths`。
2. `session.create` 默认 cwd 回退：`defaults.cwd` → `resolveDshHome()`（无 workspaceId 且无 cwd 时落到 `~/.dsh`）。
3. `sessionSummarySchema` 新增 `temporary: z.boolean().optional()`。
4. `sessionCreateRequestSchema` 新增 `temporary: z.boolean().optional()`。
5. `sessionListFields` 新增投影 `...header.temporary === void 0 ? {} : { temporary: header.temporary }`。
6. `hostFrameSchema`（host/session-added）新增 `temporary`。
7. `ensureSession` 增加第 5 参 `temporary`，创建 meta 时写入 `...temporary === true ? { temporary: true } : {}`。
8. `create` 处理器调用改为传入 `request.payload.temporary === true`。

## 2. dsh-session-persistence/lib/index.js（host，需重启）

1. 新增模块级常量 `NOOP_PERSISTENCE_LIVE`（冻结的 `{ init: Promise.resolve(), writes: { enqueue(){}, cancelAutomaticWait(){}, flush(){}, hasWork:false } }`）。
2. `PersistenceCoordinator.initFor` 开头新增：`if (session.header.temporary === true) return NOOP_PERSISTENCE_LIVE;` —— 临时会话完全不进入写路径、不落盘。

## 3. dsh-client-connection/lib/client.js（client，刷新）

1. `sessionSummarySchema` 新增 `temporary: boolean().optional()`。
2. `session.create` 请求 schema 新增 `temporary: boolean().optional()`。
3. `hostFrameSchema`（host/session-added）新增 `temporary: boolean().optional()`。

## 4. dsh-client-runtime/lib/client.js（client，刷新）

1. `WorkspaceRuntime` 新增字段 `defaultConnecting = void 0`。
2. 新增 `connectDefault()`：无工作区时 `sessions.create({ temporary: true })` 建临时会话；复用"当前空白未分组会话"避免重复建；单飞合并并发调用。
3. `startInitialSelection()`：无 current 且无 target 工作区时走 `connectDefault()`。
4. `startSession()`：无工作区时走 `connectDefault()`（而非 `sessions.clear()`）。
5. `SessionManager.create()`：`shared` 里加 `temporary`；本地 summary 记录加 `temporary`。
6. `host/session-added` 帧投影加 `temporary`。
7. `applyMutation()` upsert：合并与相等比较都加 `temporary`。
8. `projectList()` 的 byId 投影加 `temporary`。

## 5. dsh-client-ui-workspace/lib/client.js（client，刷新）

1. `sessionVisible()` 返回条件加 `session.temporary !== true` —— 临时会话不出现在侧边栏树。

## 6. dsh-client-ui-conversation/lib/client.js（client，刷新）

1. `chipTitle` 计算移除 `workspaces.phase === "ready" ||` 门控：只要会话有 cwd 就可直接输入，不再被强制"选择工作区"。
