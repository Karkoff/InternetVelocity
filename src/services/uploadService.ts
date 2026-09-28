import { UploadResult, SpeedTestProgress } from '../types'

const CDN_URL = 'https://speed.cloudflare.com'

export async function runUploadTest(
  onProgress: (progress: SpeedTestProgress) => void
): Promise<UploadResult> {
  onProgress({ phase: 'upload', progress: 0, message: 'Testando upload...' })

  try {
    // Quick benchmark para determinar o tier de velocidade
    const quickStart = performance.now()
    const quickData = new Uint8Array(1_000_000)
    
    await fetch(`${CDN_URL}/__up`, {
      method: 'POST',
      body: quickData,
      cache: 'no-store'
    })
    
    const quickMs = performance.now() - quickStart
    const quickMbps = (1_000_000 * 8 * 1000) / (quickMs || 1) / 1e6
    
    console.log(`[SpeedTest] Quick benchmark upload: ${quickMbps.toFixed(1)} Mbps`)
    
    // Adaptive test sizes based on quick test result
    let totalBytes = 0
    let totalTime = 0
    const numBursts = 5

    for (let i = 0; i < numBursts; i++) {
      const startTime = performance.now()
      
      // Aumenta paralelismo baseado na velocidade medida
      const parallelCount = Math.max(1, Math.min(8, Math.ceil(quickMbps / 10)))
      const burstSize = Math.max(1_000_000, Math.min(5_000_000, Math.round(quickMbps * 1_000_000)))
      const chunkSize = Math.floor(burstSize / parallelCount)
      
      console.log(`[SpeedTest] Upload Burst ${i + 1}/${numBursts}: ${parallelCount} conexões, ${(chunkSize / 1e6).toFixed(2)}MB cada`)
      
      // Run parallel uploads based on speed
      const promises: Promise<Response>[] = []
      
      for (let j = 0; j < parallelCount; j++) {
        const data = new Uint8Array(chunkSize)
        promises.push(
          fetch(`${CDN_URL}/__up`, {
            method: 'POST',
            body: data,
            cache: 'no-store'
          })
        )
      }

      const results = await Promise.allSettled(promises)
      
      let burstBytes = 0
      for (const result of results) {
        if (result.status === 'fulfilled') {
          burstBytes += chunkSize
          totalBytes += chunkSize
        }
      }
      
      const burstMs = performance.now() - startTime
      totalTime += burstMs
      
      console.log(`[SpeedTest] Upload Burst ${i + 1}: ${(burstBytes / 1e6).toFixed(2)}MB em ${burstMs.toFixed(0)}ms`)

      const progress = ((i + 1) / numBursts) * 100
      const currentSpeed = totalBytes > 0 ? ((totalBytes * 8 * 1000) / (totalTime || 1) / 1e6).toFixed(1) : '0.0'
      onProgress({ 
        phase: 'upload', 
        progress, 
        message: `Upload: ${currentSpeed} Mbps` 
      })

      // Small delay between bursts
      await new Promise(r => setTimeout(r, 200))
    }

    const speedMbps = totalBytes > 0 ? Math.round((totalBytes * 8 * 1000) / (totalTime || 1) / 1e6 * 100) / 100 : 0
    
    console.log(`[SpeedTest] Upload final: ${speedMbps} Mbps (${(totalBytes / 1e6).toFixed(2)}MB em ${totalTime.toFixed(0)}ms)`)
    
    onProgress({ 
      phase: 'upload', 
      progress: 100, 
      message: `Upload finalizado: ${speedMbps} Mbps` 
    })

    return { speedMbps, durationMs: totalTime }
  } catch (error) {
    console.error('[SpeedTest] Erro no upload:', error)
    throw error
  }
}
