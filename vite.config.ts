import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

/**
 * Força saída CommonJS (.cjs) para main e preload.
 *
 * Com "type": "module" no package.json, o vite-plugin-electron define
 * lib.formats = ['es']. Como o mergeConfig do Vite CONCATENA arrays, passar
 * formats: ['cjs'] via config resulta em ['es', 'cjs'] — e o build ESM
 * sobrescreve o arquivo .cjs. Por isso sobrescrevemos diretamente no hook.
 */
function forceCjs(): Plugin {
  return {
    name: 'force-electron-cjs',
    enforce: 'post',
    config(config) {
      if (config.build?.lib) {
        config.build.lib.formats = ['cjs']
        config.build.lib.fileName = () => '[name].cjs'
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry file
        entry: 'electron/main.ts',
        onstart({ reload }) {
          // Recarrega Electron quando o main process mudar
          reload()
        },
        vite: {
          plugins: [forceCjs()],
          build: {
            outDir: 'dist-electron',
          },
        },
      },
      {
        // Preload script entry file
        entry: 'electron/preload.ts',
        onstart(options) {
          // Notifica o renderer para recarregar quando o preload mudar
          options.reload()
        },
        vite: {
          plugins: [forceCjs()],
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
})
