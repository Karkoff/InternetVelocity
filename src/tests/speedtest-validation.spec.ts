import { test, expect } from '@playwright/test'

test.describe('Validação de Métricas do Speed Test', () => {
  // Faixas mínimas realistas para qualquer conexão funcional
  const FAIXAS_REALISTAS = {
    downloadMinMbps: 0.5,       // Mínimo absoluto para ser considerado "internet"
    uploadMinMbps: 0.2,         // Mínimo absoluto para upload
    latencyMaxMs: 1000,         // Máximo razoável para ping (1 segundo)
    latencyMinMs: 0.5,          // Mínimo físico impossível de ser 0
    downloadMaxMbps: 10000,     // 10 Gbps como teto máximo atual
    uploadMaxMbps: 10000,       // 10 Gbps como teto máximo atual
  }

  test('métricas devem estar dentro de faixas realistas', async ({ page }) => {
    const consoleLogs: string[] = []
    const errors: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
    })

    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('http://localhost:5173/')
    await expect(page.locator('text=Internet Velocity')).toBeVisible()

    // Iniciar o teste
    await page.locator('button', { hasText: 'Iniciar Teste' }).click()

    // Aguardar conclusão (até 2 minutos)
    await page.waitForTimeout(120000)

    // Verificar erros de JavaScript
    expect(errors.length).toBe(0)
    if (errors.length > 0) {
      console.error('❌ Erros JavaScript detectados:', errors)
    }

    // Extrair logs do SpeedTest
    const speedLogs = consoleLogs.filter(l => l.includes('[SpeedTest]'))
    console.log('\n=== LOGS DO SPEED TEST ===')
    speedLogs.forEach(log => console.log(`  ${log}`))
    console.log('=========================\n')

    // Aguardar resultados aparecerem na tela
    await expect(page.locator('text=Download')).toBeVisible({ timeout: 10000 })

    // Extrair valores da UI
    const downloadText = await page.locator('text=Download').locator('..').textContent() || ''
    const uploadText = await page.locator('text=Upload').locator('..').textContent() || ''
    const latencyText = await page.locator('text=Latência').locator('..').textContent() || ''

    // Parse dos valores (formato: "0.10 Mbps")
    const downloadMatch = downloadText.match(/([\d.]+)\s*Mbps/)
    const uploadMatch = uploadText.match(/([\d.]+)\s*Mbps/)
    const latencyMatch = latencyText.match(/([\d.]+)\s*ms/)

    expect(downloadMatch).not.toBeNull()
    expect(uploadMatch).not.toBeNull()
    expect(latencyMatch).not.toBeNull()

    const downloadMbps = parseFloat(downloadMatch![1])
    const uploadMbps = parseFloat(uploadMatch![1])
    const latencyMs = parseFloat(latencyMatch![1])

    console.log(`\n📊 Resultados extraídos da UI:`)
    console.log(`   Download: ${downloadMbps} Mbps`)
    console.log(`   Upload:   ${uploadMbps} Mbps`)
    console.log(`   Latência: ${latencyMs} ms\n`)

    // ===== VALIDAÇÕES =====

    // 1. Download deve estar em faixa plausível
    if (downloadMbps < FAIXAS_REALISTAS.downloadMinMbps) {
      console.error(
        `❌ DOWNLOAD ANORMALMENTE BAIXO: ${downloadMbps} Mbps\n` +
        `   Esperado mínimo: ${FAIXAS_REALISTAS.downloadMinMbps} Mbps\n` +
        `   Possíveis causas:\n` +
        `     - Quick benchmark corrompido (primeiro request muito lento)\n` +
        `     - Burst sizes calculados erroneamente pequenos\n` +
        `     - Fetch falhando silenciosamente (Promise.allSettled)\n` +
        `     - Problema de rede ou bloqueio de CORS`
      )
    } else if (downloadMbps > FAIXAS_REALISTAS.downloadMaxMbps) {
      console.error(
        `❌ DOWNLOAD ANORMALMENTE ALTO: ${downloadMbps} Mbps\n` +
        `   Esperado máximo: ${FAIXAS_REALISTAS.downloadMaxMbps} Mbps\n` +
        `   Possível causa: contagem duplicada de bytes`
      )
    } else {
      console.log(`✅ Download dentro da faixa esperada: ${downloadMbps} Mbps`)
    }

    // 2. Upload deve estar em faixa plausível
    if (uploadMbps < FAIXAS_REALISTAS.uploadMinMbps) {
      console.error(
        `❌ UPLOAD ANORMALMENTE BAIXO: ${uploadMbps} Mbps\n` +
        `   Esperado mínimo: ${FAIXAS_REALISTAS.uploadMinMbps} Mbps\n` +
        `   Possíveis causas:\n` +
        `     - Quick benchmark corrompido (primeiro request muito lento)\n` +
        `     - Burst sizes calculados erroneamente pequenos\n` +
        `     - Uint8Array com tamanho zero sendo enviado`
      )
    } else if (uploadMbps > FAIXAS_REALISTAS.uploadMaxMbps) {
      console.error(
        `❌ UPLOAD ANORMALMENTE ALTO: ${uploadMbps} Mbps\n` +
        `   Esperado máximo: ${FAIXAS_REALISTAS.uploadMaxMbps} Mbps\n` +
        `   Possível causa: contagem duplicada de bytes`
      )
    } else {
      console.log(`✅ Upload dentro da faixa esperada: ${uploadMbps} Mbps`)
    }

    // 3. Latência não pode ser zero (impossível fisicamente)
    if (latencyMs === 0) {
      console.error(
        `❌ LATÊNCIA ZERO DETECTADA: ${latencyMs} ms\n` +
        `   Isso é FISICAMENTE IMPOSSÍVEL!\n` +
        `   Mesmo conexões locais têm pelo menos 1-5ms de RTT.\n` +
        `   Possíveis causas:\n` +
        `     - performance.now() com precisão insuficiente\n` +
        `     - Todos os pings falharam e o fallback retorna 0\n` +
        `     - Array de pings vazio → retorno default { avgPing: 0 }\n` +
        `     - Arredondamento: valores < 0.05ms aparecem como 0.0`
      )
    } else if (latencyMs > FAIXAS_REALISTAS.latencyMaxMs) {
      console.error(
        `❌ LATÊNCIA ANORMALMENTE ALTA: ${latencyMs} ms\n` +
        `   Esperado máximo: ${FAIXAS_REALISTAS.latencyMaxMs} ms\n` +
        `   Possível causa: congestionamento de rede ou problema no servidor Cloudflare`
      )
    } else {
      console.log(`✅ Latência dentro da faixa esperada: ${latencyMs} ms`)
    }

    // 4. Download deve ser >= Upload (na maioria das conexões residenciais)
    if (downloadMbps > 0 && uploadMbps > 0 && downloadMbps < uploadMbps * 0.5) {
      console.error(
        `⚠️  UPLOAD maior que DOWNLOAD:\n` +
        `   Download: ${downloadMbps} Mbps | Upload: ${uploadMbps} Mbps\n` +
        `   Isso é incomum para conexões residenciais.\n` +
        `   Possíveis causas:\n` +
        `     - Conexão simétrica (fibra empresarial)\n` +
        `     - Download corrompido (valor artificialmente baixo)\n` +
        `     - Upload corrompido (valor artificialmente alto)`
      )
    }

    // 5. Verificar logs internos para diagnóstico detalhado
    const quickBenchmarkLogs = speedLogs.filter(l => l.includes('Quick benchmark'))
    if (quickBenchmarkLogs.length > 0) {
      console.log('\n📋 Quick Benchmark Logs:')
      quickBenchmarkLogs.forEach(log => console.log(`   ${log}`))

      // Extrair valores do quick benchmark
      const dlQuickMatch = speedLogs.find(l => l.includes('Quick benchmark') && !l.includes('upload'))
      if (dlQuickMatch) {
        const mbpsMatch = dlQuickMatch.match(/([\d.]+)\s*Mbps/)
        if (mbpsMatch) {
          const quickMbps = parseFloat(mbpsMatch[1])
          console.log(`\n   Quick benchmark download: ${quickMbps} Mbps`)

          if (quickMbps < 0.5) {
            console.error(
              `\n   ⚠️  QUICK BENCHMARK BAIXO (${quickMbps} Mbps)!\n` +
              `      Isso indica que o primeiro request está sendo afetado por:\n` +
              `        - DNS lookup inicial\n` +
              `        - Handshake TLS\n` +
              `        - Rota até Cloudflare\n` +
              `      Esse valor baixo corrompe os burst sizes adaptativos!`
            )
          } else {
            console.log(`   ✅ Quick benchmark dentro do esperado: ${quickMbps} Mbps`)
          }
        }
      }

      const ulQuickMatch = speedLogs.find(l => l.includes('Quick benchmark upload'))
      if (ulQuickMatch) {
        const mbpsMatch = ulQuickMatch.match(/([\d.]+)\s*Mbps/)
        if (mbpsMatch) {
          const quickMbps = parseFloat(mbpsMatch[1])
          console.log(`   Quick benchmark upload: ${quickMbps} Mbps`)

          if (quickMbps < 0.5) {
            console.error(
              `\n   ⚠️  QUICK BENCHMARK UPLOAD BAIXO (${quickMbps} Mbps)!\n` +
              `      Mesmo problema do download — corrompe os burst sizes!`
            )
          } else {
            console.log(`   ✅ Quick benchmark upload dentro do esperado: ${quickMbps} Mbps`)
          }
        }
      }
    }

    // 6. Verificar se bursts foram executados corretamente
    const burstLogs = speedLogs.filter(l => l.includes('Burst'))
    console.log(`\n📋 Bursts executados: ${burstLogs.length}`)
    if (burstLogs.length > 0) {
      burstLogs.forEach(log => console.log(`   ${log}`))

      // Verificar se os tamanhos de burst fazem sentido
      const sizeMatches = burstLogs.map(l => l.match(/([\d.]+)MB/)).filter(Boolean)
      if (sizeMatches.length > 0) {
        const sizes = sizeMatches.map(m => parseFloat(m![1]))
        console.log(`   Tamanhos de burst: ${sizes.join(', ')} MB`)

        // Burst muito pequeno (< 0.01 MB = 10 KB) é suspeito
        const tinyBursts = sizes.filter(s => s < 0.01)
        if (tinyBursts.length > 0) {
          console.error(
            `\n   ❌ BURST SIZES MINÚSCULOS DETECTADOS!\n` +
            `      ${tinyBursts.length} burst(es) com tamanho < 10 KB.\n` +
            `      Isso confirma que o quick benchmark corrompeu os cálculos de tamanho.`
          )
        }
      }
    }

    // 7. Verificar se há falhas silenciosas nos bursts
    const rejectedLogs = speedLogs.filter(l => l.includes('rejected') || l.includes('falhou'))
    if (rejectedLogs.length > 0) {
      console.error(`\n❌ ${rejectedLogs.length} requisição(ões) falharam/rejeitadas:`)
      rejectedLogs.forEach(log => console.log(`   ${log}`))
    }

    // ===== RESULTADO FINAL DO TESTE =====
    const todasValidacoesPassaram =
      downloadMbps >= FAIXAS_REALISTAS.downloadMinMbps &&
      uploadMbps >= FAIXAS_REALISTAS.uploadMinMbps &&
      latencyMs > 0 &&
      latencyMs <= FAIXAS_REALISTAS.latencyMaxMs

    expect(todasValidacoesPassaram).toBe(true)
  })

  test('latência não pode ser zero', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', msg => consoleLogs.push(msg.text()))

    await page.goto('http://localhost:5173/')
    await expect(page.locator('text=Internet Velocity')).toBeVisible()

    await page.locator('button', { hasText: 'Iniciar Teste' }).click()
    await page.waitForTimeout(120000)

    const latencyText = await page.locator('text=Latência').locator('..').textContent() || ''
    const latencyMatch = latencyText.match(/([\d.]+)\s*ms/)
    expect(latencyMatch).not.toBeNull()

    const latencyMs = parseFloat(latencyMatch![1])

    // Latência zero é fisicamente impossível
    expect(latencyMs).toBeGreaterThan(0)

    console.log(`Latência medida: ${latencyMs} ms`)
  })

  test('download deve ser >= 0.5 Mbps para conexão funcional', async ({ page }) => {
    const consoleLogs: string[] = []
    page.on('console', msg => consoleLogs.push(msg.text()))

    await page.goto('http://localhost:5173/')
    await expect(page.locator('text=Internet Velocity')).toBeVisible()

    await page.locator('button', { hasText: 'Iniciar Teste' }).click()
    await page.waitForTimeout(120000)

    const downloadText = await page.locator('text=Download').locator('..').textContent() || ''
    const downloadMatch = downloadText.match(/([\d.]+)\s*Mbps/)
    expect(downloadMatch).not.toBeNull()

    const downloadMbps = parseFloat(downloadMatch![1])

    // Se a internet funciona, deve medir pelo menos 0.5 Mbps
    if (downloadMbps < 0.5) {
      console.error(
        `\n⚠️  DOWNLOAD BAIXO: ${downloadMbps} Mbps\n` +
        `   Conexão pode estar:\n` +
        `     - Muito lenta ou instável\n` +
        `     - Com throttling ativo\n` +
        `     - Medindo apenas overhead (valores incorretos)`
      )

      // Verificar quick benchmark nos logs
      const quickLog = consoleLogs.find(l => l.includes('Quick benchmark') && !l.includes('upload'))
      if (quickLog) {
        console.log(`   Quick benchmark log: ${quickLog}`)
      }
    }

    expect(downloadMbps).toBeGreaterThanOrEqual(0.5)
  })

  test('diagnóstico completo do speed test', async ({ page }) => {
    const consoleLogs: string[] = []
    const errors: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push(text)
    })

    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('http://localhost:5173/')
    await expect(page.locator('text=Internet Velocity')).toBeVisible()

    // Iniciar teste
    await page.locator('button', { hasText: 'Iniciar Teste' }).click()
    await page.waitForTimeout(120000)

    const speedLogs = consoleLogs.filter(l => l.includes('[SpeedTest]'))

    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║   DIAGNÓSTICO COMPLETO DO SPEED TEST    ║')
    console.log('╚══════════════════════════════════════════╝\n')

    // --- Seção 1: Quick Benchmarks ---
    console.log('── QUICK BENCHMARKS ──')
    const quickLogs = speedLogs.filter(l => l.includes('Quick benchmark'))
    if (quickLogs.length === 0) {
      console.error('   ❌ Nenhum quick benchmark encontrado!')
    } else {
      for (const log of quickLogs) {
        console.log(`   ${log}`)

        // Extrair valor do Mbps
        const match = log.match(/([\d.]+)\s*Mbps/)
        if (match) {
          const mbps = parseFloat(match[1])
          if (mbps < 0.5) {
            console.error(`   ⚠️  VALOR BAIXO — isso vai corromper os burst sizes!`)
          }
        }
      }
    }

    // --- Seção 2: Bursts ---
    console.log('\n── BURSTS ──')
    const burstLogs = speedLogs.filter(l => l.includes('Burst'))
    if (burstLogs.length === 0) {
      console.error('   ❌ Nenhum burst encontrado!')
    } else {
      for (const log of burstLogs) {
        console.log(`   ${log}`)

        // Verificar tamanho do burst
        const sizeMatch = log.match(/([\d.]+)MB/)
        if (sizeMatch) {
          const mb = parseFloat(sizeMatch[1])
          if (mb < 0.01) {
            console.error(`   ❌ BURST MINÚSCULO: ${mb} MB — confirma bug no cálculo!`)
          } else if (mb < 0.5) {
            console.warn(`   ⚠️  Burst pequeno: ${mb} MB`)
          }
        }

        // Verificar tamanho em bytes
        const bytesMatch = log.match(/([\d.]+)MB\s*em/)
        if (bytesMatch) {
          const mb = parseFloat(bytesMatch[1])
          console.log(`      → Transferido: ${mb} MB`)
        }
      }
    }

    // --- Seção 3: Pings ---
    console.log('\n── PINGS ──')
    const pingLogs = speedLogs.filter(l => l.includes('Ping'))
    if (pingLogs.length === 0) {
      console.error('   ❌ Nenhum ping encontrado!')
    } else {
      const successfulPings: number[] = []
      for (const log of pingLogs) {
        console.log(`   ${log}`)

        const msMatch = log.match(/(\d+)ms/)
        if (msMatch && !log.includes('falhou')) {
          successfulPings.push(parseInt(msMatch[1]))
        }
      }

      console.log(`\n   Pings bem-sucedidos: ${successfulPings.length}/20`)
      if (successfulPings.length === 0) {
        console.error('   ❌ TODOS OS PINGS FALHARAM!')
        console.error('      → Latência será retornada como 0 (valor default)')
      } else if (successfulPings.length < 10) {
        console.warn(`   ⚠️  Muitos pings falharam (${20 - successfulPings.length} falhas)`)
      }

      // Estatísticas dos pings bem-sucedidos
      if (successfulPings.length > 0) {
        const avg = Math.round(successfulPings.reduce((a, b) => a + b, 0) / successfulPings.length)
        const min = Math.min(...successfulPings)
        const max = Math.max(...successfulPings)
        console.log(`   Estatísticas (todos os pings):`)
        console.log(`     Média: ${avg}ms | Min: ${min}ms | Max: ${max}ms`)
      }
    }

    // --- Seção 4: Resultados Finais ---
    console.log('\n── RESULTADOS FINAIS ──')
    const finalLogs = speedLogs.filter(l => l.includes('final'))
    for (const log of finalLogs) {
      console.log(`   ${log}`)
    }

    // Extrair valores da UI
    await expect(page.locator('text=Download')).toBeVisible({ timeout: 10000 })
    const downloadText = await page.locator('text=Download').locator('..').textContent() || ''
    const uploadText = await page.locator('text=Upload').locator('..').textContent() || ''
    const latencyText = await page.locator('text=Latência').locator('..').textContent() || ''

    const dlMatch = downloadText.match(/([\d.]+)\s*Mbps/)
    const ulMatch = uploadText.match(/([\d.]+)\s*Mbps/)
    const latMatch = latencyText.match(/([\d.]+)\s*ms/)

    console.log('\n── VALORES NA UI ──')
    if (dlMatch) {
      const val = parseFloat(dlMatch[1])
      const status = val >= 0.5 ? '✅' : '❌'
      console.log(`   ${status} Download: ${val} Mbps`)
    }
    if (ulMatch) {
      const val = parseFloat(ulMatch[1])
      const status = val >= 0.2 ? '✅' : '❌'
      console.log(`   ${status} Upload: ${val} Mbps`)
    }
    if (latMatch) {
      const val = parseFloat(latMatch[1])
      const status = val > 0 && val < 1000 ? '✅' : '❌'
      console.log(`   ${status} Latência: ${val} ms`)
    }

    // --- Seção 5: Erros ---
    if (errors.length > 0) {
      console.log('\n── ERROS ──')
      errors.forEach(err => console.error(`   ❌ ${err}`))
    } else {
      console.log('\n── ERROS ── ✅ Nenhum erro detectado')
    }

    // --- Verificação final ---
    const downloadOk = dlMatch && parseFloat(dlMatch[1]) >= 0.5
    const uploadOk = ulMatch && parseFloat(ulMatch[1]) >= 0.2
    const latencyOk = latMatch && parseFloat(latMatch[1]) > 0

    console.log('\n── VERIFICAÇÃO FINAL ──')
    if (downloadOk && uploadOk && latencyOk) {
      console.log('   ✅ TODAS AS MÉTRICAS DENTRO DA FAIXA ESPERADA')
    } else {
      console.error('   ❌ ALGUMA MÉTRICA FORA DA FAIXA ESPERADA')
      if (!downloadOk) console.error('     - Download abaixo do esperado')
      if (!uploadOk) console.error('     - Upload abaixo do esperado')
      if (!latencyOk) console.error('     - Latência inválida (zero ou excessiva)')
    }

    // O teste passa se pelo menos coletou dados válidos
    expect(speedLogs.length).toBeGreaterThan(0)
  })
})
