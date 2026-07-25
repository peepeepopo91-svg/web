import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
const TOKEN_FILE = resolve(process.cwd(), ".github-token.json");
function resolveGitHubToken() {
  const envTok = process.env.GITHUB_TOKEN;
  if (envTok) return envTok;
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
    if (typeof data.token === "string" && data.token.trim()) return data.token.trim();
  } catch {
  }
  return null;
}
function resolveTokenSource() {
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
    const tok = data.token;
    if (typeof tok === "string" && tok.trim()) return { token: tok.trim(), source: "file" };
  } catch {
  }
  const envTok = process.env.GITHUB_TOKEN;
  if (envTok) return { token: envTok, source: "env" };
  return null;
}
function persistToken(token) {
  writeFileSync(TOKEN_FILE, JSON.stringify({ token }, null, 2), "utf8");
  process.env.GITHUB_TOKEN = token;
}
function eraseToken() {
  try {
    const data = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
    if (data.token) {
      unlinkSync(TOKEN_FILE);
      delete process.env.GITHUB_TOKEN;
      return true;
    }
  } catch {
  }
  return false;
}
export {
  resolveGitHubToken as a,
  eraseToken as e,
  persistToken as p,
  resolveTokenSource as r
};
