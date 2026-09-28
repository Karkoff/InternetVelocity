import { app, BrowserWindow } from 'electron'
import path from 'path'

/**
 * Internet Velocity — Electron Main Process
 * 
 * Carrega a aplicação React/Vite em uma janela desktop nativa.
 * Em dev: carrega do Vite dev server (http://localhost)
 * Em prod: carrega do build estático (dist/index.html)
 */

// Determinar se estamos em modo desenvolvimento
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const IS_PROD = !process.env.VITE_DEV_SERVER_URL

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 480,
    minHeight: 500,
    center: true,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0a0e1a', // Cor do tema escuro do app
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Em dev: carrega do Vite dev server (VITE_DEV_SERVER_URL é injetado pelo vite-plugin-electron)
  // Em prod: carrega o arquivo index.html do build
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else if (IS_PROD && process.env['ELECTRON_RENDERER_URL']) {
    // Modo produção com URL customizada (para debugging remoto)
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // DevTools habilitado apenas em desenvolvimento
  if (!IS_PROD) {
    mainWindow.webContents.openDevTools()
  }

  // Abrir links externos no navegador padrão (não dentro do app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('shell').openExternal(url)
    }
    return { action: 'deny' }
  })
}

// Criar janela quando o app estiver pronto
app.whenReady().then(() => {
  createWindow()

  // macOS: recriar janela ao clicar no dock (se todas as janelas forem fechadas)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Fechar o app quando todas as janelas forem fechadas (Windows/Linux)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
