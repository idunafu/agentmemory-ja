import { defineConfig } from "tsdown";

const hookEntries = [
  "src/hooks/session-start.ts",
  "src/hooks/prompt-submit.ts",
  "src/hooks/pre-tool-use.ts",
  "src/hooks/post-tool-use.ts",
  "src/hooks/post-tool-failure.ts",
  "src/hooks/pre-compact.ts",
  "src/hooks/subagent-start.ts",
  "src/hooks/subagent-stop.ts",
  "src/hooks/notification.ts",
  "src/hooks/task-completed.ts",
  "src/hooks/stop.ts",
  "src/hooks/session-end.ts",
  "src/hooks/post-commit.ts",
];

const shared = {
  format: ["esm"] as const,
  target: "node20" as const,
  inlineOnly: false as const,
  // Keep Transformers.js as a node_modules import. It is lazy-loaded from
  // src/providers/embedding/{clip,local}.ts and src/state/reranker.ts, and it
  // brings the appropriate ONNX Runtime packages transitively.
  external: [
    "@huggingface/transformers",
    "@anthropic-ai/claude-agent-sdk",
    "@anthropic-ai/sdk",
  ] as const,
};

export default defineConfig([
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    ...shared,
    dts: true,
    clean: true,
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: ["src/cli.ts"],
    outDir: "dist",
    ...shared,
    clean: false,
    sourcemap: false,
  },
  {
    entry: ["src/mcp/standalone.ts"],
    outDir: "dist",
    ...shared,
    clean: false,
    sourcemap: false,
  },
  {
    entry: hookEntries,
    outDir: "dist/hooks",
    ...shared,
    clean: false,
    sourcemap: false,
  },
  {
    entry: hookEntries,
    outDir: "plugin/scripts",
    ...shared,
    clean: false,
    sourcemap: false,
  },
]);
