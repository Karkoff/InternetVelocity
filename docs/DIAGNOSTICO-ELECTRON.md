# Diagnóstico — Janela Electron Não Aparece (RESOLVIDO)

## Problema Original

O processo `Internet Velocity.exe` aparecia no Gerenciador de Tarefas, mas **nenhuma janela era exibida**. A aplicação funcionava normalmente quando rodava no navegador web.

---

## Causa Raiz Identificada

### O Sintoma

```
ReferenceError: __dirname is not defined in ES module scope
This file is being treated as an ES module because it has a '.js' file extension
and 'package.json' contains "type": "module"
```

O arquivo `dist-electron/main.cjs` era nomeado `.cjs` mas continha sintaxe ESM:
```js
import { app, BrowserWindow, shell } from "electron";
// ...
export default mainWindow;  // ← export não existe em CJS!
```

Node.js rejeita isso → o main process morre antes de `createWindow()` ser chamado → processo fica rodando sem janela.

### Por Que Forçar CJS Falhou (várias tentativas)

1. **`rollupOptions.output.format: 'cjs'`** — ignorado pelo Vite no lib mode
2. **`entryFileNames: '[name].cjs'`** — renomeia o arquivo mas não converte o conteúdo
3. **Tentativa de `formats: ['cjs']` via config** — o `mergeConfig` do Vite **concatena arrays**, então `['es'] + ['cjs'] = ['es', 'cjs']`. O build ESM sobrescrevia o `.cjs`

### A Verdadeira Causa

Com `"type": "module"` no package.json, o `vite-plugin-electron` define internamente:
```
lib.formats = ['es']  // ← vem do utils-C8Fqt6Oj.mjs:90
```

Quando tentávamos sobrescrever via config, o merge do Vite **unia** os arrays em vez de substituir. O resultado era um arquivo `.cjs` com conteúdo ESM — inválido para Node.js CommonJS.

---

## Solução Implementada

### `vite.config.ts` — Plugin `forceCjs()`

```typescript
function forceCjs(): Plugin {
  return {
    name: 'force-electron-cjs',
    enforce: 'post',
    config(config) {
      if (config.build?.lib) {
        config.build.lib.formats = ['cjs']       // substitui, não concatena
        config.build.lib.fileName = () => '[name].cjs'
      }
    },
  }
}
```

Aplicado via `vite.plugins: [forceCjs()]` **dentro** de cada entry do electron plugin. Isso contorna o mergeConfig porque o hook `config()` é chamado antes do merge, definindo `formats = ['cjs']` diretamente sem passar pelo concatenador.

### Por Que Manter `"type": "module"`

- Tailwind e PostCSS configs dependem disso
- O renderer web (React/Vite) funciona independentemente do `type` do package.json — o Vite gerencia seus próprios modules internamente
- Preloads sandboxed no Electron 28 **precisam** ser CJS, não ESM

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `vite.config.ts` | Plugin `forceCjs()` aplicado a main e preload builds |
| `electron/main.ts` | Logs diagnósticos + event listeners + `show: false`/`ready-to-show` + referências `.cjs` |
| `electron/preload.ts` | Removido `delete window.__preloadExposed` (potencial erro silencioso) |
| `package.json` | `"main": "dist-electron/main.cjs"` + scripts corrigidos |
| `docs/M1.md` | Atualizado com informações de diagnóstico |

---

## Como Testar

```powershell
# Limpar build anterior
Remove-Item -Recurse -Force dist-electron

# Reconstruir
npx vite build

# Verificar que o conteúdo é CJS (não deve retornar nada)
Select-String -Path dist-electron\main.cjs -Pattern '^import |^export '

# Executar Electron
npx electron .
```

O `main.cjs` deve começar com `require("electron")`. Se a janela ainda não abrir, verificar os logs `[Electron]` no terminal.

---

## Outras Hipóteses Investigadas (Descartadas)

| Hipótese | Status | Motivo do Descarte |
|----------|--------|-------------------|
| Script `concurrently` conflita com plugin | ✅ Corrigido | Mudado para `vite` direto, mas não era a causa raiz |
| Preload falhando silenciosamente | ✅ Corrigido | Removido `delete window.__preloadExposed`, mas não era a causa raiz |
| Janela oculta pelo Windows | ❓ Não testado | Só se aplica se o main process carregar — o crash do CJS impedia isso |

---

## Referências

- [vite-plugin-electron utils-C8Fqt6Oj.mjs:90](node_modules/vite-plugin-electron/dist/utils-C8Fqt6Oj.mjs#L90)
- [Vite mergeConfig — concatena arrays](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/config/resolveConfig.ts)
- [Electron 28 sandboxed preload — CJS only](https://www.electronjs.org/docs/latest/tutorial/sandbox)
