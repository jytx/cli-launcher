import { useState, useEffect } from 'react'
import { useConfigStore } from '@/stores/useConfigStore'
import { useUiStore } from '@/stores/useUiStore'
import { SortableItem } from './SortableItem'
import { validateDirectory } from '@/services/tauri'
import { listen } from '@tauri-apps/api/event'
import { isTauri } from '@/utils/tauri-env'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Terminal, FolderOpen } from 'lucide-react'

export function ConfigList() {
  const { items, removeItem, updateItem, reorderItems, addItemWithPath } = useConfigStore()
  const searchQuery = useUiStore((s) => s.searchQuery).trim().toLowerCase()
  const [isDragging, setIsDragging] = useState(false)
  const [isOver, setIsOver] = useState(false)

  const filteredItems = searchQuery
    ? items.filter((i) =>
        i.title.toLowerCase().includes(searchQuery) ||
        i.dir.toLowerCase().includes(searchQuery) ||
        i.command.toLowerCase().includes(searchQuery)
      )
    : items

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // 监听文件拖拽 - 使用 Tauri v2 的正确事件名称
  useEffect(() => {
    // 检查是否在 Tauri 环境中
    if (!isTauri()) {
      console.log('非 Tauri 环境，跳过拖拽监听器设置')
      return
    }

    console.log('设置文件拖拽监听器')

    // 延迟设置监听器，确保 Tauri API 已完全加载
    const setupListeners = async () => {
      try {
        // Tauri v2 使用 tauri://drag-drop 事件
        const unlistenDrop = await listen('tauri://drag-drop', async (event) => {
          console.log('Tauri drag-drop 事件触发')

          // Tauri v2 的 payload 是一个对象，包含 paths 数组
          const payload = event.payload as { paths: string[]; position: { x: number; y: number } }
          const paths = payload.paths
          console.log('Paths 数组:', paths)

          // 重置拖拽状态
          setIsDragging(false)
          setIsOver(false)

          if (!paths || paths.length === 0) {
            console.warn('没有文件路径')
            return
          }

          // 获取第一个路径
          const path = paths[0]
          console.log('文件路径:', path, '类型:', typeof path, '长度:', path?.length)

          // 验证是否为目录
          try {
            console.log('准备调用 validateDirectory，参数:', path)
            const isDir = await validateDirectory(path)
            console.log('是否为目录:', isDir)

            if (!isDir) {
              console.warn('拖拽的不是目录:', path)
              return
            }

            // 提取目录名作为标题
            const dirName = path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path
            console.log('目录名:', dirName)

            // 添加新配置
            addItemWithPath(path, dirName)
            console.log('已添加配置:', { dir: path, title: dirName })
          } catch (error) {
            console.error('处理拖拽失败:', error)
          }
        })

        const unlistenEnter = await listen('tauri://drag-enter', async () => {
          console.log('Tauri drag-enter 事件触发')
          setIsDragging(true)
          setIsOver(true)
        })

        const unlistenLeave = await listen('tauri://drag-leave', async () => {
          console.log('Tauri drag-leave 事件触发')
          setIsDragging(false)
          setIsOver(false)
        })

        const unlistenOver = await listen('tauri://drag-over', async () => {
          console.log('Tauri drag-over 事件触发')
        })

        console.log('Tauri 事件监听器已添加')

        // 返回清理函数
        return () => {
          unlistenDrop()
          unlistenEnter()
          unlistenLeave()
          unlistenOver()
        }
      } catch (error) {
        console.error('设置事件监听器失败:', error)
        return () => {}
      }
    }

    const cleanupPromise = setupListeners()

    // 返回清理函数
    return () => {
      cleanupPromise.then(cleanup => cleanup()).catch(console.error)
    }
  }, [addItemWithPath])


  if (items.length === 0) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center text-muted-foreground/60 gap-3 transition-colors duration-200 ${
          isOver ? 'bg-primary/10' : ''
        }`}
      >
        <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
          <Terminal className="size-7 opacity-50" />
        </div>
        <div className="text-sm">暂无配置</div>
        <div className="text-xs opacity-70">
          {isDragging ? '松开鼠标添加文件夹' : '拖拽文件夹到此处，或点击上方「添加」按钮'}
        </div>
      </div>
    )
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/60 gap-3">
        <div className="text-sm">未找到匹配的配置</div>
      </div>
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderItems(active.id as string, over.id as string)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={filteredItems.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 20,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
            alignContent: 'start',
            background: 'var(--muted)',
            transition: 'background-color 0.2s',
          }}
          className={isOver ? 'bg-primary/10' : ''}
        >
          {filteredItems.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              total={filteredItems.length}
              onUpdate={updateItem}
              onRemove={removeItem}
            />
          ))}

          {/* 拖拽提示 */}
          {isDragging && (
            <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50 pointer-events-none">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <FolderOpen className="size-12" />
                <div className="text-lg font-medium">松开鼠标添加文件夹</div>
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
