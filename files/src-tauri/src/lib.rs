use std::{
  io::{BufRead, BufReader, Write},
  net::TcpListener,
  process::Command,
  thread,
  time::{Duration, Instant},
};
use tauri::Emitter;

const SPOTIFY_CALLBACK_PATH: &str = "/spotify/callback";
const SPOTIFY_OAUTH_EVENT: &str = "ikigai://spotify-oauth";

#[tauri::command]
fn start_spotify_oauth_listener(app: tauri::AppHandle) -> Result<String, String> {
  let listener = TcpListener::bind("127.0.0.1:0")
    .map_err(|error| format!("Ikigai could not reserve a local Spotify callback port: {error}"))?;
  listener
    .set_nonblocking(true)
    .map_err(|error| format!("Ikigai could not prepare the Spotify callback listener: {error}"))?;
  let port = listener
    .local_addr()
    .map_err(|error| format!("Ikigai could not read the Spotify callback port: {error}"))?
    .port();
  let redirect_uri = format!("http://127.0.0.1:{port}{SPOTIFY_CALLBACK_PATH}");

  thread::spawn(move || {
    let deadline = Instant::now() + Duration::from_secs(300);
    while Instant::now() < deadline {
      match listener.accept() {
        Ok((mut stream, _)) => {
          let request_line = {
            let mut reader = BufReader::new(&mut stream);
            let mut line = String::new();
            let _ = reader.read_line(&mut line);
            line
          };

          let path = request_line.split_whitespace().nth(1).unwrap_or("");
          if path.starts_with(SPOTIFY_CALLBACK_PATH) {
            let search = path
              .split_once('?')
              .map(|(_, query)| format!("?{query}"))
              .unwrap_or_default();
            let _ = app.emit(SPOTIFY_OAUTH_EVENT, search);

            let body = "<!doctype html><meta charset=\"utf-8\"><title>Ikigai OS · Spotify</title><style>body{font:16px system-ui;background:#151713;color:#f4efe3;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:520px;padding:32px;text-align:center}small{color:#a9aa9f}</style><main><h1>Spotify returned to Ikigai OS.</h1><p>You can close this browser tab and return to Ikigai.</p><small>The authorization result was sent only to the local app on this device.</small></main>";
            let response = format!(
              "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n{}",
              body.len(),
              body
            );
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
            break;
          }

          let body = "Not found";
          let response = format!(
            "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
          );
          let _ = stream.write_all(response.as_bytes());
          let _ = stream.flush();
        }
        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
          thread::sleep(Duration::from_millis(55));
        }
        Err(_) => break,
      }
    }
  });

  Ok(redirect_uri)
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
  if !url.starts_with("https://accounts.spotify.com/authorize?") {
    return Err("Ikigai only allows this native command to open Spotify authorization URLs.".into());
  }

  #[cfg(target_os = "windows")]
  let result = Command::new("rundll32")
    .arg("url.dll,FileProtocolHandler")
    .arg(&url)
    .spawn();

  #[cfg(target_os = "macos")]
  let result = Command::new("open").arg(&url).spawn();

  #[cfg(target_os = "linux")]
  let result = Command::new("xdg-open").arg(&url).spawn();

  #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
  {
    return result
      .map(|_| ())
      .map_err(|error| format!("Ikigai could not open Spotify in your default browser: {error}"));
  }

  #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
  {
    Err("Opening the Spotify authorization page is not implemented for this native platform yet.".into())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      start_spotify_oauth_listener,
      open_external_url
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
