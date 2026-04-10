//! Tauri 命令处理 - 打开终端窗口（跨平台支持）

use serde::{Deserialize, Serialize};
use std::fs;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

use std::process::Command;

/// 配置项：窗口标题 + 文件夹路径 + 执行指令
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigItem {
    pub title: String,
    pub dir: String,
    pub command: String,
}

/// Windows: 隐藏本进程的控制台窗口（wt 是 GUI 应用，此标志防止出现多余窗口）
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

// ============ Windows 平台实现 ============

/// Windows: 构建 wt 命令行参数字符串
/// 使用 raw_arg 直接传递，避免 Rust Command::args() 的 Windows 参数转义问题
#[cfg(target_os = "windows")]
fn build_wt_args(title: &str, dir: &str, command: &str) -> String {
    let mut s = String::from("new-tab");

    // 设置选项卡标题
    if !title.is_empty() {
        s.push_str(&format!(" --title \"{}\"", title));
        // 关键：阻止 shell/应用覆盖选项卡标题
        // 否则 cmd.exe 或 claude 等程序启动后会立即覆盖 --title 的值
        s.push_str(" --suppressApplicationTitle");
    }

    // 工作目录
    s.push_str(&format!(" -d \"{}\"", dir));

    // 要执行的命令
    s.push_str(&format!(" cmd /k \"{}\"", command));

    s
}

/// Windows: 使用 wt.exe 打开终端窗口
#[cfg(target_os = "windows")]
fn launch_terminal_window(dir: &str, command: &str, title: &str, _terminal_app: &str) -> Result<(), String> {
    let args = build_wt_args(title, dir, command);

    Command::new("wt")
        .raw_arg(&args)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("启动终端失败: {}", e))?;
    Ok(())
}

// ============ macOS 平台实现 ============

/// macOS: 使用 osascript 打开终端窗口，支持 Terminal.app 和 iTerm2
#[cfg(target_os = "macos")]
fn launch_terminal_window(dir: &str, command: &str, title: &str, terminal_app: &str) -> Result<(), String> {
    // 转义特殊字符
    let escape = |s: &str| {
        s.replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\n', "\\n")
            .replace('\r', "\\r")
            .replace('\t', "\\t")
    };

    let escaped_dir = escape(dir);
    let escaped_command = escape(command);
    let escaped_title = escape(title);

    let script = if terminal_app == "iterm2" {
        // iTerm2 AppleScript
        format!(
            r#"
            tell application "iTerm"
                activate
                create window with default profile
                tell current session of current window
                    write text "cd \"{dir}\" && {command}"
                end tell
            end tell
            "#,
            dir = escaped_dir,
            command = escaped_command
        )
    } else {
        // 默认 Terminal.app AppleScript
        format!(
            r#"
            tell application "Terminal"
                activate
                set newTab to do script "cd \"{dir}\" && {command}" in front window
                if "{title}" is not "" then
                    set custom title of newTab to "{title}"
                end if
            end tell
            "#,
            dir = escaped_dir,
            command = escaped_command,
            title = escaped_title
        )
    };

    Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .spawn()
        .map_err(|e| format!("启动终端失败: {}", e))?;
    Ok(())
}

// ============ Linux 平台实现 ============

/// Linux: 尝试使用常见终端打开窗口
#[cfg(target_os = "linux")]
fn launch_terminal_window(dir: &str, command: &str, title: &str, _terminal_app: &str) -> Result<(), String> {
    // 尝试使用常见终端（gnome-terminal、xterm 等）
    let terminals = ["gnome-terminal", "xterm", "konsole", "xfce4-terminal"];

    let mut last_error = String::from("未找到可用的终端");

    for terminal in terminals {
        let result = if terminal == "gnome-terminal" {
            // gnome-terminal 使用 --title 和 --working-directory
            Command::new(terminal)
                .args([
                    "--title",
                    if title.is_empty() { "Terminal" } else { title },
                    "--working-directory",
                    dir,
                    "--",
                    "sh",
                    "-c",
                    &format!("cd {} && {}", dir, command),
                ])
                .spawn()
                .map_err(|e| format!("启动 {} 失败: {}", terminal, e))
        } else if terminal == "xterm" {
            // xterm 使用 -T 和 -e
            Command::new(terminal)
                .args([
                    "-T",
                    if title.is_empty() { "Terminal" } else { title },
                    "-e",
                    "sh",
                    "-c",
                    &format!("cd {} && {}", dir, command),
                ])
                .spawn()
                .map_err(|e| format!("启动 {} 失败: {}", terminal, e))
        } else {
            // 其他终端使用通用方式
            Command::new(terminal)
                .args(["-e", &format!("cd {} && {}", dir, command)])
                .spawn()
                .map_err(|e| format!("启动 {} 失败: {}", terminal, e))
        };

        if result.is_ok() {
            return Ok(());
        }
        last_error = result.unwrap_err();
    }

    Err(last_error)
}

// ============ 公共 Tauri 命令接口 ============

/// 打开单个终端窗口，切换到指定目录并执行指令
#[tauri::command]
pub fn launch_cmd(dir: String, command: String, title: String, terminal_app: Option<String>) -> Result<(), String> {
    let app = terminal_app.as_deref().unwrap_or("default");
    launch_terminal_window(&dir, &command, &title, app)
}

/// 批量打开多个终端窗口
#[tauri::command]
pub fn launch_all(items: Vec<ConfigItem>, terminal_app: Option<String>) -> Result<(), String> {
    let app = terminal_app.as_deref().unwrap_or("default");
    for item in items {
        launch_terminal_window(&item.dir, &item.command, &item.title, app)?;
    }
    Ok(())
}

/// 将文本内容写入指定路径的文件（自动创建父目录）
#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("写入文件失败: {}", e))
}

/// 从指定路径读取文本文件内容
#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))
}

/// 创建指定目录（含父目录），已存在时返回 false
#[tauri::command]
pub fn create_dir(dir: String) -> Result<bool, String> {
    let path = std::path::Path::new(&dir);
    if dir.trim().is_empty() {
        return Err("路径不能为空".into());
    }
    if path.exists() {
        return Ok(false);
    }
    fs::create_dir_all(path).map_err(|e| format!("创建目录失败: {}", e))?;
    Ok(true)
}

/// 用文件管理器打开指定文件夹
#[tauri::command]
pub fn open_folder(dir: String) -> Result<(), String> {
    if dir.trim().is_empty() {
        return Err("路径不能为空".into());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .raw_arg(&dir)
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&dir)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| format!("打开文件夹失败: {}", e))?;
        Ok(())
    }
}

/// 获取当前程序所在目录的路径
#[tauri::command]
pub fn get_exe_dir() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| format!("获取程序路径失败: {}", e))?;
    let dir = exe
        .parent()
        .ok_or("无法获取程序目录")?;
    Ok(dir.to_string_lossy().to_string())
}
