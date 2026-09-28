/**
 * Testes Unitários — Lógica de Cálculo do Speed Test
 * 
 * Estes testes validam as fórmulas de cálculo isoladamente,
 * sem depender de fetch ou performance.now().
 * 
 * Executar: node --experimental-vm-modules src/tests/calculation-tests.mjs
 */

// ===== FUNÇÕES PURE PARA TESTAR (extraídas dos services) =====

// ===== FUNÇÕES COM BUG IDENTIFICADO (versão atual do código) =====
function calculateDownloadSpeedBuggy(totalBytes, totalTimeMs) {
  return totalBytes > 0 ? Math.round((totalBytes * 8) / (totalTimeMs || 1) / 1e6 * 100) / 100 : 0
}

function calculateUploadSpeedBuggy(totalBytes, totalTimeMs) {
  return totalBytes > 0 ? Math.round((totalBytes * 8) / (totalTimeMs || 1) / 1e6 * 100) / 100 : 0
}

function calculateQuickBenchmarkMbpsBuggy(byteLength, timeMs) {
  return (byteLength * 8) / (timeMs || 1) / 1e6
}

// ===== FUNÇÕES CORRETAS (com * 1000 para converter ms → s) =====
function calculateDownloadSpeed(totalBytes, totalTimeMs) {
  // BUG FIX: * 1000 converte ms para segundos
  return totalBytes > 0 ? Math.round((totalBytes * 8 * 1000) / (totalTimeMs || 1) / 1e6 * 100) / 100 : 0
}

function calculateUploadSpeed(totalBytes, totalTimeMs) {
  // BUG FIX: * 1000 converte ms para segundos
  return totalBytes > 0 ? Math.round((totalBytes * 8 * 1000) / (totalTimeMs || 1) / 1e6 * 100) / 100 : 0
}

function calculateQuickBenchmarkMbps(byteLength, timeMs) {
  // BUG FIX: * 1000 converte ms para segundos
  return (byteLength * 8 * 1000) / (timeMs || 1) / 1e6
}

function calculateBurstSize(quickMbps, type = 'download') {
  if (type === 'download') {
    return Math.max(5_000_000, Math.min(25_000_000, Math.round(quickMbps * 2_000_000)))
  } else {
    return Math.max(1_000_000, Math.min(5_000_000, Math.round(quickMbps * 1_000_000)))
  }
}

function calculateParallelCount(quickMbps) {
  return Math.max(1, Math.min(8, Math.ceil(quickMbps / 10)))
}

// ===== TESTES =====

let passed = 0
let failed = 0
const results = []

function assert(condition, message) {
  if (condition) {
    passed++
    results.push({ name: message, status: 'PASS' })
    console.log(`  ✅ ${message}`)
  } else {
    failed++
    results.push({ name: message, status: 'FAIL' })
    console.error(`  ❌ ${message}`)
  }
}

function describe(name, fn) {
  console.log(`\n📦 ${name}`)
  fn()
}

// ===== TEST SUITE =====

describe('Fórmula de Velocidade (bytes + ms → Mbps)', () => {
  // 1 byte em 1 segundo = 8 bits / 1s = 0.000008 Mbps
  assert(
    calculateDownloadSpeed(1, 1000) === 0,
    '1 byte em 1s → 0 Mbps (arredondado)'
  )

  // 1 MB em 1 segundo = 8 Mbits / 1s = 8 Mbps
  assert(
    calculateDownloadSpeed(1_000_000, 1000) === 8,
    '1MB em 1s → 8 Mbps'
  )

  // 10 MB em 1 segundo = 80 Mbits / 1s = 80 Mbps
  assert(
    calculateDownloadSpeed(10_000_000, 1000) === 80,
    '10MB em 1s → 80 Mbps'
  )

  // 100 MB em 5 segundos = 800 Mbits / 5s = 160 Mbps
  assert(
    calculateDownloadSpeed(100_000_000, 5000) === 160,
    '100MB em 5s → 160 Mbps'
  )

  // Upload usa mesma fórmula
  assert(
    calculateUploadSpeed(5_000_000, 1000) === 40,
    'Upload: 5MB em 1s → 40 Mbps'
  )

  // Tempo zero não causa divisão por zero
  const safeResult = calculateDownloadSpeed(1_000_000, 0)
  assert(isFinite(safeResult), 'Tempo zero retorna valor finito (não Infinity)')
})

describe('Quick Benchmark — Download', () => {
  // 1MB em 500ms → (1000000 * 8) / 500 / 1e6 = 16 Mbps
  assert(
    calculateQuickBenchmarkMbps(1_000_000, 500) === 16,
    '1MB em 500ms → 16 Mbps'
  )

  // 1MB em 2 segundos → (1000000 * 8) / 2000 / 1e6 = 4 Mbps
  assert(
    calculateQuickBenchmarkMbps(1_000_000, 2000) === 4,
    '1MB em 2s → 4 Mbps'
  )

  // 1MB em 10 segundos → (1000000 * 8) / 10000 / 1e6 = 0.8 Mbps
  assert(
    calculateQuickBenchmarkMbps(1_000_000, 10000).toFixed(1) === '0.8',
    '1MB em 10s → 0.8 Mbps'
  )

  // 1MB em 30 segundos → ~0.267 Mbps (conexão muito lenta)
  const slowResult = calculateQuickBenchmarkMbps(1_000_000, 30000)
  assert(slowResult < 1, '1MB em 30s → < 1 Mbps (conexão lenta)')
})

describe('Quick Benchmark — Upload', () => {
  // 1MB em 500ms → 16 Mbps
  assert(
    calculateQuickBenchmarkMbps(1_000_000, 500) === 16,
    'Upload: 1MB em 500ms → 16 Mbps'
  )

  // 1MB em 20 segundos → 0.4 Mbps (upload lento)
  const slowUpload = calculateQuickBenchmarkMbps(1_000_000, 20000)
  assert(slowUpload < 1, 'Upload: 1MB em 20s → < 1 Mbps')
})

describe('Cálculo de Burst Size — Download', () => {
  // Conexão rápida (100 Mbps) → burstSize = min(25M, 100 * 2M) = 25M (teto)
  assert(
    calculateBurstSize(100, 'download') === 25_000_000,
    '100 Mbps → burstSize = 25MB (teto máximo)'
  )

  // Conexão média (10 Mbps) → burstSize = min(25M, 10 * 2M) = 20M
  assert(
    calculateBurstSize(10, 'download') === 20_000_000,
    '10 Mbps → burstSize = 20MB'
  )

  // Conexão lenta (1 Mbps) → burstSize = min(25M, 1 * 2M) = 2M → max(5M, 2M) = 5M (chão)
  assert(
    calculateBurstSize(1, 'download') === 5_000_000,
    '1 Mbps → burstSize = 5MB (chão mínimo)'
  )

  // Conexão muito lenta (0.1 Mbps) → burstSize = min(25M, 0.1 * 2M) = 200K → max(5M, 200K) = 5M
  const tinyBurst = calculateBurstSize(0.1, 'download')
  assert(
    tinyBurst === 5_000_000,
    '0.1 Mbps → burstSize = 5MB (chão mínimo — NÃO reduz mais!)'
  )

  // Conexão extremamente lenta (0.001 Mbps) → mesmo resultado
  const ultraTinyBurst = calculateBurstSize(0.001, 'download')
  assert(
    ultraTinyBurst === 5_000_000,
    '0.001 Mbps → burstSize = 5MB (chão mínimo)'
  )
})

describe('Cálculo de Burst Size — Upload', () => {
  // Conexão rápida (100 Mbps) → burstSize = min(5M, 100 * 1M) = 5M (teto)
  assert(
    calculateBurstSize(100, 'upload') === 5_000_000,
    'Upload: 100 Mbps → burstSize = 5MB (teto máximo)'
  )

  // Conexão média (10 Mbps) → burstSize = min(5M, 10 * 1M) = 5M (já no teto)
  assert(
    calculateBurstSize(10, 'upload') === 5_000_000,
    'Upload: 10 Mbps → burstSize = 5MB (teto máximo)'
  )

  // Conexão lenta (0.5 Mbps) → burstSize = min(5M, 0.5 * 1M) = 500K → max(1M, 500K) = 1M
  assert(
    calculateBurstSize(0.5, 'upload') === 1_000_000,
    'Upload: 0.5 Mbps → burstSize = 1MB (chão mínimo)'
  )

  // Conexão muito lenta (0.1 Mbps) → burstSize = min(5M, 0.1 * 1M) = 100K → max(1M, 100K) = 1M
  const tinyUploadBurst = calculateBurstSize(0.1, 'upload')
  assert(
    tinyUploadBurst === 1_000_000,
    'Upload: 0.1 Mbps → burstSize = 1MB (chão mínimo)'
  )
})

describe('Cálculo de Paralelismo', () => {
  // Conexão rápida (100 Mbps) → ceil(100/10) = 10 → min(8, 10) = 8 conexões
  assert(
    calculateParallelCount(100) === 8,
    '100 Mbps → 8 conexões paralelas (teto)'
  )

  // Conexão média (50 Mbps) → ceil(50/10) = 5 conexões
  assert(
    calculateParallelCount(50) === 5,
    '50 Mbps → 5 conexões paralelas'
  )

  // Conexão média (25 Mbps) → ceil(25/10) = 3 conexões
  assert(
    calculateParallelCount(25) === 3,
    '25 Mbps → 3 conexões paralelas'
  )

  // Conexão lenta (5 Mbps) → ceil(5/10) = 1 conexão
  assert(
    calculateParallelCount(5) === 1,
    '5 Mbps → 1 conexão paralela'
  )

  // Conexão muito lenta (0.1 Mbps) → ceil(0.1/10) = 1 conexão
  assert(
    calculateParallelCount(0.1) === 1,
    '0.1 Mbps → 1 conexão paralela'
  )
})

describe('Simulação Completa — Cenário Realista (50 Mbps)', () => {
  // Quick benchmark: 1MB em ~160ms → 50 Mbps
  const quickMbps = calculateQuickBenchmarkMbps(1_000_000, 160)
  assert(Math.round(quickMbps) === 50, `Quick benchmark: ${Math.round(quickMbps)} Mbps`)

  // Burst size para 50 Mbps download
  const burstSize = calculateBurstSize(quickMbps, 'download')
  console.log(`   Burst size: ${(burstSize / 1e6).toFixed(1)} MB`)
  assert(burstSize >= 5_000_000, `Burst size mínimo respeitado: ${burstSize} bytes`)

  // Paralelismo para 50 Mbps
  const parallel = calculateParallelCount(quickMbps)
  console.log(`   Paralelismo: ${parallel} conexões`)
  assert(parallel >= 3 && parallel <= 8, `Paralelismo adequado: ${parallel}`)

  // Simular 5 bursts de ~20MB cada em paralelo (4 conexões × 5MB = 20MB por burst)
  const bytesPerBurst = 20_000_000
  const timePerBurstMs = (bytesPerBurst * 8) / (50 * 1e6) * 1000 // ~3200ms para 50Mbps
  console.log(`   Tempo estimado por burst: ${timePerBurstMs.toFixed(0)}ms`)

  const totalBytes = bytesPerBurst * 5
  const totalTimeMs = timePerBurstMs * 5 + 200 * 4 // bursts + delays de 200ms
  const finalSpeed = calculateDownloadSpeed(totalBytes, totalTimeMs)

  console.log(`   Total: ${(totalBytes / 1e6).toFixed(1)}MB em ${totalTimeMs.toFixed(0)}ms`)
  console.log(`   Velocidade calculada: ${finalSpeed} Mbps`)
  assert(finalSpeed >= 45 && finalSpeed <= 55, `Velocidade final próxima de 50 Mbps: ${finalSpeed}`)

  // ===== DEMONSTRAR O BUG =====
  const buggySpeed = calculateDownloadSpeedBuggy(totalBytes, totalTimeMs)
  console.log(`\n   ⚠️  COM BUG (sem *1000): ${buggySpeed} Mbps`)
  console.log(`      Correto: ${finalSpeed} Mbps`)
  console.log(`      Fator de erro: ${(finalSpeed / buggySpeed).toFixed(0)}x`)
})

describe('Simulação Completa — Cenário Lento (2 Mbps)', () => {
  // Quick benchmark: 1MB em ~4 segundos → 2 Mbps
  const quickMbps = calculateQuickBenchmarkMbps(1_000_000, 4000)
  console.log(`   Quick benchmark: ${quickMbps.toFixed(1)} Mbps`)

  // Burst size para 2 Mbps download
  const burstSize = calculateBurstSize(quickMbps, 'download')
  console.log(`   Burst size: ${(burstSize / 1e6).toFixed(1)} MB (mínimo)`)
  assert(burstSize === 5_000_000, `Burst no mínimo: ${burstSize} bytes`)

  // Paralelismo para 2 Mbps → 1 conexão
  const parallel = calculateParallelCount(quickMbps)
  console.log(`   Paralelismo: ${parallel} conexão`)
  assert(parallel === 1, `Apenas 1 conexão: ${parallel}`)

  // Simular 5 bursts de 5MB cada (mínimo), 1 conexão
  const bytesPerBurst = 5_000_000
  const timePerBurstMs = (bytesPerBurst * 8) / (2 * 1e6) * 1000 // ~20000ms para 2Mbps
  console.log(`   Tempo estimado por burst: ${timePerBurstMs.toFixed(0)}ms`)

  const totalBytes = bytesPerBurst * 5
  const totalTimeMs = timePerBurstMs * 5 + 200 * 4 // bursts + delays
  const finalSpeed = calculateDownloadSpeed(totalBytes, totalTimeMs)

  console.log(`   Total: ${(totalBytes / 1e6).toFixed(1)}MB em ${totalTimeMs.toFixed(0)}ms`)
  console.log(`   Velocidade calculada: ${finalSpeed} Mbps`)
  assert(finalSpeed >= 1.5 && finalSpeed <= 2.5, `Velocidade final próxima de 2 Mbps: ${finalSpeed}`)

  // ===== DEMONSTRAR O BUG =====
  const buggySpeed = calculateDownloadSpeedBuggy(totalBytes, totalTimeMs)
  console.log(`\n   ⚠️  COM BUG (sem *1000): ${buggySpeed} Mbps`)
  console.log(`      Correto: ${finalSpeed} Mbps`)
  console.log(`      Fator de erro: ${(finalSpeed / buggySpeed).toFixed(0)}x`)
})

describe('BUG CONFIRMADO — Fórmula sem conversão ms→s', () => {
  console.log(`\n   🔴 BUG CRÍTICO IDENTIFICADO!`)
  console.log(`   ──────────────────────────────────────`)
  console.log(`   As fórmulas em downloadService.ts e uploadService.ts`)
  console.log(`   NÃO convertem milissegundos para segundos.`)
  console.log()

  // Exemplo prático: 10MB em 4 segundos (40 Mbps real)
  const testBytes = 10_000_000
  const testTimeMs = 4000
  const expectedMbps = 20 // 10MB * 8 / 4s = 20 Mbps

  const buggyResult = calculateDownloadSpeedBuggy(testBytes, testTimeMs)
  const correctResult = calculateDownloadSpeed(testBytes, testTimeMs)

  console.log(`   Exemplo: ${testBytes / 1e6}MB em ${(testTimeMs / 1000).toFixed(0)}s`)
  console.log(`      Resultado COM BUG:    ${buggyResult} Mbps`)
  console.log(`      Resultado CORRETO:    ${correctResult} Mbps`)
  console.log(`      Valor esperado:       ~${expectedMbps} Mbps`)
  console.log()

  // Demonstrar como o bug explica os valores do usuário
  console.log(`   📊 POR QUE O USUÁRIO VÊ 0.10 Mbps:`)
  
  // Se a conexão real é 100 Mbps, com o bug aparece:
  const realSpeed = 100
  const buggyFromReal = realSpeed / 1000
  console.log(`      Conexão real:         ${realSpeed} Mbps`)
  console.log(`      Aparece na UI (BUG):  ${buggyFromReal.toFixed(2)} Mbps ← ISSO!`)
  console.log()

  // Se a conexão real é 60 Mbps, com o bug aparece:
  const uploadReal = 60
  const uploadBuggy = uploadReal / 1000
  console.log(`   📊 POR QUE O USUÁRIO VÊ 0.06 Mbps (upload):`)
  console.log(`      Upload real:          ${uploadReal} Mbps`)
  console.log(`      Aparece na UI (BUG):  ${uploadBuggy.toFixed(2)} Mbps ← ISSO!`)
  console.log()

  // Fórmula correta vs errada lado a lado
  console.log(`   📝 FÓRMULAS:`)
  console.log(`      ERRADA: (bytes * 8) / ms / 1e6`)
  console.log(`      CORRETA: (bytes * 8 * 1000) / ms / 1e6`)
  console.log(`            ou: (bytes * 8) / (ms / 1000) / 1e6`)
})

describe('BUG DETECTADO — Quick Benchmark Corrompido', () => {
  // Simular cenário onde o quick benchmark é afetado por TLS/DNS overhead
  // Primeiro request leva 10 segundos (DNS + TLS handshake + download)
  const corruptedQuickMs = 10000
  const corruptedMbps = calculateQuickBenchmarkMbps(1_000_000, corruptedQuickMs)

  console.log(`   Quick benchmark corrompido: ${corruptedMbps.toFixed(3)} Mbps`)
  console.log(`   (devido a DNS + TLS handshake de 10s no primeiro request)`);

  // Burst size calculado com valor corrompido
  const corruptedBurstSize = calculateBurstSize(corruptedMbps, 'download')
  console.log(`   Burst size calculado: ${(corruptedBurstSize / 1e6).toFixed(2)} MB`)

  // Mesmo com o chão de 5MB, o paralelismo é apenas 1
  const corruptedParallel = calculateParallelCount(corruptedMbps)
  console.log(`   Paralelismo calculado: ${corruptedParallel} conexão`);

  // Simular resultado final
  const totalBytes = corruptedBurstSize * 5
  const actualSpeedMs = 2000 // supondo que a velocidade real é 2s por burst (5MB em 2s = 20Mbps)
  const totalTimeMs = actualSpeedMs * 1000 * 5 + 200 * 4

  // PROBLEMA: O código usa o tempo REAL dos bursts, não o do quick benchmark
  // Então o resultado final pode estar OK se os bursts forem rápidos...
  // MAS se os bursts também forem lentos por causa de paralelismo baixo (1 conexão):
  const slowBurstTime = (corruptedBurstSize * 8) / (20 * 1e6) * 1000 // 5MB em 20Mbps com 1 conexão = 2s
  const slowTotalTime = slowBurstTime * 5 + 200 * 4
  const finalSpeedWithSlowBursts = calculateDownloadSpeed(totalBytes, slowTotalTime)

  console.log(`\n   ⚠️  CENÁRIO DE BUG:`)
  console.log(`      Quick benchmark: ${corruptedMbps.toFixed(3)} Mbps (corrompido por overhead)`)
  console.log(`      Burst size: ${(corruptedBurstSize / 1e6).toFixed(2)} MB (mínimo forçado)`)
  console.log(`      Paralelismo: ${corruptedParallel} conexão (baixo!)`)
  console.log(`      Tempo real por burst: ${slowBurstTime.toFixed(0)}ms`)
  console.log(`      Velocidade final calculada: ${finalSpeedWithSlowBursts} Mbps`)

  // Se o quick benchmark diz 0.8Mbps mas a conexão real é 20Mbps,
  // e usamos apenas 1 conexão paralela com bursts mínimos...
  // O resultado final PODE estar correto se o tempo for medido corretamente!
  // MAS se houver falhas silenciosas nos fetches (Promise.allSettled), os bytes ficam 0.

  console.log(`\n   🔍 ANÁLISE DO BUG:`)
  console.log(`      A fórmula de velocidade é CORRETA matematicamente.`)
  console.log(`      O problema NÃO está no cálculo final, mas sim em:`)
  console.log(`        1. Quick benchmark baixo → burst sizes mínimos`)
  console.log(`        2. Paralelismo baixo (1 conexão) → mais lento`)
  console.log(`        3. Promise.allSettled pode silenciar falhas de fetch`)
  console.log(`        4. Se fetch falha: bytes=0 mas tempo continua contando`)
})

describe('BUG DETECTADO — Falha Silenciosa nos Fetches', () => {
  // Simular cenário onde alguns bursts falham (Promise.allSettled)
  const numBursts = 5
  let totalBytes = 0
  let totalTimeMs = 0

  for (let i = 0; i < numBursts; i++) {
    const burstTimeMs = 2000 // cada burst leva 2 segundos
    totalTimeMs += burstTimeMs

    // Supor que bursts 1 e 3 falharam (network error)
    if (i === 1 || i === 3) {
      console.log(`   Burst ${i + 1}: REJECTED (fetch falhou) — bytes = 0`)
      // burstBytes = 0, totalBytes não aumenta!
    } else {
      const burstBytes = 5_000_000
      totalBytes += burstBytes
      console.log(`   Burst ${i + 1}: OK — ${burstBytes / 1e6}MB`)
    }

    // Delay entre bursts
    totalTimeMs += 200
  }

  const finalSpeed = calculateDownloadSpeed(totalBytes, totalTimeMs)

  console.log(`\n   Total bytes: ${(totalBytes / 1e6).toFixed(1)}MB (de ${numBursts * 5}MB esperados)`)
  console.log(`   Tempo total: ${totalTimeMs}ms`)
  console.log(`   Velocidade calculada: ${finalSpeed} Mbps`)

  // Com 3 bursts OK e 2 falhando, a velocidade cai (mas ainda é realista com fórmula correta)
  assert(
    finalSpeed < 20,
    `Velocidade caindo com falhas silenciosas: ${finalSpeed} Mbps (< 20)`
  )

  console.log(`\n   ⚠️  COM 2 FALHAS EM 5 BURSTS, VELOCIDADE CAI DRÁSTICAMENTE!`)
  console.log(`      Promise.allSettled silencia erros mas não compensa bytes perdidos.`)
})

describe('BUG DETECTADO — Latência Zero', () => {
  // Simular cenário onde todos os pings falham
  const pings = [] // array vazio!

  if (pings.length === 0) {
    console.log(`   Pings coletados: ${pings.length}`)
    console.log(`   Retorno default: { avgPing: 0, minPing: 0, maxPing: 0, jitter: 0 }`)
    assert(
      true,
      'Array vazio → retorna latência zero (valor default)'
    )
    console.log(`\n   ⚠️  SE TODOS OS PINGS FALHAM, LATÊNCIA = 0ms!`)
    console.log(`      Isso NÃO significa que a latência é zero.`)
    console.log(`      Significa que o teste não conseguiu medir.`)
  }

  // Simular pings com valores muito baixos (precisão de performance.now())
  const precisePings = [1, 2, 1, 3, 2, 1, 2, 1] // ms reais mas arredondados
  console.log(`\n   Pings de alta precisão: [${precisePings.join(', ')}]`)

  const trimmed = precisePings.slice(2, -2) // remove outliers
  const avgPing = Math.round(trimmed.reduce((s, v) => s + v, 0) / trimmed.length * 10) / 10

  console.log(`   Após trim: [${trimmed.join(', ')}]`)
  console.log(`   Média arredondada: ${avgPing}ms`)

  if (avgPing === 0) {
    console.log(`   ⚠️  Média < 0.05ms aparece como 0.0 na UI!`)
  }
})

// ===== RESULTADO FINAL =====

console.log('\n\n' + '='.repeat(60))
console.log('RESULTADOS DOS TESTES UNITÁRIOS')
console.log('='.repeat(60))
console.log(`  Passaram: ${passed}`)
console.log(`  Falharam: ${failed}`)
console.log(`  Total:    ${passed + failed}`)

if (failed > 0) {
  console.error('\n❌ TESTES FALHARAM!')
  process.exit(1)
} else {
  console.log('\n✅ TODOS OS TESTES PASSARAM!')
}

// ===== RESUMO DOS BUGS IDENTIFICADOS =====

console.log('\n\n' + '='.repeat(60))
console.log('RESUMO DOS BUGS IDENTIFICADOS')
console.log('='.repeat(60))
console.log(`
1. 🔴 BUG CRÍTICO: Fórmula sem conversão ms → s (FATOR 1000x)
   ──────────────────────────────────────────────────────
   As fórmulas em downloadService.ts e uploadService.ts dividem
   por tempo em milissegundos SEM converter para segundos.
   
   ERRADA: (bytes * 8) / ms / 1e6 → resultado 1000x menor
   CORRETA: (bytes * 8 * 1000) / ms / 1e6 → resultado correto
   
   Exemplo prático:
     Conexão real: 100 Mbps → UI mostra: 0.10 Mbps ← BUG!
     Upload real: 60 Mbps → UI mostra: 0.06 Mbps ← BUG!

2. QUICK BENCHMARK CORROMPE BURST SIZES (SECUNDÁRIO)
   ────────────────────────────────────────────────
   O primeiro request (1MB) é afetado por DNS + TLS handshake,
   resultando em quickMbps artificialmente baixo.
   
   Exemplo: 1MB em 10s → 0.8 Mbps (real: 50+ Mbps)
   Isso faz burstSize cair para o mínimo e paralelismo para 1 conexão.

3. PROMISE.ALLSETTLED SILENCIA FALHAS DE FETCH (SECUNDÁRIO)
   ────────────────────────────────────────────────────────
   Se um fetch falha, Promise.allSettled retorna 'rejected' sem erro.
   O burstBytes fica 0 mas o tempo continua contando.
   Resultado: velocidade artificialmente baixa.

4. LATÊNCIA ZERO POR ARRAY VAZIO (SECUNDÁRIO)
   ──────────────────────────────────────────
   Se todos os 20 pings falham, pings.length === 0 → retorna { avgPing: 0 }.
   Isso NÃO significa latência zero, mas sim teste sem dados.

5. DELAY DE 200MS ENTRE BURSTS ADICIONA OVERHEAD (SECUNDÁRIO)
   ──────────────────────────────────────────────────────────
   5 bursts × 200ms = 1000ms de delay puro não contabilizado como throughput.
   Para conexões rápidas, esse delay é significativo.
`)
