import { contextBridge, ipcRenderer } from 'electron'

/**
 * Preload script — expõe APIs seguras entre o Main Process e o Renderer.
 */

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
})
