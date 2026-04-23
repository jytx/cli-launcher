import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TerminalApp = 'default' | 'iterm2' | 'ghostty'

interface SettingsState {
  dataDir: string | null
  terminalApp: TerminalApp
  defaultCommand: string
  setDataDir: (dir: string | null) => void
  setTerminalApp: (app: TerminalApp) => void
  setDefaultCommand: (command: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dataDir: null,
      terminalApp: 'default',
      defaultCommand: 'claude',
      setDataDir: (dir) => set({ dataDir: dir }),
      setTerminalApp: (app) => set({ terminalApp: app }),
      setDefaultCommand: (command) => set({ defaultCommand: command }),
    }),
    {
      name: 'cli-launcher-settings',
    }
  )
)
