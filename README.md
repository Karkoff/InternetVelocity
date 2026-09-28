# ⚡ Internet Velocity

<div align="center">

![Internet Velocity](public/screenshot.png)

**Medidor de velocidade da internet com interface moderna e resultados detalhados.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-28-47845F.svg)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4.svg)](https://tailwindcss.com/)

[Download para Windows](https://github.com/Karkoff/InternetVelocity/releases) · [Reportar Bug](https://github.com/Karkoff/InternetVelocity/issues)

</div>

---

## 📋 Sobre o Projeto

O **Internet Velocity** é um aplicativo de desktop nativo para Windows que mede a velocidade da sua conexão com a internet com precisão. Desenvolvido com Electron + React + TypeScript, oferece uma experiência visual moderna e resultados detalhados em tempo real.

### 🔧 Tecnologias Utilizadas

| Tecnologia | Uso |
|---|---|
| **Electron** | Framework de desktop cross-platform |
| **React 18** | Interface de usuário com componentes funcionais |
| **TypeScript** | Tipagem estática e segurança de código |
| **Vite** | Build tool ultra-rápida |
| **Tailwind CSS** | Estilização utility-first |
| **Electron Builder** | Empacotamento e distribuição (.exe NSIS) |

---

## ✨ Features

### 🚀 Teste Completo de Velocidade
- **Download**: Mede a velocidade de download em Mbps com precisão
- **Upload**: Mede a velocidade de upload em Mbps
- **Latência (Ping)**: Calcula o tempo de resposta médio da sua conexão

### 📊 Métricas Detalhadas
- **Min/Max Ping**: Identifica variações de latência
- **Jitter**: Mede a estabilidade da conexão (variação entre pacotes)
- **Velocidade em Tempo Real**: Gauge animado mostrando a velocidade atual durante o teste

### 🎨 Interface Moderna
- Design dark mode com gradientes e glassmorphism
- Title bar customizada sem bordas nativas (frameless window)
- Animações suaves e transições fluidas
- Gauge visual dinâmico que reage à velocidade
- Layout responsivo e centralizado

### ⚙️ Arquitetura
- **Teste em fases sequenciais**: Latência → Download → Upload
- **Barra de progresso** com indicador visual por fase
- **Resultados persistentes** com cards organizados
- **Botão "Repetir Teste"** para novos testes sem reiniciar

### 📦 Distribuição
- **Instalador NSIS** completo com assistente de instalação e opção de escolher diretório
- Ícone personalizado e atalho no menu Iniciar configuráveis

---

## 📥 Downloads

### Releases

| Versão | Tipo | Plataforma | Tamanho | Data |
|--------|------|------------|---------|------|
| [1.0.0](https://github.com/Karkoff/InternetVelocity/releases/tag/v1.0.0) | Instalador (.exe) | Windows 11 | ~72 MB | Set 2026 |

### Links Diretos

- 📦 **[Internet Velocity Setup 1.0.0.exe](https://github.com/Karkoff/InternetVelocity/releases/download/v1.0.0/Internet-Velocity-Setup-1.0.0.exe)** — Instalador com assistente NSIS

---

## 🛠️ Desenvolvimento

### Pré-requisitos
- [Node.js](https://nodejs.org/) 18+ 
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Karkoff/InternetVelocity.git
cd InternetVelocity

# Instale as dependências
npm install
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o app em modo desenvolvimento (Vite HMR) |
| `npm run build` | Compila TypeScript e gera build de produção |
| `npm run build:electron` | Build completo + empacotamento Electron (.exe) |
| `npm run preview` | Pré-visualiza o build de produção no navegador |

### Estrutura do Projeto

```
InternetVelocity/
├── electron/              # Configuração do processo principal (Electron)
├── public/                # Assets estáticos (ícones, screenshots)
├── release/               # Builds empacotados (.exe)
│   ├── Internet-Velocity-Setup-1.0.0.exe
│   └── win-unpacked/      # Versão unpacked para debug
├── src/
│   ├── components/        # Componentes React (Gauge, Cards, ProgressBar)
│   ├── services/          # Lógica dos testes (download, upload, latência)
│   ├── types.ts           # Definições de tipos TypeScript
│   └── App.tsx            # Componente principal
├── dist-electron/         # Processo Electron compilado
├── electron-builder.yml   # Configuração do builder
└── vite.config.ts         # Configuração do Vite + plugins Electron
```

---

## 📸 Screenshots

### Resultado do Teste

![Resultado](public/screenshot.png)

*Interface principal exibindo Download, Upload e Latência com métricas detalhadas.*

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

---

<div align="center">

**Feito com ⚡ por [Karkoff](https://github.com/Karkoff)**

</div>
