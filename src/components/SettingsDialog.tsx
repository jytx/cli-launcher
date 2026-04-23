import { useState, useMemo } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { useSettingsStore, type TerminalApp } from '@/stores/useSettingsStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useConfigStore } from '@/stores/useConfigStore'
import { writeFile } from '@/services/tauri'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FolderOpen, Sun, Moon, Terminal as TerminalIcon, TerminalSquare } from 'lucide-react'

const CONFIG_FILENAME = 'clilauncher-config.json'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 检测是否为 macOS 平台
function isMacOS(): boolean {
  return navigator.userAgent.includes('Mac OS X')
}

export function SettingsDialog({ open: isOpen, onOpenChange }: SettingsDialogProps) {
  const { dataDir, setDataDir, terminalApp, setTerminalApp, defaultCommand, setDefaultCommand } = useSettingsStore()
  const { theme, toggleTheme } = useThemeStore()
  const items = useConfigStore((s) => s.items)
  const [loading, setLoading] = useState(false)

  const showTerminalSelector = useMemo(() => isMacOS(), [])

  const handleBrowse = async () => {
    const selected = await open({ directory: true, multiple: false })
    if (!selected) return

    setLoading(true)
    try {
      // 使用 Tauri 的 path API 来处理跨平台路径分隔符
      const { join } = await import('@tauri-apps/api/path')
      const filePath = await join(selected, CONFIG_FILENAME)
      await writeFile(filePath, JSON.stringify(items, null, 2))
      setDataDir(selected)
    } catch (e) {
      console.error('切换数据目录失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setDataDir(null)
  }

  const handleTerminalAppChange = (app: TerminalApp) => {
    setTerminalApp(app)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        style={{ width: 520, maxWidth: 520, padding: 0, gap: 0 }}
      >
        {/* 标题栏 */}
        <div style={{ padding: '24px 28px 16px' }}>
          <DialogTitle style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>设置</DialogTitle>
          <DialogDescription style={{ fontSize: 12, marginTop: 4 }}>
            管理应用配置和数据存储
          </DialogDescription>
        </div>

        <Separator />

        {/* 设置项 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 数据存储 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>数据存储</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Button variant="outline" size="sm" onClick={handleBrowse} disabled={loading} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', height: 28 }}>
                  <FolderOpen style={{ width: 14, height: 14 }} />
                  {dataDir ? '更改' : '选择'}
                </Button>
                {dataDir && (
                  <Button variant="ghost" size="sm" onClick={handleReset} style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '0 10px', height: 28 }}>
                    重置
                  </Button>
                )}
              </div>
            </div>
            {dataDir ? (
              <code style={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: 'var(--muted-foreground)',
                wordBreak: 'break-all',
                lineHeight: 1.5,
              }}>
                {dataDir}
              </code>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>默认存储</span>
            )}
          </div>

          <Separator />

          {/* 外观 */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>外观</span>
            <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, background: 'var(--muted)', padding: 3, gap: 2, marginLeft: 'auto' }}>
              <button
                onClick={() => { if (theme === 'dark') toggleTheme() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: theme === 'light' ? 'var(--card)' : 'transparent',
                  color: theme === 'light' ? 'var(--foreground)' : 'var(--muted-foreground)',
                  boxShadow: theme === 'light' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Sun style={{ width: 14, height: 14 }} />
                浅色
              </button>
              <button
                onClick={() => { if (theme === 'light') toggleTheme() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: theme === 'dark' ? 'var(--card)' : 'transparent',
                  color: theme === 'dark' ? 'var(--foreground)' : 'var(--muted-foreground)',
                  boxShadow: theme === 'dark' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Moon style={{ width: 14, height: 14 }} />
                深色
              </button>
            </div>
          </div>

          <Separator />

          {/* 默认命令 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TerminalSquare style={{ width: 14, height: 14, color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>默认命令</span>
            </div>
            <input
              type="text"
              value={defaultCommand}
              onChange={(e) => setDefaultCommand(e.target.value)}
              placeholder="例如: claude"
              className="h-8 !px-3 text-[12px] font-mono rounded-md border border-border bg-background outline-none focus:ring-1 focus:ring-ring/30"
            />
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
              新建配置项时的默认执行命令
            </span>
          </div>

          {/* 终端选择器 - 仅 macOS 显示 */}
          {showTerminalSelector && (
            <>
              <Separator />
              <div style={{ display: 'flex', alignItems: 'center', padding: '16px', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>终端</span>
                <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, background: 'var(--muted)', padding: 3, gap: 2, marginLeft: 'auto' }}>
                  <button
                    onClick={() => handleTerminalAppChange('default')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                      background: terminalApp === 'default' ? 'var(--card)' : 'transparent',
                      color: terminalApp === 'default' ? 'var(--foreground)' : 'var(--muted-foreground)',
                      boxShadow: terminalApp === 'default' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <TerminalIcon style={{ width: 14, height: 14 }} />
                    默认
                  </button>
                  <button
                    onClick={() => handleTerminalAppChange('iterm2')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                      background: terminalApp === 'iterm2' ? 'var(--card)' : 'transparent',
                      color: terminalApp === 'iterm2' ? 'var(--foreground)' : 'var(--muted-foreground)',
                      boxShadow: terminalApp === 'iterm2' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <TerminalIcon style={{ width: 14, height: 14 }} />
                    iTerm2
                  </button>
                  <button
                    onClick={() => handleTerminalAppChange('ghostty')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                      background: terminalApp === 'ghostty' ? 'var(--card)' : 'transparent',
                      color: terminalApp === 'ghostty' ? 'var(--foreground)' : 'var(--muted-foreground)',
                      boxShadow: terminalApp === 'ghostty' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    <TerminalIcon style={{ width: 14, height: 14 }} />
                    Ghostty
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
