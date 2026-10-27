//! IMAP IDLE push watchers (RFC 2177).
//!
//! One long-lived connection per account watches a single folder (INBOX) and
//! emits an `imap-idle` event to the frontend whenever the server reports a
//! change. The frontend reacts by running a normal delta sync, so the watcher
//! never downloads mail itself. Network errors trigger reconnection with
//! exponential backoff; auth errors and servers without IDLE are reported so
//! the frontend can refresh the OAuth token or fall back to polling.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

use async_imap::extensions::idle::IdleResponse;
use async_imap::imap_proto::{MailboxDatum, Response};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use super::client::connect;
use super::types::ImapConfig;

/// Re-issue IDLE well before the 29-minute server limit; this also detects
/// silently dropped connections (e.g. after the PC wakes from sleep).
const IDLE_REFRESH: Duration = Duration::from_secs(9 * 60);
const BACKOFF_MIN: Duration = Duration::from_secs(5);
const BACKOFF_MAX: Duration = Duration::from_secs(5 * 60);

#[derive(Default)]
pub struct IdleWatchers {
    tasks: Mutex<HashMap<String, tauri::async_runtime::JoinHandle<()>>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct IdleEvent {
    account_id: String,
    folder: String,
    /// "connected" | "changed" | "reconnecting" | "auth_error" | "unsupported" | "stopped"
    kind: &'static str,
    message: Option<String>,
}

enum WatchError {
    Auth(String),
    Unsupported,
    Other(String),
}

fn emit(app: &AppHandle, account_id: &str, folder: &str, kind: &'static str, message: Option<String>) {
    let _ = app.emit(
        "imap-idle",
        IdleEvent {
            account_id: account_id.to_string(),
            folder: folder.to_string(),
            kind,
            message,
        },
    );
}

fn is_auth_error(msg: &str, oauth: bool) -> bool {
    let m = msg.to_lowercase();
    // Gmail answers a rejected XOAUTH2 token with a continuation challenge
    // instead of NO, which surfaces here as an authentication timeout.
    (oauth && m.contains("authentication timed out"))
        || m.contains("authentication failed")
        || m.contains("login failed")
        || m.contains("invalid credentials")
        || m.contains("authenticationfailed")
}

/// True for responses that mean the mailbox content or flags changed.
fn is_mailbox_change(resp: &Response<'_>) -> bool {
    matches!(
        resp,
        Response::MailboxData(MailboxDatum::Exists(_))
            | Response::MailboxData(MailboxDatum::Recent(_))
            | Response::Expunge(_)
            | Response::Vanished { .. }
            | Response::Fetch(..)
    )
}

async fn watch_once(
    app: &AppHandle,
    account_id: &str,
    config: &ImapConfig,
    folder: &str,
    backoff: &mut Duration,
) -> Result<(), WatchError> {
    let mut session = connect(config).await.map_err(|e| {
        if is_auth_error(&e, config.auth_method == "oauth2") {
            WatchError::Auth(e)
        } else {
            WatchError::Other(e)
        }
    })?;

    let caps = session
        .capabilities()
        .await
        .map_err(|e| WatchError::Other(format!("CAPABILITY failed: {e}")))?;
    if !caps.has_str("IDLE") {
        let _ = session.logout().await;
        return Err(WatchError::Unsupported);
    }

    session
        .select(folder)
        .await
        .map_err(|e| WatchError::Other(format!("SELECT {folder} failed: {e}")))?;

    *backoff = BACKOFF_MIN;
    emit(app, account_id, folder, "connected", None);
    // Catch anything that arrived while we were (re)connecting.
    emit(app, account_id, folder, "changed", None);

    loop {
        let mut idle = session.idle();
        idle.init()
            .await
            .map_err(|e| WatchError::Other(format!("IDLE failed: {e}")))?;
        let (wait, _stop) = idle.wait_with_timeout(IDLE_REFRESH);
        let resp = wait
            .await
            .map_err(|e| WatchError::Other(format!("IDLE wait failed: {e}")))?;
        session = idle
            .done()
            .await
            .map_err(|e| WatchError::Other(format!("IDLE DONE failed: {e}")))?;

        let mut changed = match &resp {
            IdleResponse::NewData(data) => is_mailbox_change(data.parsed()),
            IdleResponse::Timeout => false,
            IdleResponse::ManualInterrupt => return Ok(()),
        };
        // Drain unsolicited responses buffered by the session (bounded channel).
        while session.unsolicited_responses.try_recv().is_ok() {
            changed = true;
        }
        if changed {
            emit(app, account_id, folder, "changed", None);
        }
    }
}

async fn watch_loop(app: AppHandle, account_id: String, config: ImapConfig, folder: String) {
    let mut backoff = BACKOFF_MIN;
    loop {
        match watch_once(&app, &account_id, &config, &folder, &mut backoff).await {
            Ok(()) => {
                emit(&app, &account_id, &folder, "stopped", None);
                return;
            }
            Err(WatchError::Auth(msg)) => {
                log::warn!("[idle] {account_id}: auth error: {msg}");
                emit(&app, &account_id, &folder, "auth_error", Some(msg));
                return;
            }
            Err(WatchError::Unsupported) => {
                log::info!("[idle] {account_id}: server has no IDLE, frontend falls back to polling");
                emit(&app, &account_id, &folder, "unsupported", None);
                return;
            }
            Err(WatchError::Other(msg)) => {
                log::warn!("[idle] {account_id}: {msg} — retry in {}s", backoff.as_secs());
                emit(&app, &account_id, &folder, "reconnecting", Some(msg));
                tokio::time::sleep(backoff).await;
                backoff = (backoff * 2).min(BACKOFF_MAX);
            }
        }
    }
}

/// Start (or restart) the IDLE watcher for an account.
#[tauri::command]
pub async fn imap_idle_start(
    app: AppHandle,
    account_id: String,
    config: ImapConfig,
    folder: Option<String>,
) -> Result<(), String> {
    let folder = folder.unwrap_or_else(|| "INBOX".to_string());
    let watchers = app.state::<IdleWatchers>();
    let mut tasks = watchers.tasks.lock().map_err(|e| e.to_string())?;
    if let Some(old) = tasks.remove(&account_id) {
        old.abort();
    }
    let handle = tauri::async_runtime::spawn(watch_loop(app.clone(), account_id.clone(), config, folder));
    tasks.insert(account_id, handle);
    Ok(())
}

/// Stop the IDLE watcher for an account (no-op if none is running).
#[tauri::command]
pub async fn imap_idle_stop(app: AppHandle, account_id: String) -> Result<(), String> {
    let watchers = app.state::<IdleWatchers>();
    let mut tasks = watchers.tasks.lock().map_err(|e| e.to_string())?;
    if let Some(old) = tasks.remove(&account_id) {
        old.abort();
    }
    Ok(())
}

/// Stop every IDLE watcher (used before a full restart, e.g. after resume).
#[tauri::command]
pub async fn imap_idle_stop_all(app: AppHandle) -> Result<(), String> {
    let watchers = app.state::<IdleWatchers>();
    let mut tasks = watchers.tasks.lock().map_err(|e| e.to_string())?;
    for (_, handle) in tasks.drain() {
        handle.abort();
    }
    Ok(())
}
