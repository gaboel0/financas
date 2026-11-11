// Build do app desktop: next build -> copia static/public -> sidecar node.exe -> tauri build.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const run = (cmd) =>
  execSync(cmd, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, PATH: `${process.env.USERPROFILE}\\.cargo\\bin;${process.env.PATH}` },
  });

run("npx next build");

const sa = path.join(root, ".next", "standalone");
fs.cpSync(path.join(root, ".next", "static"), path.join(sa, ".next", "static"), { recursive: true });
fs.cpSync(path.join(root, "public"), path.join(sa, "public"), { recursive: true });
// Nunca empacotar dados/segredos
for (const p of ["data", ".claude", "src-tauri"]) fs.rmSync(path.join(sa, p), { recursive: true, force: true });
for (const f of fs.readdirSync(sa)) if (f.startsWith(".env")) fs.rmSync(path.join(sa, f), { force: true });

const bin = path.join(root, "src-tauri", "binaries");
fs.mkdirSync(bin, { recursive: true });
fs.copyFileSync(process.execPath, path.join(bin, "node-x86_64-pc-windows-msvc.exe"));

run("npx tauri build");
