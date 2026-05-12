import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONFIG_PATH = join(process.cwd(), "scripts", "vercel-account.config.json");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function getVercelToken() {
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim();

  const appData = process.env.APPDATA || "";
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const authPaths = [
    join(appData, "xdg.data", "com.vercel.cli", "auth.json"),
    join(appData, "com.vercel.cli", "Data", "auth.json"),
    join(home, ".config", "com.vercel.cli", "auth.json"),
  ];

  for (const authPath of authPaths) {
    if (!existsSync(authPath)) continue;
    try {
      const auth = readJson(authPath);
      if (auth?.token) return auth.token;
    } catch {
      // Continue trying other known auth locations.
    }
  }

  return null;
}

function runVercel(args) {
  const escaped = args.map((arg) => `"${String(arg).replace(/"/g, '\\"')}"`).join(" ");
  return execSync(`vercel ${escaped}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  }).trim();
}

if (!existsSync(CONFIG_PATH)) {
  console.error(`[vercel-account-check] Missing config: ${CONFIG_PATH}`);
  process.exit(1);
}

const config = readJson(CONFIG_PATH);
const expectedUser = config.expectedUser?.trim();
const expectedScope = config.expectedScope?.trim();
const token = getVercelToken();

if (!expectedUser) {
  console.error("[vercel-account-check] expectedUser is required in scripts/vercel-account.config.json");
  process.exit(1);
}

try {
  const whoamiArgs = ["whoami"];
  if (token) {
    whoamiArgs.push("--token", token);
  }
  const activeUser = runVercel(whoamiArgs);

  if (activeUser !== expectedUser) {
    console.error(`[vercel-account-check] Logged into "${activeUser}", expected "${expectedUser}".`);
    process.exit(1);
  }

  if (expectedScope) {
    const lsArgs = ["project", "ls", "--scope", expectedScope];
    if (token) {
      lsArgs.push("--token", token);
    }
    runVercel(lsArgs);
  }

  console.log(
    `[vercel-account-check] OK user=${activeUser}${expectedScope ? ` scope=${expectedScope}` : ""}`,
  );
} catch (error) {
  const stderr = error?.stderr?.toString().trim();
  const stdout = error?.stdout?.toString().trim();
  const details = stderr || stdout || error.message || String(error);
  console.error(`[vercel-account-check] Failed: ${details}`);
  process.exit(1);
}
