import { contextBridge } from 'electron'

/**
 * Preload script — expõe APIs seguras entre o Main Process e o Renderer.
 * 
 * Atualmente não expomos nenhuma API pois o app usa apenas fetch() nativo
 * do browser para comunicar com a Cloudflare.
 * 
 * No futuro (M2+), aqui serão expostas funções como:
 *   - saveResults(results)
 *   - loadHistory()
 *   - checkForUpdates()
 */

// Expor namespace "electronAPI" apenas se necessário no futuro
// contextBridge.exposeInMainWorld('electronAPI', {
//   // exemplo: getVersion: () => process.env.npm_package_version,
// })
