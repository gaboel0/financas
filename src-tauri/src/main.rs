#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::net::{SocketAddr, TcpStream};
use std::os::windows::io::AsRawHandle;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;

use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, RunEvent, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

const PORT: u16 = 3127;
const BASE_URL: &str = "http://127.0.0.1:3127";
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct Server(Mutex<Option<Child>>);

/// Pasta de dados/config: %APPDATA%\FinancasCasa
fn app_dir() -> PathBuf {
    let base = std::env::var_os("APPDATA").map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
    base.join("FinancasCasa")
}

/// Lê KEY=VALUE (ignora comentários e linhas vazias; remove aspas simples/duplas).
fn read_env_file(path: &Path) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let Ok(text) = std::fs::read_to_string(path) else { return map };
    for line in text.lines() {
        let line = line.trim().trim_start_matches('\u{feff}');
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let line = line.strip_prefix("export ").unwrap_or(line);
        if let Some((k, v)) = line.split_once('=') {
            let v = v.trim();
            let quoted = v.len() >= 2
                && ((v.starts_with('"') && v.ends_with('"')) || (v.starts_with('\'') && v.ends_with('\'')));
            let v = if quoted { &v[1..v.len() - 1] } else { v };
            map.insert(k.trim().to_string(), v.to_string());
        }
    }
    map
}

/// Remove o prefixo `\\?\` que o Tauri pode devolver (Node/Next não lidam bem com ele).
fn clean(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy().to_string();
    match s.strip_prefix(r"\\?\") {
        Some(rest) => PathBuf::from(rest),
        None => p,
    }
}

/// Job Object com KILL_ON_JOB_CLOSE: o Windows mata o Node se o app morrer (inclusive pelo Gerenciador de Tarefas).
fn attach_kill_on_close_job(child: &Child) {
    use windows_sys::Win32::System::JobObjects::*;
    unsafe {
        let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if job.is_null() {
            return;
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const _,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        );
        AssignProcessToJobObject(job, child.as_raw_handle() as _);
        // O handle do job fica aberto até o processo terminar (de propósito, sem CloseHandle).
    }
}

fn spawn_server(app: &AppHandle) -> Result<Child, String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .map(Path::to_path_buf)
        .ok_or("sem diretório do executável")?;
    let node = exe_dir.join("node.exe");
    let res = clean(app.path().resource_dir().map_err(|e| e.to_string())?);
    let server_dir = res.join("server");
    let server_js = server_dir.join("server.js");
    if !node.exists() {
        return Err(format!("node.exe não encontrado em {}", node.display()));
    }
    if !server_js.exists() {
        return Err(format!("server.js não encontrado em {}", server_js.display()));
    }

    let dir = app_dir();
    let data = dir.join("data");
    let _ = std::fs::create_dir_all(&data);

    let mut cmd = Command::new(&node);
    cmd.arg(&server_js)
        .current_dir(&server_dir)
        .env("NODE_ENV", "production")
        .creation_flags(CREATE_NO_WINDOW);
    for (k, v) in read_env_file(&dir.join(".env.local")) {
        cmd.env(k, v);
    }
    // Aplicados por último para o arquivo de env não sobrescrever os essenciais.
    cmd.env("HOSTNAME", "127.0.0.1").env("PORT", PORT.to_string()).env("DATA_DIR", &data);

    let child = cmd.spawn().map_err(|e| e.to_string())?;
    attach_kill_on_close_job(&child);
    Ok(child)
}

fn port_open() -> bool {
    let addr: SocketAddr = ([127, 0, 0, 1], PORT).into();
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

fn kill_server(app: &AppHandle) {
    if let Some(state) = app.try_state::<Server>() {
        if let Some(mut child) = state.0.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn notify(app: &AppHandle, title: &str, body: &str) {
    let _ = app.notification().builder().title(title).body(body).show();
}

/// Valor após `"key":` no JSON (parse mínimo, sem depender de serde).
fn json_field<'a>(s: &'a str, key: &str) -> Option<&'a str> {
    let k = format!("\"{key}\":");
    s.find(&k).map(|i| s[i + k.len()..].trim_start())
}

fn sync_message(body: &str) -> String {
    if let Some(r) = json_field(body, "skipped") {
        let reason = r.strip_prefix('"').and_then(|r| r.split('"').next()).unwrap_or("");
        return match reason {
            "no-credentials" => "Sem credenciais da Pluggy configuradas.".to_string(),
            "running" => "Já existe uma sincronização em andamento.".to_string(),
            other => format!("Sincronização ignorada: {other}"),
        };
    }
    let ok = json_field(body, "ok").map_or(false, |r| r.starts_with("true"));
    if ok {
        let n: String = json_field(body, "upserted")
            .map(|r| r.chars().take_while(|c| c.is_ascii_digit()).collect())
            .unwrap_or_default();
        format!("Sincronização concluída ({} transações atualizadas).", if n.is_empty() { "0" } else { &n })
    } else {
        let raw: String = body.chars().take(200).collect();
        format!("Sincronização com erros: {raw}")
    }
}

fn sync_now(app: AppHandle) {
    std::thread::spawn(move || {
        if !port_open() {
            notify(&app, "Finanças", "O servidor ainda está iniciando. Tente novamente em instantes.");
            return;
        }
        let agent = ureq::AgentBuilder::new().timeout(Duration::from_secs(600)).build();
        let msg = match agent.post(&format!("{BASE_URL}/api/sync")).send_string("") {
            Ok(resp) => sync_message(&resp.into_string().unwrap_or_default()),
            Err(e) => format!("Falha ao sincronizar: {e}"),
        };
        notify(&app, "Finanças - Sincronização", &msg);
    });
}

fn build_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let handle = app.clone();
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Finanças")
        .inner_size(1440.0, 920.0)
        .min_inner_size(1024.0, 700.0)
        .center()
        .visible(false)
        .initialization_script(
            // Links target=_blank viram navegação normal; on_navigation decide se abre no navegador.
            "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[target=_blank]');if(a&&a.href){e.preventDefault();window.location.href=a.href;}},true);",
        )
        .on_navigation(move |url: &Url| {
            let internal = matches!(url.scheme(), "tauri" | "about" | "data" | "blob")
                || url.host_str().map_or(false, |h| h == "127.0.0.1" || h == "tauri.localhost");
            if !internal {
                let _ = handle.opener().open_url(url.as_str(), None::<&str>);
            }
            internal
        })
        .build()
}

fn main() {
    let hidden = std::env::args().any(|a| a == "--hidden");

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .manage(Server(Mutex::new(None)))
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(move |app| {
            let handle = app.handle().clone();

            // Autostart ligado por padrão na primeira execução; depois respeita a escolha do usuário.
            let marker = app_dir().join(".autostart-init");
            if !marker.exists() {
                let _ = std::fs::create_dir_all(app_dir());
                let _ = handle.autolaunch().enable();
                let _ = std::fs::write(&marker, "1");
            }
            let autostart_on = handle.autolaunch().is_enabled().unwrap_or(false);

            // Tray
            let open = MenuItem::with_id(app, "open", "Abrir Finanças", true, None::<&str>)?;
            let browser = MenuItem::with_id(app, "browser", "Abrir no navegador", true, None::<&str>)?;
            let sync = MenuItem::with_id(app, "sync", "Sincronizar agora", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let auto = CheckMenuItem::with_id(app, "autostart", "Iniciar com o Windows", true, autostart_on, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &browser, &sync, &sep, &auto, &quit])?;

            let auto_item = auto.clone();
            TrayIconBuilder::with_id("main")
                .icon(Image::from_bytes(include_bytes!("../icons/32x32.png"))?)
                .tooltip("Finanças")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "open" => show_main(app),
                    "browser" => {
                        let _ = app.opener().open_url(BASE_URL, None::<&str>);
                    }
                    "sync" => sync_now(app.clone()),
                    "autostart" => {
                        let al = app.autolaunch();
                        let on = al.is_enabled().unwrap_or(false);
                        let _ = if on { al.disable() } else { al.enable() };
                        let _ = auto_item.set_checked(al.is_enabled().unwrap_or(false));
                    }
                    "quit" => {
                        kill_server(app);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. }
                    | TrayIconEvent::DoubleClick { button: MouseButton::Left, .. } => show_main(tray.app_handle()),
                    _ => {}
                })
                .build(app)?;

            // Janela (com página de carregamento) e servidor Next
            let window = build_window(&handle)?;
            if !hidden {
                let _ = window.show();
            }

            match spawn_server(&handle) {
                Ok(child) => {
                    *handle.state::<Server>().0.lock().unwrap() = Some(child);
                    let h = handle.clone();
                    std::thread::spawn(move || {
                        for _ in 0..240 {
                            if port_open() {
                                if let Some(w) = h.get_webview_window("main") {
                                    let _ = w.navigate(Url::parse(BASE_URL).unwrap());
                                }
                                return;
                            }
                            std::thread::sleep(Duration::from_millis(500));
                        }
                        notify(&h, "Finanças", "O servidor não respondeu.");
                    });
                }
                Err(e) => {
                    let _ = std::fs::create_dir_all(app_dir());
                    let _ = std::fs::write(app_dir().join("erro-inicial.log"), &e);
                    notify(&handle, "Finanças", &format!("Falha ao iniciar o servidor: {e}"));
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erro ao construir o app");

    app.run(|app, event| {
        if let RunEvent::Exit = event {
            kill_server(app);
        }
    });
}
