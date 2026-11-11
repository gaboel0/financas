// Build de produção do servidor local: next build -> copia static/public para o standalone.
// Rode de novo sempre que mudar o código: npm run app:build
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
execSync("npx next build", { stdio: "inherit", cwd: root });

const sa = path.join(root, ".next", "standalone");
fs.cpSync(path.join(root, ".next", "static"), path.join(sa, ".next", "static"), { recursive: true });
fs.cpSync(path.join(root, "public"), path.join(sa, "public"), { recursive: true });
// Nunca deixar dados/segredos do projeto dentro do build (o app usa %APPDATA%\FinancasCasa)
for (const p of ["data", ".claude", "src-tauri"]) fs.rmSync(path.join(sa, p), { recursive: true, force: true });
for (const f of fs.readdirSync(sa)) if (f.startsWith(".env")) fs.rmSync(path.join(sa, f), { force: true });

console.log("\nBuild pronto em .next/standalone. Reinicie o servidor: npm run app:restart");
