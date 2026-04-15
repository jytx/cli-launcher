import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import type { ConfigItem as ConfigItemType } from '@/types'
import { launchCmd, createDir, openFolder } from '@/services/tauri'
import { useSettingsStore } from '@/stores/useSettingsStore'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Play, FolderOpen, Trash2, GripVertical, Loader2, Check, FolderPlus, ExternalLink } from 'lucide-react'

const GRADIENTS = [
  'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-400',
  'from-orange-500 to-amber-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-pink-400',
  'from-indigo-500 to-blue-400',
  'from-fuchsia-500 to-pink-400',
  'from-teal-500 to-emerald-400',
]

interface Props {
  item: ConfigItemType
  index: number
  total: number
  onUpdate: (id: string, field: 'title' | 'dir' | 'command', value: string) => void
  onRemove: (id: string) => void
  dragHandleProps?: Record<string, unknown>
}

export function ConfigItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  dragHandleProps,
}: Props) {
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(false)
  const [dirExists, setDirExists] = useState(false)
  const [_, setLaunchError] = useState<string | null>(null)
  const { terminalApp } = useSettingsStore()
  const gradient = GRADIENTS[index % GRADIENTS.length]

  const handleBrowse = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: item.dir.trim() || undefined,
      })
      if (selected && typeof selected === 'string') {
        onUpdate(item.id, 'dir', selected)
        updateTitleFromDir(selected)
      }
    } catch {
      // 用户取消选择
    }
  }

  const updateTitleFromDir = (dirPath: string) => {
    // 如果标题为空或为默认值"未命名配置"，则使用目录名作为标题
    const currentTitle = item.title?.trim()
    if (!currentTitle || currentTitle === '未命名配置') {
      // 提取目录名：支持 Unix (/) 和 Windows (\) 路径
      const dirName = dirPath.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || dirPath
      onUpdate(item.id, 'title', dirName)
    }
  }

  const handleDirBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    if (value) {
      updateTitleFromDir(value)
    }
  }

  const handleDirKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value.trim()
      if (value) {
        updateTitleFromDir(value)
      }
    }
  }

  const handleLaunch = async () => {
    if (!item.dir.trim()) return
    setLaunching(true)
    setLaunchError(null)
    try {
      console.log('正在启动终端:', { dir: item.dir, command: item.command, title: item.title, terminalApp })
      await launchCmd(item.dir, item.command || 'claude', item.title, terminalApp)
      setLaunched(true)
      setTimeout(() => setLaunched(false), 1500)
    } catch (e) {
      console.error('启动失败:', e)
      setLaunchError(e instanceof Error ? e.message : `${e}`)
      // 显示错误信息 3 秒
      setTimeout(() => setLaunchError(null), 3000)
    } finally {
      setLaunching(false)
    }
  }

  const handleDelete = () => {
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    onRemove(item.id)
    setDeleteOpen(false)
  }

  const handleCreateDir = async () => {
    if (!item.dir.trim()) return
    setCreating(true)
    try {
      const ok = await createDir(item.dir)
      if (ok) {
        setCreated(true)
        setDirExists(false)
        setTimeout(() => setCreated(false), 1500)
      } else {
        setDirExists(true)
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : `${e}`)
    } finally {
      setCreating(false)
    }
  }

  const handleOpenFolder = async () => {
    if (!item.dir.trim()) return
    try {
      await openFolder(item.dir)
    } catch (e) {
      console.error('打开文件夹失败:', e)
    }
  }

  return (
    <div className="group relative rounded-xl border border-border/50 bg-card text-card-foreground transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/20 overflow-hidden">
      {/* 渐变顶部条 */}
      <div className={`h-[3px] bg-gradient-to-r ${gradient}`} />

      {/* 顶部：拖拽 + 标题 + 操作 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px 14px' }}>
        <Tooltip>
          <TooltipTrigger render={
            <div
              {...dragHandleProps}
              className="flex items-center justify-center w-5 cursor-grab active:cursor-grabbing text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors shrink-0 select-none"
            >
              <GripVertical className="size-4" />
            </div>
          } />
          <TooltipContent side="right">拖拽排序</TooltipContent>
        </Tooltip>

        <Input
          value={item.title}
          onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
          placeholder="未命名配置"
          className="flex-1 h-9 border-transparent bg-transparent font-semibold text-sm shadow-none !px-2.5 placeholder:text-muted-foreground/35 placeholder:font-normal"
        />

        {/* 启动按钮 */}
        <Button
          size="icon-sm"
          disabled={!item.dir.trim() || launching}
          onClick={handleLaunch}
          className={`shrink-0 h-9 min-w-9 transition-all duration-300 ${
            launched
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/25 text-white'
          }`}
        >
          {launching ? (
            <Loader2 className="size-4" />
          ) : launched ? (
            <Check className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>

        {/* 删除按钮 */}
        <Button
          size="icon-sm"
          onClick={handleDelete}
          className="shrink-0 h-9 min-w-9 border-0 bg-muted text-muted-foreground hover:bg-destructive hover:text-white transition-colors"
        >
          <Trash2 className="size-4" />
        </Button>

        {/* 删除确认弹框 */}
        {deleteOpen && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent showCloseButton={false} style={{ maxWidth: 360, padding: 0, gap: 0 }}>
              <div style={{ padding: '24px 28px 20px' }}>
                <DialogTitle style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>确认删除</DialogTitle>
                <DialogDescription style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  确定要删除「{item.title || '未命名配置'}」吗？此操作不可撤销。
                </DialogDescription>
              </div>
              <div className="flex justify-end gap-2" style={{ padding: '12px 28px 20px' }}>
                <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(false)} style={{ padding: '6px 12px', height: '32px' }}>
                  取消
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={confirmDelete}
                  style={{ padding: '6px 12px', height: '32px' }}
                >
                  删除
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* 字段区域 */}
      <div style={{ padding: '10px 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 工作目录 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="text-[11px] font-medium text-muted-foreground/70 tracking-wide select-none uppercase">
            工作目录
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input
              value={item.dir}
              onChange={(e) => onUpdate(item.id, 'dir', e.target.value)}
              onBlur={handleDirBlur}
              onKeyDown={handleDirKeyDown}
              placeholder="文件夹路径"
              className="flex-1 min-w-0 h-10 !px-3 text-[13px]"
            />
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="outline" onClick={handleBrowse} className="shrink-0" style={{ width: '40px', height: '40px', padding: '8px' }}>
                  <FolderOpen className="size-4" />
                </Button>
              } />
              <TooltipContent side="bottom">浏览</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={
                <Button
                  variant="outline"
                  disabled={!item.dir.trim()}
                  onClick={handleOpenFolder}
                  className="shrink-0"
                  style={{ width: '40px', height: '40px', padding: '8px' }}
                >
                  <ExternalLink className="size-4" />
                </Button>
              } />
              <TooltipContent side="bottom">打开</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={
                <Button
                  variant="outline"
                  disabled={!item.dir.trim() || creating}
                  onClick={handleCreateDir}
                  className={`shrink-0 transition-all duration-300 ${
                    created
                      ? 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
                      : ''
                  }`}
                  style={{ width: '40px', height: '40px', padding: '8px' }}
                >
                  {creating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : created ? (
                    <Check className="size-4" />
                  ) : (
                    <FolderPlus className="size-4" />
                  )}
                </Button>
              } />
              <TooltipContent side="bottom">
                {created ? '已新建' : dirExists ? '已存在' : '新建'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* 执行指令 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="text-[11px] font-medium text-muted-foreground/70 tracking-wide select-none uppercase">
            执行指令
          </label>
          <Input
            value={item.command}
            onChange={(e) => onUpdate(item.id, 'command', e.target.value)}
            placeholder="例如: claude"
            className="h-10 !px-3 text-[13px] font-mono"
          />
        </div>
      </div>
    </div>
  )
}
