/**
 * Declarações globais para a API exposta pelo preload script do Electron.
 */

interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
}

interface Window {
  electronAPI: ElectronAPI | undefined
}
