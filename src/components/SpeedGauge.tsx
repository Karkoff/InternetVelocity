import type { TestPhase } from '../types'

interface SpeedGaugeProps {
  speed: number
  phase: TestPhase
  isRunning: boolean
}

export default function SpeedGauge({ speed, phase, isRunning }: SpeedGaugeProps) {
  const radius = 120
  const strokeWidth = 8
  const normalizedRadius = radius - strokeWidth / 2
  
  // Circumference for the gauge (half circle)
  const circumference = normalizedRadius * Math.PI
  const maxSpeed = phase === 'upload' ? 100 : 200 // Different scale for upload vs download
  
  // Calculate arc length based on speed
  const progress = Math.min(speed / maxSpeed, 1)
  const strokeDashoffset = circumference - (progress * circumference)
  
  const getPhaseLabel = (): string => {
    switch (phase) {
      case 'idle': return 'Pronto'
      case 'latency': return 'Testando latência...'
      case 'download': return 'Download'
      case 'upload': return 'Upload'
      case 'complete': return 'Concluído'
    }
  }

  const getPhaseColor = (): string => {
    switch (phase) {
      case 'idle': return '#4b5563'
      case 'latency': return '#a855f7'
      case 'download': return '#3b82f6'
      case 'upload': return '#06b6d4'
      case 'complete': return '#10b981'
    }
  }

  const getColor = (): string => {
    if (speed < 10) return '#ef4444'
    if (speed < 50) return '#f59e0b'
    if (speed < 100) return '#3b82f6'
    return '#10b981'
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* SVG Gauge */}
      <svg
        width={radius * 2}
        height={radius + 40}
        viewBox={`0 0 ${radius * 2} ${radius + 40}`}
        className="drop-shadow-lg"
      >
        {/* Background arc (half circle) */}
        <path
          d={`M ${normalizedRadius} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - normalizedRadius} ${radius}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        {(isRunning || phase === 'complete') && (
          <path
            d={`M ${normalizedRadius} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - normalizedRadius} ${radius}`}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        )}

        {/* Center text */}
        <text
          x="50%"
          y={radius - 10}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          style={{ fontSize: '36px', fontWeight: 700 }}
        >
          {isRunning || phase === 'complete' ? speed.toFixed(1) : '--'}
        </text>

        <text
          x="50%"
          y={radius + 20}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#94a3b8"
          style={{ fontSize: '14px' }}
        >
          Mbps
        </text>
      </svg>

      {/* Phase label */}
      <div className="mt-2 text-center">
        <span 
          className="text-sm font-medium px-3 py-1 rounded-full"
          style={{ color: getPhaseColor() }}
        >
          {getPhaseLabel()}
        </span>
      </div>

      {/* Decorative dots */}
      {!isRunning && phase === 'idle' && (
        <div className="flex gap-2 mt-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gray-600"
            />
          ))}
        </div>
      )}
    </div>
  )
}
