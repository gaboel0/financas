// Servidor local do Finanças (sem janela). Iniciado pelo Windows no login via iniciar-oculto.vbs.
// - Lê credenciais de %APPDATA%\FinancasCasa\.env.local
// - Dados em %APPDATA%\FinancasCasa\data
// - Escuta só em 127.0.0.1:3127 e reinicia sozinho se cair
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3127;
const HOST = "127.0.0.1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(process.env.APPDATA, "FinancasCasa");
const serverJs = path.join(root, ".next", "standalone", "server.js");
const logFile = path.join(appDir, "server.log");

fs.mkdirSync(path.join(appDir, "data"), { recursive: true });

function log(msg) {
  try {
    // Mantém o log pequeno (corta acima de ~1 MB)
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 1_000_000) fs.renameSync(logFile, logFile + ".old");
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

function readEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function portInUse() {
  return new Promise((resolve) => {
    const s = net.connect(PORT, HOST);
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
  });
}

if (await portInUse()) {
  log("já está rodando; saindo");
  process.exit(0);
}
if (!fs.existsSync(serverJs)) {
  log(`build não encontrado (${serverJs}). Rode: npm run app:build`);
  process.exit(1);
}

const env = {
  ...process.env,
  ...readEnv(path.join(appDir, ".env.local")),
  NODE_ENV: "production",
  PORT: String(PORT),
  HOSTNAME: HOST,
  DATA_DIR: path.join(appDir, "data"),
};

let restarts = 0;
function start() {
  const out = fs.openSync(logFile, "a");
  const child = spawn(process.execPath, [serverJs], {
    cwd: path.dirname(serverJs),
    env,
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  log(`servidor iniciado (pid ${child.pid})`);
  child.on("exit", (code) => {
    log(`servidor saiu (código ${code})`);
    if (restarts++ < 20) setTimeout(start, 5000);
  });
  // Zera o contador depois de 10 min estável
  setTimeout(() => { restarts = 0; }, 600_000).unref();
}
start();
