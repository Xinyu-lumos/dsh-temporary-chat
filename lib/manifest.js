export const PATCH_MANIFEST = [
  {
    "package": "@deepseek-ai/dsh-host-apiproxy",
    "packageDir": "dsh-host-apiproxy",
    "relativePath": "lib/index.js",
    "version": "0.1.0-rc.6",
    "upstreamSha256": "c0c506a6a22c02e07db3a1ced277c5fd4435119c1d97b83fec524da3e66711a9",
    "patchedSha256": "380f09750bba6d1de5d8bb9a35bf39fe84a0a30ad911885b8f613e5d5166c1e2",
    "changes": [
      {
        "id": "dsh-host-apiproxy-1",
        "before": "import { runNativeCommand } from \"@deepseek-ai/dsh-native-command\";",
        "after": "import { runNativeCommand } from \"@deepseek-ai/dsh-native-command\";\nimport { resolveDshHome } from \"@deepseek-ai/dsh-home-paths\";"
      },
      {
        "id": "dsh-host-apiproxy-2",
        "before": "\tagentPreset: z$1.string().optional(),",
        "after": "\tagentPreset: z$1.string().optional(),\n\ttemporary: z$1.boolean().optional(),"
      },
      {
        "id": "dsh-host-apiproxy-3",
        "before": "\tsessionId: sessionIdSchema.optional(),\n\tagentPreset: z$1.string().optional()",
        "after": "\tsessionId: sessionIdSchema.optional(),\n\tagentPreset: z$1.string().optional(),\n\ttemporary: z$1.boolean().optional()"
      },
      {
        "id": "dsh-host-apiproxy-4",
        "before": "\t\t...header.cwd === void 0 ? {} : { cwd: header.cwd },",
        "after": "\t\t...header.cwd === void 0 ? {} : { cwd: header.cwd },\n\t\t...header.temporary === void 0 ? {} : { temporary: header.temporary },"
      },
      {
        "id": "dsh-host-apiproxy-5",
        "before": "\tasync function ensureSession(sessionId, cwd, checkPersistedIdentity, presetId) {",
        "after": "\tasync function ensureSession(sessionId, cwd, checkPersistedIdentity, presetId, temporary) {"
      },
      {
        "id": "dsh-host-apiproxy-6",
        "before": "\t\t\t\t\t\tcwd,",
        "after": "\t\t\t\t\t\tcwd,\n\t\t\t\t\t\t...temporary === true ? { temporary: true } : {},"
      },
      {
        "id": "dsh-host-apiproxy-7",
        "before": "\t\t\t\tconst cwd = workspace?.path ?? request.payload.cwd ?? defaults.cwd;\n\t\t\t\tconst requestedPreset = request.payload.agentPreset;\n\t\t\t\ttry {\n\t\t\t\t\tawait ensureSession(sessionId, cwd, request.payload.sessionId !== void 0, requestedPreset);",
        "after": "\t\t\t\tconst cwd = workspace?.path ?? request.payload.cwd ?? (request.payload.temporary === true ? resolveDshHome() : defaults.cwd);\n\t\t\t\tconst requestedPreset = request.payload.agentPreset;\n\t\t\t\ttry {\n\t\t\t\t\tawait ensureSession(sessionId, cwd, request.payload.sessionId !== void 0, requestedPreset, request.payload.temporary === true);"
      },
      {
        "id": "dsh-host-apiproxy-8",
        "before": "\t\tagentPreset: z$1.string().optional()",
        "after": "\t\tagentPreset: z$1.string().optional(),\n\t\ttemporary: z$1.boolean().optional()"
      }
    ]
  },
  {
    "package": "@deepseek-ai/dsh-session-persistence",
    "packageDir": "dsh-session-persistence",
    "relativePath": "lib/index.js",
    "version": "0.1.0-rc.6",
    "upstreamSha256": "a2628d6665e2e490d0cf54440ba671f850298853a385df0e7806ce4fa6589cdf",
    "patchedSha256": "0fe108406078e67d2a07ed98707c9784d7b21b54493b5c2d6361e4167105f4d8",
    "changes": [
      {
        "id": "dsh-session-persistence-1",
        "before": "* @typeParam TornMarker - the backend's opaque torn-tail repair token.\n*/",
        "after": "* @typeParam TornMarker - the backend's opaque torn-tail repair token.\n*/\n/**\n * Frozen no-op lifecycle controller returned for temporary sessions that\n * must never persist: every write-path access is a safe no-op so a temporary\n * session stays in memory only and disappears on disposal.\n */\nvar NOOP_PERSISTENCE_LIVE = Object.freeze({\n\tinit: Promise.resolve(),\n\twrites: Object.freeze({ enqueue() {}, cancelAutomaticWait() {}, flush() {}, hasWork: false })\n});"
      },
      {
        "id": "dsh-session-persistence-2",
        "before": "\tinitFor(session) {",
        "after": "\tinitFor(session) {\n\t\tif (session.header.temporary === true) return NOOP_PERSISTENCE_LIVE;"
      }
    ]
  },
  {
    "package": "@deepseek-ai/dsh-client-connection",
    "packageDir": "dsh-client-connection",
    "relativePath": "lib/client.js",
    "version": "0.1.0-rc.6",
    "upstreamSha256": "45fdcf6f5cd772160c49186424cf8e81d528e25f2d10aac8323a90a011b1d3c1",
    "patchedSha256": "1476a664e66f4fd8f5a9b4455b89d4dc552f440bf87c04cf13c5a710b9c980c2",
    "changes": [
      {
        "id": "dsh-client-connection-1",
        "before": "\t\t\tagentPreset: string().optional(),",
        "after": "\t\t\tagentPreset: string().optional(),\n\t\t\ttemporary: boolean().optional(),"
      },
      {
        "id": "dsh-client-connection-2",
        "before": "\t\t\tsessionId: sessionIdSchema.optional(),\n\t\t\tagentPreset: string().optional()",
        "after": "\t\t\tsessionId: sessionIdSchema.optional(),\n\t\t\tagentPreset: string().optional(),\n\t\t\ttemporary: boolean().optional()"
      },
      {
        "id": "dsh-client-connection-3",
        "before": "\t\t\t\tagentPreset: string().optional()",
        "after": "\t\t\t\tagentPreset: string().optional(),\n\t\t\t\ttemporary: boolean().optional()"
      }
    ]
  },
  {
    "package": "@deepseek-ai/dsh-client-runtime",
    "packageDir": "dsh-client-runtime",
    "relativePath": "lib/client.js",
    "version": "0.1.0-rc.6",
    "upstreamSha256": "c3303226b83b367fe5d88040af4eef006c7577fd6179a8876eb7e7d304c18c54",
    "patchedSha256": "9fa280f378c0d1034d1472d572c1107d648a16749b39388ecb73fa07db31134b",
    "changes": [
      {
        "id": "dsh-client-runtime-1",
        "before": "\t\t\t\t\tconst shared = opts.sessionId === void 0 ? {} : { sessionId: opts.sessionId };",
        "after": "\t\t\t\t\tconst shared = {\n\t\t\t\t\t\t...opts.sessionId === void 0 ? {} : { sessionId: opts.sessionId },\n\t\t\t\t\t\t...opts.temporary === true ? { temporary: true } : {}\n\t\t\t\t\t};"
      },
      {
        "id": "dsh-client-runtime-2",
        "before": "\t\t\t\t\t\t\t...opts.cwd !== void 0 ? { cwd: opts.cwd } : {},",
        "after": "\t\t\t\t\t\t\t...opts.cwd !== void 0 ? { cwd: opts.cwd } : {},\n\t\t\t\t\t\t\t...opts.temporary === true ? { temporary: true } : {},"
      },
      {
        "id": "dsh-client-runtime-3",
        "before": "\t\t\t\t\t\t\t...frame.cwd !== void 0 ? { cwd: frame.cwd } : {},",
        "after": "\t\t\t\t\t\t\t...frame.cwd !== void 0 ? { cwd: frame.cwd } : {},\n\t\t\t\t\t\t\t...frame.temporary !== void 0 ? { temporary: frame.temporary } : {},"
      },
      {
        "id": "dsh-client-runtime-4",
        "before": "\t\t\t\t\t\t...mutation.summary.agentPreset !== void 0 ? { agentPreset: mutation.summary.agentPreset } : {}\n\t\t\t\t\t};\n\t\t\t\t\tif (filled.cwd === existing.cwd && filled.parentSessionId === existing.parentSessionId && filled.origin === existing.origin && filled.blank === existing.blank && filled.agentPreset === existing.agentPreset) return [...summaries];",
        "after": "\t\t\t\t\t\t...existing.temporary === void 0 && mutation.summary.temporary !== void 0 ? { temporary: mutation.summary.temporary } : {},\n\t\t\t\t\t\t...mutation.summary.agentPreset !== void 0 ? { agentPreset: mutation.summary.agentPreset } : {}\n\t\t\t\t\t};\n\t\t\t\t\tif (filled.cwd === existing.cwd && filled.parentSessionId === existing.parentSessionId && filled.origin === existing.origin && filled.blank === existing.blank && filled.agentPreset === existing.agentPreset && filled.temporary === existing.temporary) return [...summaries];"
      },
      {
        "id": "dsh-client-runtime-5",
        "before": "\t\t\t\t\t\t...entry.agentPreset !== void 0 ? { agentPreset: entry.agentPreset } : {}",
        "after": "\t\t\t\t\t\t...entry.agentPreset !== void 0 ? { agentPreset: entry.agentPreset } : {},\n\t\t\t\t\t\t...entry.temporary !== void 0 ? { temporary: entry.temporary } : {}"
      },
      {
        "id": "dsh-client-runtime-6",
        "before": "\t\t\tinitialSelectionStarted = false;",
        "after": "\t\t\tinitialSelectionStarted = false;\n\t\t\t/** Coalesces one in-flight no-workspace (direct chat) blank-session create. */\n\t\t\tdefaultConnecting = void 0;"
      },
      {
        "id": "dsh-client-runtime-7",
        "before": "\t\t\t* Follow the first complete Workspace/Session baseline and select a default\n\t\t\t* session exactly once. A restored current session wins; otherwise the most\n\t\t\t* recent Workspace is connected (reusing or creating its blank session).",
        "after": "\t\t\t* Connect the no-workspace \"direct chat\" flow: create a blank session with\n\t\t\t* the Host default working directory (no workspaceId and no cwd, so the Host\n\t\t\t* falls back to its default directory) and return its id. Coalesces a single\n\t\t\t* in-flight attempt.\n\t\t\t* @returns the created session id.\n\t\t\t*/\n\t\t\tasync connectDefault() {\n\t\t\t\tif (this.defaultConnecting !== void 0) return this.defaultConnecting;\n\t\t\t\tconst snapshot = this.sessions.list.getSnapshot();\n\t\t\t\tconst current = snapshot.current;\n\t\t\t\tif (current !== void 0 && snapshot.byId[current]?.blank === true && !this.list.getSnapshot().items.some((item) => item.sessionIds.includes(current))) {\n\t\t\t\t\treturn current;\n\t\t\t\t}\n\t\t\t\tconst attempt = this.sessions.create({ temporary: true }).finally(() => {\n\t\t\t\t\tthis.defaultConnecting = void 0;\n\t\t\t\t});\n\t\t\t\tthis.defaultConnecting = attempt;\n\t\t\t\treturn attempt;\n\t\t\t}\n\t\t\t/**\n\t\t\t* Follow the first complete Workspace/Session baseline and select a default\n\t\t\t* session exactly once. A restored current session wins; otherwise the most\n\t\t\t* recent Workspace is connected (reusing or creating its blank session);\n\t\t\t* with no recent Workspace, a no-workspace session on the Host default\n\t\t\t* directory is connected instead."
      },
      {
        "id": "dsh-client-runtime-8",
        "before": "\t\t\t\t\tif (current !== void 0 || target === void 0) {\n\t\t\t\t\t\tstate = \"done\";\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\t\t\t\t\tstate = \"connecting\";\n\t\t\t\t\tthis.connectWorkspace(target).then((sessionId) => {",
        "after": "\t\t\t\t\tif (current !== void 0) {\n\t\t\t\t\t\tstate = \"done\";\n\t\t\t\t\t\treturn;\n\t\t\t\t\t}\n\t\t\t\t\tstate = \"connecting\";\n\t\t\t\t\tconst connect = target !== void 0 ? this.connectWorkspace(target) : this.connectDefault();\n\t\t\t\t\tconnect.then((sessionId) => {"
      },
      {
        "id": "dsh-client-runtime-9",
        "before": "\t\t\t* Workspace at all, clear the selection into the New Session view state.\n\t\t\t* Connect failures are non-fatal (console diagnostics; the current view\n\t\t\t* stays usable).\n\t\t\t* @param workspaceId - explicit target Workspace for scoped actions.\n\t\t\t*/\n\t\t\tstartSession(workspaceId) {\n\t\t\t\tconst workspace = this.list.getSnapshot();\n\t\t\t\tconst current = this.sessions.list.getSnapshot().current;\n\t\t\t\tconst currentWorkspaceId = current === void 0 ? void 0 : workspace.items.find((item) => item.sessionIds.includes(current))?.workspaceId;\n\t\t\t\tconst target = workspaceId ?? currentWorkspaceId ?? workspace.recentWorkspaceId;\n\t\t\t\tif (target === void 0) {\n\t\t\t\t\tthis.sessions.clear();",
        "after": "\t\t\t* Workspace at all, connect a blank session on the Host default directory.\n\t\t\t* Connect failures are non-fatal (console diagnostics; the current view\n\t\t\t* stays usable).\n\t\t\t* @param workspaceId - explicit target Workspace for scoped actions.\n\t\t\t*/\n\t\t\tstartSession(workspaceId) {\n\t\t\t\tconst workspace = this.list.getSnapshot();\n\t\t\t\tconst current = this.sessions.list.getSnapshot().current;\n\t\t\t\tconst currentWorkspaceId = current === void 0 ? void 0 : workspace.items.find((item) => item.sessionIds.includes(current))?.workspaceId;\n\t\t\t\tconst target = workspaceId ?? currentWorkspaceId ?? workspace.recentWorkspaceId;\n\t\t\t\tif (target === void 0) {\n\t\t\t\t\tthis.connectDefault().then((sessionId) => {\n\t\t\t\t\t\tthis.sessions.open(sessionId);\n\t\t\t\t\t}, (reason) => {\n\t\t\t\t\t\tconsole.warn(\"new session failed:\", reason);\n\t\t\t\t\t});"
      }
    ]
  },
  {
    "package": "@deepseek-ai/dsh-client-ui-workspace",
    "packageDir": "dsh-client-ui-workspace",
    "relativePath": "lib/client.js",
    "version": "0.1.0-rc.6",
    "upstreamSha256": "7579ea4578750df71309dcf4881cf588aced13cf8137273a2c308a29bceb6464",
    "patchedSha256": "1ace5eba586d7cb09813a2856b7a2bf3934ebc43b020bc1f7f552bddbaa2e51c",
    "changes": [
      {
        "id": "dsh-client-ui-workspace-1",
        "before": "\t\t\treturn session.origin !== \"subagent\" && !archived.has(session.id) && (!session.blank || session.id === current);",
        "after": "\t\t\treturn session.origin !== \"subagent\" && session.temporary !== true && !archived.has(session.id) && (!session.blank || session.id === current);"
      }
    ]
  },
  {
    "package": "@deepseek-ai/dsh-client-ui-conversation",
    "packageDir": "dsh-client-ui-conversation",
    "relativePath": "lib/client.js",
    "version": "0.1.0-rc.6",
    "upstreamSha256": "0f7927e6284159b9b4138df50a1d64755e6e3ff76064bb06309678392530a829",
    "patchedSha256": "2446473697342e7e456beaeee344ae217369717b5d4eedd8f039d022fecac4e2",
    "changes": [
      {
        "id": "dsh-client-ui-conversation-1",
        "before": "\t\t\tconst chipTitle = pendingWorkspace?.title ?? (sessionId === void 0 ? void 0 : sessionWorkspace?.title ?? (workspaces.phase === \"ready\" || cwd === void 0 || cwd === \"\" ? void 0 : workspaceLabel(cwd)));",
        "after": "\t\t\tconst chipTitle = pendingWorkspace?.title ?? (sessionId === void 0 ? void 0 : sessionWorkspace?.title ?? (cwd === void 0 || cwd === \"\" ? void 0 : workspaceLabel(cwd)));"
      }
    ]
  }
];
