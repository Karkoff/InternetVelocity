import { app, BrowserWindow, shell } from 'electron'
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
  // Em prod: carrega o arquivo index.html do build empacotado no app.asar
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else if (IS_PROD && process.env['ELECTRON_RENDERER_URL']) {
    // Modo produção com URL customizada (para debugging remoto)
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // Em produção, electron-builder empacota dist/ e dist-electron/ no mesmo app.asar
    // __dirname = app.asar/dist-electron → ../dist/index.html = app.asar/dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html')
    console.log('[Electron] Loading:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  // DevTools habilitado apenas em desenvolvimento
  if (!IS_PROD) {
    mainWindow.webContents.openDevTools()
  }

  // Abrir links externos no navegador padrão (não dentro do app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Exibir e focar a janela em primeiro plano
  mainWindow.show()
  
  // Fallback: garantir que a janela fique em primeiro plano após carregamento
  setTimeout(() => {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.setAlwaysOnTop(false)
  }, 100)

  // Em produção, garantir que a janela fique visível após carregar
  if (IS_PROD) {
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.show()
      mainWindow.focus()
    })
    
    // Se a janela não aparecer em 500ms, forçar com setAlwaysOnTop
    setTimeout(() => {
      if (!mainWindow.isVisible()) {
        mainWindow.setAlwaysOnTop(true, 'screen-saver')
        mainWindow.show()
        mainWindow.focus()
        setTimeout(() => {
          mainWindow.setAlwaysOnTop(false)
        }, 200)
      }
    }, 500)
  }
}

// Criar janela quando o app estiver pronto
app.whenReady().then(() => {
  // Focar no app antes de criar a janela (garante que Electron seja o foreground)
  app.focus()

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
