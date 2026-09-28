import { app, BrowserWindow, shell } from 'electron'
import path from 'path'

/**
 * Internet Velocity — Electron Main Process
 * 
 * Carrega a aplicação React/Vite em uma janela desktop nativa.
 * Em dev: carrega do Vite dev server (http://localhost)
 * Em prod: carrega do build estático (dist/index.html)
 */

// ===== LOGS DE DIAGNÓSTICO =====
console.log('[Electron] ========================================')
console.log('[Electron] App starting...')
console.log('[Electron] process.platform:', process.platform)
console.log('[Electron] process.env.VITE_DEV_SERVER_URL:', process.env['VITE_DEV_SERVER_URL'])
console.log('[Electron] process.env.ELECTRON_RENDERER_URL:', process.env['ELECTRON_RENDERER_URL'])
console.log('[Electron] __dirname:', __dirname)
console.log('[Electron] app.getPath("userData"):', app.getPath('userData'))
console.log('[Electron] ========================================')

// Determinar se estamos em modo desenvolvimento
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
const IS_PROD = !process.env.VITE_DEV_SERVER_URL

function createWindow(): void {
  console.log('[Electron] === createWindow() called ===')
  console.log('[Electron] VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL)
  console.log('[Electron] IS_PROD:', IS_PROD)

  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 480,
    minHeight: 500,
    center: true,
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0a0e1a',
    show: false, // Não mostrar até estar pronto (evita flash branco)
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  console.log('[Electron] BrowserWindow instance created')

  // ===== Event listeners para diagnóstico =====
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] Page finished loading!')
    console.log('[Electron] mainWindow.isVisible():', mainWindow.isVisible())
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] FAILED to load page:')
    console.error('[Electron]   errorCode:', errorCode)
    console.error('[Electron]   errorDescription:', errorDescription)
  })

  mainWindow.webContents.on('did-navigate', (event, url) => {
    console.log('[Electron] Navigated to:', url)
  })

  mainWindow.webContents.on('dom-ready', () => {
    console.log('[Electron] DOM ready!')
  })

  // Em dev: carrega do Vite dev server (VITE_DEV_SERVER_URL é injetado pelo vite-plugin-electron)
  // Em prod: carrega o arquivo index.html do build empacotado no app.asar
  if (VITE_DEV_SERVER_URL) {
    console.log('[Electron] Loading from dev server:', VITE_DEV_SERVER_URL)
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else if (IS_PROD && process.env['ELECTRON_RENDERER_URL']) {
    // Modo produção com URL customizada (para debugging remoto)
    console.log('[Electron] Loading from ELECTRON_RENDERER_URL:', process.env['ELECTRON_RENDERER_URL'])
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    // Em produção, electron-builder empacota dist/ e dist-electron/ no mesmo app.asar
    // __dirname = app.asar/dist-electron → ../dist/index.html = app.asar/dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html')
    console.log('[Electron] Loading from file:', indexPath)
    
    // Verificar se o arquivo existe (apenas em prod, para diagnóstico)
    import('fs').then(fs => {
      try {
        const exists = fs.existsSync(indexPath)
        console.log('[Electron] index.html exists:', exists)
        if (!exists) {
          console.error('[Electron] ERROR: index.html NOT FOUND at:', indexPath)
          // Tentar listar o que existe em __dirname
          const dirContents = fs.readdirSync(path.join(__dirname))
          console.log('[Electron] Contents of __dirname:', dirContents)
        }
      } catch (e) {
        console.error('[Electron] Could not check file existence:', e)
      }
    })
    
    mainWindow.loadFile(indexPath)
  }

  // DevTools — descomentar se precisar debugar manualmente
  // if (!IS_PROD) {
  //   console.log('[Electron] Opening DevTools...')
  //   mainWindow.webContents.openDevTools()
  // }

  // Abrir links externos no navegador padrão (não dentro do app)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Mostrar a janela apenas quando estiver pronta (evita flash branco)
  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] Window ready to show!')
    mainWindow.show()
    mainWindow.focus()
    console.log('[Electron] Window shown and focused!')
  })

  // Fallback: garantir que a janela fique visível após um timeout
  setTimeout(() => {
    if (!mainWindow.isVisible()) {
      console.warn('[Electron] Window not visible after 1s, forcing show...')
      mainWindow.show()
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(true, 'screen-saver')
      setTimeout(() => {
        mainWindow.setAlwaysOnTop(false)
      }, 300)
    } else {
      console.log('[Electron] Window is visible (fallback not needed)')
    }
  }, 1000)

  // Capturar erros de renderização
  mainWindow.on('error', (err) => {
    console.error('[Electron] BrowserWindow error:', err)
  })
}

// Criar janela quando o app estiver pronto
app.whenReady().then(() => {
  console.log('[Electron] app.whenReady() resolved!')
  
  // Focar no app antes de criar a janela (garante que Electron seja o foreground)
  app.focus()
  console.log('[Electron] app.focus() called')

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
  console.log('[Electron] window-all-closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Capturar erros não tratados
process.on('uncaughtException', (err) => {
  console.error('[Electron] UNCAUGHT EXCEPTION:', err)
})

