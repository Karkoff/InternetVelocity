import { DownloadResult, SpeedTestProgress } from '../types'

const CDN_URL = 'https://speed.cloudflare.com'

export async function runDownloadTest(
  onProgress: (progress: SpeedTestProgress) => void
): Promise<DownloadResult> {
  onProgress({ phase: 'download', progress: 0, message: 'Testando download...' })

  // Quick benchmark para determinar o tier de velocidade
  const quickStart = performance.now()
  
  try {
    const quickResponse = await fetch(`${CDN_URL}/__down?bytes=1000000`, {
      cache: 'no-store'
    })
    const quickBuffer = await quickResponse.arrayBuffer()
    const quickMs = performance.now() - quickStart
    
    if (quickBuffer.byteLength === 0) {
      throw new Error('Download vazio')
    }
    
    const quickMbps = (quickBuffer.byteLength * 8 * 1000) / (quickMs || 1) / 1e6
    console.log(`[SpeedTest] Quick benchmark: ${quickMbps.toFixed(1)} Mbps (${quickBuffer.byteLength} bytes em ${quickMs.toFixed(0)}ms)`)
    
    // Adaptive test sizes based on quick test result
    let totalBytes = 0
    let totalTime = 0
    const numBursts = 5

    for (let i = 0; i < numBursts; i++) {
      const startTime = performance.now()
      
      // Aumenta paralelismo baseado na velocidade medida
      const parallelCount = Math.max(1, Math.min(8, Math.ceil(quickMbps / 10)))
      const burstSize = Math.max(5_000_000, Math.min(25_000_000, Math.round(quickMbps * 2_000_000)))
      const chunkSize = Math.floor(burstSize / parallelCount)
      
      console.log(`[SpeedTest] Burst ${i + 1}/${numBursts}: ${parallelCount} conexões, ${(chunkSize / 1e6).toFixed(1)}MB cada`)
      
      // Run parallel downloads based on speed
      const promises: Promise<ArrayBuffer>[] = []
      
      for (let j = 0; j < parallelCount; j++) {
        const url = `${CDN_URL}/__down?bytes=${chunkSize}`
        promises.push(
          fetch(url, { cache: 'no-store' }).then(r => r.arrayBuffer())
        )
      }

      const results = await Promise.allSettled(promises)
      
      let burstBytes = 0
      for (const result of results) {
        if (result.status === 'fulfilled') {
          burstBytes += result.value.byteLength
          totalBytes += result.value.byteLength
        }
      }
      
      const burstMs = performance.now() - startTime
      totalTime += burstMs
      
      console.log(`[SpeedTest] Burst ${i + 1}: ${(burstBytes / 1e6).toFixed(2)}MB em ${burstMs.toFixed(0)}ms`)

      const progress = ((i + 1) / numBursts) * 100
      const currentSpeed = totalBytes > 0 ? ((totalBytes * 8 * 1000) / (totalTime || 1) / 1e6).toFixed(1) : '0.0'
      onProgress({ 
        phase: 'download', 
        progress, 
        message: `Download: ${currentSpeed} Mbps` 
      })

      // Small delay between bursts
      await new Promise(r => setTimeout(r, 200))
    }

    const speedMbps = totalBytes > 0 ? Math.round((totalBytes * 8 * 1000) / (totalTime || 1) / 1e6 * 100) / 100 : 0
    
    console.log(`[SpeedTest] Download final: ${speedMbps} Mbps (${(totalBytes / 1e6).toFixed(2)}MB em ${totalTime.toFixed(0)}ms)`)
    
    onProgress({ 
      phase: 'download', 
      progress: 100, 
      message: `Download finalizado: ${speedMbps} Mbps` 
    })

    return { speedMbps, durationMs: totalTime }
  } catch (error) {
    console.error('[SpeedTest] Erro no download:', error)
    throw error
  }
}
