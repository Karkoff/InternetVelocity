import { LatencyResult } from '../types'

const CDN_URL = 'https://speed.cloudflare.com'

export async function runLatencyTest(): Promise<LatencyResult> {
  const pings: number[] = []
  
  console.log('[SpeedTest] Iniciando teste de latência...')
  
  // 10 pings são suficientes para uma média confiável
  const numPings = 10
  
  for (let i = 0; i < numPings; i++) {
    try {
      const start = performance.now()
      
      // GET com parâmetro único para evitar cache
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${CDN_URL}/cdn-cgi/trace?t=${Date.now()}`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      // Consome o body para garantir RTT completo
      await response.text()
      
      const end = performance.now()
      const ping = Math.round(end - start)
      pings.push(ping)
      
      console.log(`[SpeedTest] Ping ${i + 1}/${numPings}: ${ping}ms`)
      
      // Delay mínimo entre pings
      if (i < numPings - 1) {
        await new Promise(r => setTimeout(r, 50))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[SpeedTest] Ping ${i + 1} falhou: ${message}`)
    }
  }

  console.log(`[SpeedTest] Pings coletados: ${pings.length}/${numPings}`, pings)

  if (pings.length === 0) {
    console.error('[SpeedTest] ERRO: Nenhum ping foi bem-sucedido!')
    return { avgPing: 0, minPing: 0, maxPing: 0, jitter: 0 }
  }

  // Remove outliers (primeiro e último)
  pings.sort((a, b) => a - b)
  const trimmed = pings.length > 4 ? pings.slice(1, -1) : pings
  
  console.log(`[SpeedTest] Pings ordenados:`, pings)
  console.log(`[SpeedTest] Pings após trim:`, trimmed)
  
  // Média dos pings trimados
  const avgPing = Math.round(trimmed.reduce((s, v) => s + v, 0) / trimmed.length * 10) / 10
  
  // Min e max consideram TODOS os pings
  const minPing = pings[0]
  const maxPing = pings[pings.length - 1]
  
  // Jitter = diferença média entre pings consecutivos
  let jitterSum = 0
  for (let i = 1; i < trimmed.length; i++) {
    jitterSum += Math.abs(trimmed[i] - trimmed[i - 1])
  }
  const jitter = trimmed.length > 1 
    ? Math.round(jitterSum / (trimmed.length - 1) * 10) / 10 
    : 0

  console.log(`[SpeedTest] Resultado: avg=${avgPing}ms min=${minPing}ms max=${maxPing}ms jitter=${jitter}ms`)

  return { avgPing, minPing, maxPing, jitter }
}
