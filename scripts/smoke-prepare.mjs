import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, ".tmp");
const vaultDir = path.join(tmpDir, "vault");
const manifestPath = path.join(rootDir, "manifest.json");

const manifestRaw = await fs.readFile(manifestPath, "utf8");
const manifest = JSON.parse(manifestRaw);

if (!manifest.id || typeof manifest.id !== "string") {
  throw new Error("manifest.json must contain a valid plugin id.");
}

const pluginDir = path.join(vaultDir, ".obsidian", "plugins", manifest.id);
const requiredFiles = ["main.js", "manifest.json", "styles.css", "versions.json"];

await fs.rm(vaultDir, { recursive: true, force: true });
await fs.mkdir(pluginDir, { recursive: true });

for (const fileName of requiredFiles) {
  const sourcePath = path.join(rootDir, fileName);
  const targetPath = path.join(pluginDir, fileName);

  try {
    await fs.access(sourcePath);
  } catch {
    throw new Error(`${fileName} is missing. Run \"npm run build\" first.`);
  }

  await fs.copyFile(sourcePath, targetPath);
}

const report = {
  preparedAt: new Date().toISOString(),
  pluginId: manifest.id,
  pluginDir
};

await fs.writeFile(
  path.join(tmpDir, "smoke-prepare.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(`[smoke:prepare] plugin sandbox ready at ${pluginDir}`);
