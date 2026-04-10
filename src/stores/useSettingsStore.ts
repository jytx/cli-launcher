import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TerminalApp = 'default' | 'iterm2'

interface SettingsState {
  dataDir: string | null
  terminalApp: TerminalApp
  setDataDir: (dir: string | null) => void
  setTerminalApp: (app: TerminalApp) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dataDir: null,
      terminalApp: 'default',
      setDataDir: (dir) => set({ dataDir: dir }),
      setTerminalApp: (app) => set({ terminalApp: app }),
    }),
    {
      name: 'cli-launcher-settings',
    }
  )
)
