use std::{
  io::{BufRead, BufReader, Read, Write},
  net::{TcpListener, TcpStream},
  process::Command,
  thread,
  time::{Duration, Instant},
};
use tauri::Emitter;

const SPOTIFY_CALLBACK_PATH: &str = "/spotify/callback";
const SPOTIFY_OAUTH_EVENT: &str = "ikigai://spotify-oauth";
const SPOTIFY_CALLBACK_TIMEOUT: Duration = Duration::from_secs(300);
const SPOTIFY_REQUEST_LINE_LIMIT: u64 = 8 * 1024;

fn spotify_state_is_valid(state: &str) -> bool {
  (16..=128).contains(&state.len())
    && state
      .bytes()
      .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_')
}

fn query_value<'a>(query: &'a str, key: &str) -> Option<&'a str> {
  query.split('&').find_map(|part| {
    let (name, value) = part.split_once('=')?;
    (name == key).then_some(value)
  })
}

fn write_http_response(stream: &mut TcpStream, status: &str, content_type: &str, body: &str) {
  let response = format!(
    "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\nCache-Control: no-store\r\nPragma: no-cache\r\nReferrer-Policy: no-referrer\r\nX-Content-Type-Options: nosniff\r\nContent-Security-Policy: default-src 'none'; style-src 'unsafe-inline'\r\n\r\n{body}",
    body.len()
  );
  let _ = stream.write_all(response.as_bytes());
  let _ = stream.flush();
}

#[tauri::command]
fn start_spotify_oauth_listener(app: tauri::AppHandle, state: String) -> Result<String, String> {
  if !spotify_state_is_valid(&state) {
    return Err("Ikigai could not start Spotify sign-in because the authorization state was invalid.".into());
  }

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
    let deadline = Instant::now() + SPOTIFY_CALLBACK_TIMEOUT;
    while Instant::now() < deadline {
      match listener.accept() {
        Ok((mut stream, _)) => {
          let _ = stream.set_nonblocking(false);
          let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
          let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));

          let mut request_line = String::new();
          let read_result = {
            let reader = BufReader::new(&mut stream);
            let mut limited = reader.take(SPOTIFY_REQUEST_LINE_LIMIT + 1);
            limited.read_line(&mut request_line)
          };

          if read_result.is_err() || request_line.is_empty() || request_line.len() as u64 > SPOTIFY_REQUEST_LINE_LIMIT {
            write_http_response(&mut stream, "400 Bad Request", "text/plain; charset=utf-8", "Invalid request");
            continue;
          }

          let mut parts = request_line.split_whitespace();
          let method = parts.next().unwrap_or("");
          let target = parts.next().unwrap_or("");
          let version = parts.next().unwrap_or("");
          if method != "GET" || !version.starts_with("HTTP/") {
            write_http_response(&mut stream, "400 Bad Request", "text/plain; charset=utf-8", "Invalid request");
            continue;
          }

          let (path, query) = target
            .split_once('?')
            .map(|(path, query)| (path, Some(query)))
            .unwrap_or((target, None));

          if path != SPOTIFY_CALLBACK_PATH {
            write_http_response(&mut stream, "404 Not Found", "text/plain; charset=utf-8", "Not found");
            continue;
          }

          let Some(query) = query else {
            write_http_response(&mut stream, "400 Bad Request", "text/plain; charset=utf-8", "Missing authorization result");
            continue;
          };

          // The browser-side PKCE callback verifies state again before token
          // exchange. Checking it here as well prevents an unrelated local
          // process from consuming the one-shot loopback listener first.
          if query_value(query, "state") != Some(state.as_str()) {
            write_http_response(&mut stream, "403 Forbidden", "text/plain; charset=utf-8", "Authorization state did not match");
            continue;
          }

          let search = format!("?{query}");
          if app.emit(SPOTIFY_OAUTH_EVENT, search).is_err() {
            write_http_response(&mut stream, "500 Internal Server Error", "text/plain; charset=utf-8", "Ikigai could not receive the authorization result");
            break;
          }

          let body = "<!doctype html><meta charset=\"utf-8\"><title>Ikigai OS · Spotify</title><style>body{font:16px system-ui;background:#151713;color:#f4efe3;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:520px;padding:32px;text-align:center}small{color:#a9aa9f}</style><main><h1>Spotify returned to Ikigai OS.</h1><p>You can close this browser tab and return to Ikigai.</p><small>The authorization result was sent only to the local app on this device.</small></main>";
          write_http_response(&mut stream, "200 OK", "text/html; charset=utf-8", body);
          break;
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
  if url.len() > 4096
    || url.chars().any(char::is_control)
    || !url.starts_with("https://accounts.spotify.com/authorize?")
  {
    return Err("Ikigai only allows this native command to open a normal Spotify authorization URL.".into());
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


#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemMediaSnapshot {
  supported: bool,
  available: bool,
  source_id: Option<String>,
  source_label: Option<String>,
  title: Option<String>,
  artist: Option<String>,
  album_title: Option<String>,
  is_playing: bool,
  duration_ms: Option<u64>,
  progress_ms: Option<u64>,
  can_play: bool,
  can_pause: bool,
  can_next: bool,
  can_previous: bool,
}

impl SystemMediaSnapshot {
  fn unsupported() -> Self {
    Self {
      supported: false,
      available: false,
      source_id: None,
      source_label: None,
      title: None,
      artist: None,
      album_title: None,
      is_playing: false,
      duration_ms: None,
      progress_ms: None,
      can_play: false,
      can_pause: false,
      can_next: false,
      can_previous: false,
    }
  }

  fn quiet() -> Self {
    Self { supported: true, ..Self::unsupported() }
  }
}

fn bounded_system_media_text(value: String, max_chars: usize) -> Option<String> {
  let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
  if compact.is_empty() {
    return None;
  }
  let bounded: String = compact.chars().take(max_chars).collect();
  (!bounded.is_empty()).then_some(bounded)
}

fn valid_system_media_source_id(value: &str) -> bool {
  let trimmed = value.trim();
  !trimmed.is_empty()
    && trimmed.chars().count() <= 260
    && !trimmed.chars().any(char::is_control)
}

#[cfg(target_os = "windows")]
fn timespan_ms(duration_100ns: i64) -> Option<u64> {
  if duration_100ns < 0 {
    return None;
  }
  u64::try_from(duration_100ns / 10_000).ok()
}

#[cfg(target_os = "windows")]
async fn current_system_media_session() -> Result<Option<windows::Media::Control::GlobalSystemMediaTransportControlsSession>, String> {
  use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;

  let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
    .map_err(|error| format!("Windows System Media is unavailable: {error}"))?
    .await
    .map_err(|error| format!("Windows did not grant System Media access: {error}"))?;

  match manager.GetCurrentSession() {
    Ok(session) => Ok(Some(session)),
    Err(_) => Ok(None),
  }
}

#[cfg(target_os = "windows")]
async fn read_system_media_windows() -> Result<SystemMediaSnapshot, String> {
  use windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus;

  let Some(session) = current_system_media_session().await? else {
    return Ok(SystemMediaSnapshot::quiet());
  };

  let raw_source_id = session
    .SourceAppUserModelId()
    .map(|value| value.to_string_lossy())
    .unwrap_or_default();
  let source_id = if valid_system_media_source_id(&raw_source_id) {
    Some(raw_source_id.trim().chars().take(260).collect::<String>())
  } else {
    None
  };
  let source_label = bounded_system_media_text(raw_source_id, 120);

  let (title, artist, album_title) = match session.TryGetMediaPropertiesAsync() {
    Ok(operation) => match operation.await {
      Ok(properties) => (
        properties.Title().ok().and_then(|value| bounded_system_media_text(value.to_string_lossy(), 220)),
        properties.Artist().ok().and_then(|value| bounded_system_media_text(value.to_string_lossy(), 140)),
        properties.AlbumTitle().ok().and_then(|value| bounded_system_media_text(value.to_string_lossy(), 180)),
      ),
      Err(_) => (None, None, None),
    },
    Err(_) => (None, None, None),
  };

  let mut is_playing = false;
  let mut can_play = false;
  let mut can_pause = false;
  let mut can_next = false;
  let mut can_previous = false;
  if let Ok(info) = session.GetPlaybackInfo() {
    is_playing = info.PlaybackStatus().ok() == Some(GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing);
    if let Ok(controls) = info.Controls() {
      can_play = controls.IsPlayEnabled().unwrap_or(false);
      can_pause = controls.IsPauseEnabled().unwrap_or(false);
      can_next = controls.IsNextEnabled().unwrap_or(false);
      can_previous = controls.IsPreviousEnabled().unwrap_or(false);
    }
  }

  let (duration_ms, progress_ms) = match session.GetTimelineProperties() {
    Ok(timeline) => {
      let start = timeline.StartTime().ok().and_then(|value| timespan_ms(value.Duration));
      let end = timeline.EndTime().ok().and_then(|value| timespan_ms(value.Duration));
      let position = timeline.Position().ok().and_then(|value| timespan_ms(value.Duration));
      let duration = match (start, end) {
        (Some(start), Some(end)) if end >= start => Some(end - start),
        _ => end,
      };
      let progress = match (start, position) {
        (Some(start), Some(position)) if position >= start => Some(position - start),
        _ => position,
      };
      (duration, progress)
    }
    Err(_) => (None, None),
  };

  Ok(SystemMediaSnapshot {
    supported: true,
    available: true,
    source_id,
    source_label,
    title,
    artist,
    album_title,
    is_playing,
    duration_ms,
    progress_ms,
    can_play,
    can_pause,
    can_next,
    can_previous,
  })
}

#[tauri::command]
async fn read_system_media() -> Result<SystemMediaSnapshot, String> {
  #[cfg(target_os = "windows")]
  {
    return read_system_media_windows().await;
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(SystemMediaSnapshot::unsupported())
  }
}

#[cfg(target_os = "windows")]
async fn control_system_media_windows(action: &str, expected_source_id: &str) -> Result<bool, String> {
  let Some(session) = current_system_media_session().await? else {
    return Err("There is no active Windows System Media session to control.".into());
  };

  let actual_source_id = session
    .SourceAppUserModelId()
    .map_err(|_| "Windows did not expose the current media source identity.".to_string())?
    .to_string_lossy()
    .trim()
    .to_string();

  if actual_source_id != expected_source_id {
    return Err("The active media source changed before the control was sent. Refresh Now Playing and try again.".into());
  }

  let controls = session
    .GetPlaybackInfo()
    .and_then(|info| info.Controls())
    .map_err(|_| "Windows did not expose playback controls for the active session.".to_string())?;

  let allowed = match action {
    "play" => controls.IsPlayEnabled().unwrap_or(false),
    "pause" => controls.IsPauseEnabled().unwrap_or(false),
    "next" => controls.IsNextEnabled().unwrap_or(false),
    "previous" => controls.IsPreviousEnabled().unwrap_or(false),
    _ => return Err("Unsupported System Media control action.".into()),
  };
  if !allowed {
    return Err("The active media app does not currently allow that playback control.".into());
  }

  let accepted = match action {
    "play" => session.TryPlayAsync(),
    "pause" => session.TryPauseAsync(),
    "next" => session.TrySkipNextAsync(),
    "previous" => session.TrySkipPreviousAsync(),
    _ => unreachable!(),
  }
  .map_err(|error| format!("Windows could not start the playback control: {error}"))?
  .await
  .map_err(|error| format!("Windows could not complete the playback control: {error}"))?;

  Ok(accepted)
}

#[tauri::command]
async fn control_system_media(action: String, expected_source_id: String) -> Result<bool, String> {
  if !matches!(action.as_str(), "play" | "pause" | "next" | "previous") {
    return Err("Unsupported System Media control action.".into());
  }
  if !valid_system_media_source_id(&expected_source_id) {
    return Err("The expected Windows media source identity was invalid.".into());
  }

  #[cfg(target_os = "windows")]
  {
    return control_system_media_windows(&action, &expected_source_id).await;
  }

  #[cfg(not(target_os = "windows"))]
  {
    let _ = (action, expected_source_id);
    Err("Windows System Media controls are available only in the Windows native build.".into())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      start_spotify_oauth_listener,
      open_external_url,
      read_system_media,
      control_system_media
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
