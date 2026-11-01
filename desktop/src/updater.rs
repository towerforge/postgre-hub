//! Actualizaciones firmadas con tauri-plugin-updater.
//!
//! Inerte por defecto: el plugin solo se registra si la configuración fusionada
//! trae `plugins.updater.pubkey` no vacío. Esa sección vive en
//! `tauri.updater.conf.json`, que el CI añade con `--config` únicamente cuando
//! existe el secret `TAURI_SIGNING_PRIVATE_KEY`. Un `cargo tauri build` local
//! no la incluye, así que la app compilada en local nunca consulta updates.

use tauri::{AppHandle, Config, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

/// `true` si hay una clave pública configurada.
pub fn is_configured(config: &Config) -> bool {
    config
        .plugins
        .0
        .get("updater")
        .and_then(|u| u.get("pubkey"))
        .and_then(|k| k.as_str())
        .is_some_and(|k| !k.trim().is_empty())
}

/// Comprueba en segundo plano si hay versión nueva y, si el usuario acepta,
/// la instala y reinicia. Los errores de red solo se registran.
pub fn spawn_check<R: Runtime>(app: AppHandle<R>) {
    tauri::async_runtime::spawn(async move {
        let updater = match app.updater() {
            Ok(u) => u,
            Err(e) => {
                eprintln!("[desktop] updater unavailable: {e}");
                return;
            }
        };
        let update = match updater.check().await {
            Ok(Some(update)) => update,
            Ok(None) => return,
            Err(e) => {
                eprintln!("[desktop] update check failed: {e}");
                return;
            }
        };

        let message = format!(
            "Postgre Hub {} is available (you have {}).\n\nInstall it now and restart?",
            update.version, update.current_version
        );
        let handle = app.clone();
        app.dialog()
            .message(message)
            .title("Update available")
            .kind(MessageDialogKind::Info)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Install".into(),
                "Later".into(),
            ))
            .show(move |accepted| {
                if !accepted {
                    return;
                }
                tauri::async_runtime::spawn(async move {
                    match update.download_and_install(|_, _| {}, || {}).await {
                        Ok(()) => {
                            // Libera el puerto antes de relanzar para que la nueva
                            // instancia recupere el mismo origen.
                            crate::stop_server(&handle);
                            handle.restart();
                        }
                        Err(e) => {
                            handle
                                .dialog()
                                .message(format!("The update could not be installed:\n{e}"))
                                .title("Update failed")
                                .kind(MessageDialogKind::Error)
                                .show(|_| {});
                        }
                    }
                });
            });
    });
}
