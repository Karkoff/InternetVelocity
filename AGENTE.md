# Internet Velocity — Documentação de Arquitetura e Testes

## Visão Geral

Aplicativo React + Vite para teste de velocidade de conexão à internet.
Mede **download**, **upload** e **latência (ping)** usando os endpoints públicos da Cloudflare.
Atualmente em conversão para app desktop via Electron.

---

## Roadmap / Milestones

O planejamento do projeto é dividido em milestones documentados na pasta `docs/`.
Cada arquivo `Mx.md` contém as tarefas, critérios de aceite e status de cada fase.

| Arquivo | Fase | Status | Descrição |
|---------|------|--------|-----------|
| [`docs/M0.md`](docs/M0.md) | M0 | ✅ Concluído | Aplicação web funcional (React + Vite + Tailwind) |
| [`docs/M1.md`](docs/M1.md) | M1 | 🔄 Em progresso | Conversão para app desktop Windows com Electron |

> **Regra:** Novos milestones são criados como `docs/M2.md`, `docs/M3.md`, etc.
> Cada milestone deve ser concluído antes de iniciar o próximo.

---

## Stack Tecnológico

| Camada        | Tecnologia              |
|---------------|-------------------------|
| Framework     | React 18 + TypeScript   |
| Build         | Vite 5                  |
| Estilização   | Tailwind CSS 3          |
| E2E Testing   | Playwright 1.63         |
| Desktop       | Electron 28             |

---

## Estrutura do Projeto

```
InternetVelocity/
├── docs/                          # Roadmap / Milestones (M0.md, M1.md, ...)
│   ├── M0.md                      # ✅ Aplicação web funcional
│   └── M1.md                      # 🔄 Conversão para desktop (Electron)
├── electron/                      # Electron main process (M1)
│   └── main.ts                    # Main process do Electron
├── src/
│   ├── App.tsx                    # Componente principal (orquestra os testes)
│   ├── main.tsx                   # Entry point React
│   ├── types.ts                   # Interfaces TypeScript
│   ├── index.css                  # Estilos globais + Tailwind
│   ├── components/
│   │   ├── SpeedGauge.tsx         # Gauge circular animado
│   │   ├── ResultCard.tsx         # Card de resultado individual
│   │   └── ProgressBar.tsx        # Barra de progresso
│   ├── services/
│   │   ├── downloadService.ts     # Teste de velocidade de download
│   │   ├── uploadService.ts       # Teste de velocidade de upload
│   │   └── latencyService.ts      # Teste de latência (ping)
│   └── tests/
│       └── speedtest.spec.ts      # Testes E2E Playwright
├── playwright.config.ts           # Configuração do Playwright
├── vite.config.ts                 # Configuração do Vite + Electron plugin
├── tailwind.config.js             # Configuração Tailwind
├── electron-builder.yml           # Configuração do builder (M1)
├── package.json                   # Dependências e scripts
└── index.html                     # HTML base
```

---

## Arquitetura dos Serviços de Teste

### Fluxo Geral

```
[Iniciar Teste] → [Latência ~25%] → [Download ~60%] → [Upload ~95%] → [Completo 100%]
```

### 1. Latency Service (`latencyService.ts`)

- **Endpoint:** `GET https://speed.cloudflare.com/cdn-cgi/trace`
- **Método:** GET com cache desabilitado (⚠️ HEAD não funciona neste endpoint!)
- **Quantidade:** 10 pings sequenciais
- **Delay entre pings:** 50ms
- **Processamento:** Remove outliers (primeiro e último), calcula média, min, max e jitter
- **URL única por ping:** `${CDN_URL}/cdn-cgi/trace?_=${Date.now()}_${i}`
- **Importante:** `await response.text()` é necessário para medir o RTT completo

> **Bug corrigido em [data]:** O método HEAD causava falha silenciosa em todos os pings, resultando em latência 0ms. Substituído por GET com consumo do body.

### 2. Download Service (`downloadService.ts`)

- **Endpoint:** `GET https://speed.cloudflare.com/__down?bytes={tamanho}`
- **Método:** Fetch com cache desabilitado
- **Fase 1 — Quick Benchmark:**
  - Baixa 1.000.000 bytes (1MB) para estimar velocidade inicial
  - `quickMbps = (bytes * 8) / ms / 1e6`
- **Fase 2 — Bursts Adaptativos:**
  - 5 bursts sequenciais com delay de 200ms entre eles
  - Paralelismo: `Math.max(1, Math.min(8, Math.ceil(quickMbps / 10)))`
  - Tamanho do burst: `Math.max(5_000_000, Math.min(25_000_000, quickMbps * 2_000_000))`
- **Cálculo final:** `speedMbps = (totalBytes * 8) / totalTime / 1e6`

### 3. Upload Service (`uploadService.ts`)

- **Endpoint:** `POST https://speed.cloudflare.com/__up`
- **Método:** POST com body em Uint8Array, cache desabilitado
- **Fase 1 — Quick Benchmark:**
  - Envia 1.000.000 bytes (1MB) para estimar velocidade inicial
  - `quickMbps = (1_000_000 * 8) / ms / 1e6`
- **Fase 2 — Bursts Adaptativos:**
  - 5 bursts sequenciais com delay de 200ms entre eles
  - Paralelismo: `Math.max(1, Math.min(8, Math.ceil(quickMbps / 10)))`
  - Tamanho do burst: `Math.max(1_000_000, Math.min(5_000_000, quickMbps * 1_000_000))`
- **Cálculo final:** `speedMbps = (totalBytes * 8) / totalTime / 1e6`

---

## Tipos de Dados

```typescript
interface LatencyResult {
  avgPing: number   // ms
  minPing: number   // ms
  maxPing: number   // ms
  jitter: number    // ms
}

interface DownloadResult {
  speedMbps: number
  durationMs: number
}

interface UploadResult {
  speedMbps: number
  durationMs: number
}

type TestPhase = 'idle' | 'latency' | 'download' | 'upload' | 'complete'

interface SpeedTestProgress {
  phase: TestPhase
  progress: number  // 0-100
  message?: string
}
```

---

## Endpoints da Cloudflare Utilizados

| Endpoint                              | Método | Finalidade                    |
|---------------------------------------|--------|-------------------------------|
| `/cdn-cgi/trace?t={timestamp}`        | GET    | Medir latência (ping)         |
| `/__down?bytes={n}`                   | GET    | Download de dados             |
| `/__up`                               | POST   | Upload de dados               |

> ⚠️ **Importante:** O endpoint `/cdn-cgi/trace` **não suporta HEAD**. Deve-se usar `GET` com `response.text()` para medir RTT completo. (Bug corrigido em M0)

---

## Scripts Disponíveis

### Web (M0 — Concluído)

```bash
npm run dev        # Inicia servidor de desenvolvimento Vite (porta 5173)
npm run build      # Compila TypeScript + gera build estático
npm run preview    # Preview do build estático
```

### Desktop (M1 — Em progresso)

```bash
npm run dev:electron   # Inicia Electron com Vite dev server (hot reload)
npm run build:electron # Build web + empacota com electron-builder → release/
npm run preview:electron # Preview do build desktop
```

---

## Executando Testes E2E

### Pré-requisitos

1. Servidor Vite rodando: `npm run dev`
2. Playwright instalado: `npx playwright install chromium`

### Comandos

```bash
# Executar testes E2E
npx playwright test

# Executar com UI de debug
npx playwright test --ui

# Executar com headed (browser visível)
npx playwright test --headed

# Gerar relatório HTML
npx playwright show-report
```

### Configuração do Playwright

- **Test dir:** `./src/tests`
- **Base URL:** `http://localhost:5174/`
- **Timeout geral:** 120s
- **Browser:** Chromium headless
- **Screenshot:** apenas em falha
- **Trace:** no primeiro retry

---

## Correções Aplicadas (Bug Fix)

### Bug Crítico: Fórmula sem conversão ms → s (Fator 1000x)

**Sintoma:** Download 0.10 Mbps, Upload 0.06 Mbps (valores ~1000x menores que o real)

**Causa Raiz:** As fórmulas de cálculo dividiam por tempo em milissegundos SEM converter para segundos.

```
ANTES (ERRADO):
  quickMbps = (bytes * 8) / ms / 1e6        → resultado 1000x menor
  speedMbps = (totalBytes * 8) / ms / 1e6   → resultado 1000x menor

DEPOIS (CORRETO):
  quickMbps = (bytes * 8 * 1000) / ms / 1e6    → converte ms para segundos
  speedMbps = (totalBytes * 8 * 1000) / ms / 1e6 → converte ms para segundos
```

**Arquivos Corrigidos:**
- `src/services/downloadService.ts` — linhas 24, 68, 79
- `src/services/uploadService.ts` — linhas 22, 71, 82

**Exemplo do Bug:**
```
Conexão real:     100 Mbps
Aparecia na UI:   0.10 Mbps    ← bug! (100 / 1000 = 0.1)
Upload real:      60 Mbps
Aparecia na UI:   0.06 Mbps    ← bug! (60 / 1000 = 0.06)
```

### Outros Problemas Identificados (não críticos)

1. **Quick Benchmark Corrompe Burst Sizes** — DNS/TLS no primeiro request pode dar quickMbps baixo
2. **Promise.allSettled Silencia Falhas** — fetch falhado não conta bytes mas conta tempo

---

## Correções Aplicadas (Bug Fix) - Latência Zero

### Bug: Latência sempre 0ms

**Sintoma:** Download e Upload funcionavam, mas Latência mostrava `0.0 ms` com Min/Max/Jitter zerados.

**Causa Raiz:** O endpoint `/cdn-cgi/trace` da Cloudflare **não suporta método HEAD**. Todos os 10-20 pings falhavam silenciosamente (catch block), resultando em array vazio → retorno default `{ avgPing: 0 }`.

```
ANTES (ERRADO):
  method: 'HEAD'     ← Cloudflare rejeita, ping falha silenciosamente
  
DEPOIS (CORRETO):
  method: 'GET'      ← Cloudflare responde normalmente
  await response.text()  ← consome body para medir RTT completo
```

**Arquivos Corrigidos:**
- `src/services/latencyService.ts` — método HEAD → GET, consumo do body, melhor logging

---

## Status Atual (Todos os Bugs Corrigidos) ✅

| Bug | Status | Resultado Esperado |
|---|---|---|
| Download 0.10 Mbps | ✅ Corrigido | Valores reais (ex: 50-200+ Mbps) |
| Upload 0.06 Mbps | ✅ Corrigido | Valores reais (ex: 20-100+ Mbps) |
| Latência 0.0 ms | ✅ Corrigido | Valores reais (ex: 5-100ms) |

### Resumo das Correções

| Arquivo | Correção | Impacto |
|---|---|---|
| `downloadService.ts` | Fórmula: `(bytes * 8 * 1000)` | Download mostra valor real |
| `uploadService.ts` | Fórmula: `(bytes * 8 * 1000)` | Upload mostra valor real |
| `latencyService.ts` | HEAD → GET + response.text() | Latência mede RTT real |

---

## Problemas Conhecidos / Suspeitas

### Métricas Anormalmente Baixas

Valores observados: Download 0.10 Mbps, Upload 0.06 Mbps, Latência 0.0 ms.

**Hipóteses para investigação:**

1. **Quick Benchmark influencia negativamente o tamanho dos bursts**
   - Se o primeiro request (quick benchmark) for lento por overhead de conexão TLS/DNS, `quickMbps` fica baixo
   - Isso resulta em burst sizes mínimos e paralelismo reduzido
   - O cálculo final usa totalBytes/minimo, produzindo valor artificialmente baixo

2. **Latência 0.0 ms é impossível**
   - Qualquer conexão real tem pelo menos 1-5ms de RTT mínimo
   - Pode ser problema de arredondamento ou exibição

3. **Promise.allSettled pode estar silenciosamente falhando**
   - Se os fetches falharem, `burstBytes` fica 0 mas o tempo continua contando
   - Isso inflaciona o denominator (time) sem aumentar numerator (bytes)

4. **Delay de 200ms entre bursts adiciona overhead não contabilizado**
   - 5 bursts × 200ms = 1000ms de delay puro
   - Se os downloads forem rápidos, esse delay domina o tempo total

### Fórmula de Cálculo

```javascript
speedMbps = (totalBytes * 8) / totalTime / 1e6
```

- `totalBytes` em bytes → multiplicado por 8 para bits → dividido por 1e6 para megabits ✓
- `totalTime` em milissegundos → já tratado pela divisão ✓
- A fórmula está **correta** matematicamente

### Paralelismo Adaptativo

```javascript
parallelCount = Math.max(1, Math.min(8, Math.ceil(quickMbps / 10)))
```

- Se `quickMbps < 10` → paralelismo = 1 (apenas uma conexão)
- Isso é intencional para conexões lentas, mas pode ser problemático se o quick benchmark estiver errado

---

## Testes Necessários

### Validação de Métricas

1. **Teste de plausibilidade** — Verificar se os valores estão dentro de faixas realistas
2. **Teste de consistência** — Verificar se download > upload (comum em conexões assimétricas)
3. **Teste de latência mínima** — Verificar se latency >= 1ms (impossível ter 0ms)
4. **Teste de quick benchmark** — Validar que o benchmark inicial não corrompe os resultados

### Testes de Serviço Unitários

1. Mock dos endpoints da Cloudflare para testes determinísticos
2. Validar fórmulas de cálculo com valores conhecidos
3. Testar cenários de falha (network error, timeout)

---

## Notas de Desenvolvimento

- O app roda na porta **5174** (configuração customizada do Vite)
- Os logs do speed test usam prefixo `[SpeedTest]` para fácil filtragem
- Console logs detalhados estão disponíveis em cada serviço para debugging
