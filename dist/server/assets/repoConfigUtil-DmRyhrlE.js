import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const CONFIG_FILE = resolve(process.cwd(), "data", "github-config.json");
const DEFAULT_CONFIG = {
  owner: "",
  repo: "",
  branch: "main"
};
function readRepoConfig() {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      owner: typeof parsed.owner === "string" && parsed.owner.trim() ? parsed.owner.trim() : DEFAULT_CONFIG.owner,
      repo: typeof parsed.repo === "string" && parsed.repo.trim() ? parsed.repo.trim() : DEFAULT_CONFIG.repo,
      branch: typeof parsed.branch === "string" && parsed.branch.trim() ? parsed.branch.trim() : DEFAULT_CONFIG.branch
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
function writeRepoConfig(config) {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}
export {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  readRepoConfig,
  writeRepoConfig
};
