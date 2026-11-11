// Reinicia o servidor local (use depois de npm run app:build). Para só o que escuta na 3127 e o lançador.
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stopOnly = process.argv.includes("--stop");

execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Where-Object { $_.CommandLine -like '*app-server.mjs*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Get-NetTCPConnection -LocalPort 3127 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  exit 0
`], { stdio: "inherit" });

if (stopOnly) {
  console.log("Servidor parado.");
} else {
  setTimeout(() => {
    spawn(process.execPath, [path.join(root, "scripts", "app-server.mjs")], {
      detached: true, stdio: "ignore", windowsHide: true,
    }).unref();
    console.log("Servidor reiniciado em http://127.0.0.1:3127");
  }, 1500);
}
