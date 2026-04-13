/**
 * 检查当前是否在 Tauri 环境中运行
 * Tauri v2 使用不同的检测方式
 */
export function isTauri(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  // 检查 Tauri v2 的全局对象
  return '__TAURI_INTERNALS__' in window
}
