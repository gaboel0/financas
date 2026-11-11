// Instala o atalho "Finanças" no Menu Iniciar (sem EXE próprio: compatível com o Controle Inteligente de Aplicativos).
// Ao abrir: sobe o servidor local (que sincroniza os bancos na hora), abre a janela do app (Edge em modo app)
// e, quando a janela é fechada, desliga o servidor. Não inicia com o Windows.
// Uso: npm run app:install   |   remover: npm run app:uninstall
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(process.env.APPDATA, "FinancasCasa");
const programs = path.join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs");
const menuLnk = path.join(programs, "Finanças.lnk");
const oldStartupLnk = path.join(programs, "Startup", "Finanças (servidor).lnk");

fs.rmSync(oldStartupLnk, { force: true }); // versões antigas criavam isso
if (process.argv.includes("--uninstall")) {
  fs.rmSync(menuLnk, { force: true });
  console.log("Atalho removido. (Dados continuam em " + appDir + ")");
  process.exit(0);
}

fs.mkdirSync(appDir, { recursive: true });
const node = process.execPath;
const serverScript = path.join(root, "scripts", "app-server.mjs");
const stopScript = path.join(root, "scripts", "app-restart.mjs");
const edge = [
  path.join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
  path.join(process.env.ProgramFiles ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
].find((p) => fs.existsSync(p));
if (!edge) throw new Error("Microsoft Edge não encontrado.");

const iconSrc = path.join(root, "src-tauri", "icons", "icon.ico");
const icon = path.join(appDir, "financas.ico");
if (fs.existsSync(iconSrc)) fs.copyFileSync(iconSrc, icon);

const url = "http://127.0.0.1:3127";
const profile = path.join(appDir, "janela");
const vbs = `' Abre o Financas: sobe o servidor (que ja sincroniza os bancos), abre a janela e desliga tudo ao fechar
Option Explicit
Dim sh, i, ok, started
Set sh = CreateObject("WScript.Shell")
Function Up()
  On Error Resume Next
  Dim http
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 1000, 1000, 2000, 2000
  http.Open "GET", "${url}/api/notifications", False
  http.Send
  Up = (Err.Number = 0 And http.Status = 200)
End Function
started = False
If Not Up() Then
  sh.Run """${node}"" ""${serverScript}""", 0, False
  started = True
  ok = False
  For i = 1 To 60
    WScript.Sleep 500
    If Up() Then ok = True : Exit For
  Next
  If Not ok Then
    MsgBox "O servidor do Financas nao respondeu. Veja o log em %APPDATA%\\FinancasCasa\\server.log", 48, "Financas"
    WScript.Quit 1
  End If
End If
' Quantos processos do Edge usam o perfil do app (a janela pode trocar de processo, entao nao da pra esperar so o primeiro)
Function Janelas()
  On Error Resume Next
  Dim wmi
  Set wmi = GetObject("winmgmts:\\\\.\\root\\cimv2")
  Janelas = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name='msedge.exe' AND CommandLine LIKE '%FinancasCasa%janela%'").Count
End Function
' Perfil proprio do Edge: janela separada do seu navegador
sh.Run """${edge}"" --app=${url} --user-data-dir=""${profile}"" --no-first-run --no-default-browser-check --window-size=1440,920", 1, False
' espera a janela aparecer (ate 20s) e depois ate ela fechar
For i = 1 To 40
  WScript.Sleep 500
  If Janelas() > 0 Then Exit For
Next
Dim vazio
vazio = 0
Do
  WScript.Sleep 3000
  If Janelas() = 0 Then vazio = vazio + 1 Else vazio = 0
Loop Until vazio >= 2
If started Then sh.Run """${node}"" ""${stopScript}"" --stop", 0, True
`;
// VBS precisa de ANSI (os caminhos aqui não têm acento)
fs.writeFileSync(path.join(appDir, "abrir.vbs"), vbs, "latin1");
fs.rmSync(path.join(appDir, "iniciar-oculto.vbs"), { force: true });

const wscript = path.join(process.env.SystemRoot, "System32", "wscript.exe");
const q = (s) => s.replace(/'/g, "''");
const ps = `
$l = (New-Object -ComObject WScript.Shell).CreateShortcut('${q(menuLnk)}')
$l.TargetPath = '${q(wscript)}'
$l.Arguments = '"${q(path.join(appDir, "abrir.vbs"))}"'
$l.WorkingDirectory = '${q(appDir)}'
$l.Description = 'Abrir o Finanças'
if (Test-Path '${q(icon)}') { $l.IconLocation = '${q(icon)},0' }
$l.Save()
`;
execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(ps, "utf16le").toString("base64")], { stdio: "inherit" });

console.log(`Instalado: "Finanças" no Menu Iniciar (${menuLnk}).
Clique com o botão direito nele para fixar na barra de tarefas.`);
