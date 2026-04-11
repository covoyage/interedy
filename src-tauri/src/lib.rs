mod commands;

use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::new())
        .setup(|app| {
            // macOS native menu with About item
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
                use tauri::{Manager, Emitter};

                let about_item = MenuItemBuilder::with_id("about", "About Interedy")
                    .build(app)?;

                let check_update_item = MenuItemBuilder::with_id("check_update", "Check for Updates...")
                    .build(app)?;

                let app_submenu = SubmenuBuilder::new(app, "Interedy")
                    .item(&about_item)
                    .item(&check_update_item)
                    .separator()
                    .item(&PredefinedMenuItem::hide(app, None)?)
                    .item(&PredefinedMenuItem::hide_others(app, None)?)
                    .item(&PredefinedMenuItem::show_all(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::quit(app, None)?)
                    .build()?;

                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .item(&PredefinedMenuItem::undo(app, None)?)
                    .item(&PredefinedMenuItem::redo(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::cut(app, None)?)
                    .item(&PredefinedMenuItem::copy(app, None)?)
                    .item(&PredefinedMenuItem::paste(app, None)?)
                    .item(&PredefinedMenuItem::select_all(app, None)?)
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .item(&app_submenu)
                    .item(&edit_submenu)
                    .build()?;

                app.set_menu(menu)?;

                app.on_menu_event(move |app, event| {
                    let event_id = event.id().as_ref();
                    if let Some(window) = app.get_webview_window("main") {
                        match event_id {
                            "about" => {
                                let _ = window.emit("show-about", ());
                            }
                            "check_update" => {
                                let _ = window.emit("check-for-updates", ());
                            }
                            _ => {}
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Connection
            commands::test_connection,
            commands::save_connection,
            commands::delete_connection,
            commands::list_connections,
            commands::connect,
            commands::disconnect,
            commands::switch_db,
            // Data
            commands::get_keys,
            commands::get_key_type,
            commands::get_key_detail,
            commands::set_key_value,
            commands::delete_key,
            commands::set_ttl,
            commands::get_tree_children,
            // Hash
            commands::get_hash_fields,
            commands::set_hash_field,
            commands::delete_hash_field,
            // List
            commands::get_list_range,
            commands::push_list_item,
            // Set
            commands::get_set_members,
            commands::add_set_member,
            commands::delete_set_member,
            // ZSet
            commands::get_zset_members,
            commands::add_zset_member,
            commands::delete_zset_member,
            // Command
            commands::execute_command,
            // Info
            commands::get_db_size,
            commands::get_db_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
