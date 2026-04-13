import { invoke } from '@tauri-apps/api/core'
import type { ConfigItem } from '@/types'

/** 打开单个 cmd 窗口 */
export async function launchCmd(dir: string, command: string, title: string, terminalApp?: string): Promise<void> {
  await invoke('launch_cmd', { dir, command, title, terminalApp })
}

/** 批量打开所有 cmd 窗口 */
export async function launchAll(items: ConfigItem[], terminalApp?: string): Promise<void> {
  await invoke('launch_all', { items, terminalApp })
}

/** 将文本内容写入文件 */
export async function writeFile(path: string, content: string): Promise<void> {
  await invoke('write_file', { path, content })
}

/** 从文件读取文本内容 */
export async function readFile(path: string): Promise<string> {
  return await invoke<string>('read_file', { path })
}

/** 获取当前程序所在目录 */
export async function getExeDir(): Promise<string> {
  return await invoke<string>('get_exe_dir')
}

/** 创建目录（含父目录），返回 true=新建成功，false=已存在，异常=路径非法等 */
export async function createDir(dir: string): Promise<boolean> {
  return await invoke<boolean>('create_dir', { dir })
}

/** 用资源管理器打开文件夹 */
export async function openFolder(dir: string): Promise<void> {
  await invoke('open_folder', { dir })
}

/** 验证路径是否存在且为目录 */
export async function validateDirectory(dirPath: string): Promise<boolean> {
  console.log('validateDirectory 被调用，参数:', { dirPath, type: typeof dirPath, value: dirPath })
  try {
    const result = await invoke<boolean>('validate_directory', { dirPath })
    console.log('validateDirectory 返回:', result)
    return result
  } catch (error) {
    console.error('validateDirectory 出错:', error)
    throw error
  }
}
