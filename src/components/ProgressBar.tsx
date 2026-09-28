interface ProgressBarProps {
  progress: number
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="w-full">
      {/* Progress bar background */}
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        {/* Progress fill */}
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress text */}
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-gray-500">0%</span>
        <span className="text-xs text-blue-400 font-medium">{Math.round(progress)}%</span>
        <span className="text-xs text-gray-500">100%</span>
      </div>
    </div>
  )
}
