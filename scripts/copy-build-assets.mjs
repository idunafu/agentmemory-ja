import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

for (const file of [
  "iii-config.yaml",
  "iii-config.docker.yaml",
  "docker-compose.yml",
  ".env.example",
]) {
  const source = join(root, file);
  if (existsSync(source)) copyFileSync(source, join(root, "dist", file));
}

mkdirSync(join(root, "dist", "viewer"), { recursive: true });
copyFileSync(join(root, "src", "viewer", "index.html"), join(root, "dist", "viewer", "index.html"));
copyFileSync(join(root, "src", "viewer", "favicon.svg"), join(root, "dist", "viewer", "favicon.svg"));
