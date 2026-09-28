interface ResultCardProps {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
  color: 'blue' | 'cyan' | 'green'
}

const colorMap = {
  blue: { bg: 'from-blue-600/20 to-blue-900/10', border: 'border-blue-500/30', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
  cyan: { bg: 'from-cyan-600/20 to-cyan-900/10', border: 'border-cyan-500/30', text: 'text-cyan-400', iconBg: 'bg-cyan-500/20' },
  green: { bg: 'from-green-600/20 to-green-900/10', border: 'border-green-500/30', text: 'text-green-400', iconBg: 'bg-green-500/20' },
}

export default function ResultCard({ icon, label, value, unit, color }: ResultCardProps) {
  const colors = colorMap[color]

  return (
    <div className={`flex flex-col items-center p-4 rounded-xl bg-gradient-to-br ${colors.bg} 
                     border ${colors.border} backdrop-blur-sm transition-all duration-300 hover:scale-105`}>
      {/* Icon */}
      <div className={`${colors.iconBg} p-2 rounded-lg mb-3 ${colors.text}`}>
        {icon}
      </div>

      {/* Label */}
      <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</span>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${colors.text}`}>{value}</span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  )
}
