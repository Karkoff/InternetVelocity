import { useState, useEffect } from 'react'

interface TitleBarProps {
  title?: string
  version?: string
}

// Propriedade vendor-specific do Electron (não está no tipagem padrão do React)
type ElectronStyle = React.CSSProperties & { WebkitAppRegion?: 'drag' | 'no-drag' }

export default function TitleBar({ title = 'Internet Velocity', version }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI?.isMaximized().then(setIsMaximized)
  }, [])

  const toggleMaximize = async () => {
    await window.electronAPI?.maximize()
    setIsMaximized((prev: boolean) => !prev)
  }

  const titleBarStyle: ElectronStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 8px 0 12px',
    backgroundColor: '#0f1923',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    userSelect: 'none' as const,
    zIndex: 1000,
    WebkitAppRegion: 'drag',
  }

  const buttonsStyle = {
    display: 'flex',
    gap: 0,
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties & { WebkitAppRegion?: string }

  return (
    <div className="titlebar" style={titleBarStyle}>
      {/* Lado esquerdo — título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: 13, color: '#e0e0e0', fontWeight: 500 }}>{title}</span>
        {version && (
          <span style={{ fontSize: 11, color: '#666' }}>v{version}</span>
        )}
      </div>

      {/* Lado direito — botões de controle */}
      <div style={buttonsStyle}>
        <WindowButton
          onClick={() => window.electronAPI?.minimize()}
          label="—"
          title="Minimizar"
        />
        <WindowButton
          onClick={toggleMaximize}
          label={isMaximized ? '❐' : '□'}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        />
        <WindowButton
          onClick={() => window.electronAPI?.close()}
          label="✕"
          title="Fechar"
          danger
        />
      </div>
    </div>
  )
}

interface WindowButtonProps {
  onClick: () => void
  label: string
  title: string
  danger?: boolean
}

function WindowButton({ onClick, label, title, danger }: WindowButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      className="window-btn"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        width: 46,
        height: 32,
        border: 'none',
        backgroundColor: hovered
          ? danger ? '#e81123' : '#2a2a2a'
          : 'transparent',
        color: '#fff',
        fontSize: 12,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.1s',
      }}
    >
      {label}
    </button>
  )
}
