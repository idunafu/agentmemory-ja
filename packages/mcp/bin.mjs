#!/usr/bin/env node
import("@idunafu/agentmemory-ja/dist/standalone.mjs").catch((err) => {
  console.error(
    "[@idunafu/agentmemory-ja-mcp] Failed to load standalone entrypoint from @idunafu/agentmemory-ja.",
  );
  console.error(
    "[@idunafu/agentmemory-ja-mcp] Try installing manually: npm i -g @idunafu/agentmemory-ja",
  );
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
