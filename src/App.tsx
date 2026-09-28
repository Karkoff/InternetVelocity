import { useState, useCallback } from 'react'
import SpeedGauge from './components/SpeedGauge'
import ResultCard from './components/ResultCard'
import ProgressBar from './components/ProgressBar'
import TitleBar from './components/TitleBar'
import { runLatencyTest } from './services/latencyService'
import { runDownloadTest } from './services/downloadService'
import { runUploadTest } from './services/uploadService'
import type { TestPhase, LatencyResult, DownloadResult, UploadResult } from './types'

export default function App() {
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [currentSpeed, setCurrentSpeed] = useState(0)
  const [latencyResult, setLatencyResult] = useState<LatencyResult | null>(null)
  const [downloadResult, setDownloadResult] = useState<DownloadResult | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  const resetResults = useCallback(() => {
    setLatencyResult(null)
    setDownloadResult(null)
    setUploadResult(null)
    setCurrentSpeed(0)
    setOverallProgress(0)
  }, [])

  const startTest = async () => {
    if (isRunning) return
    
    resetResults()
    setIsRunning(true)
    setPhase('latency')

    try {
      // Phase 1: Latency test (~25%)
      setOverallProgress(0)
      console.log('[SpeedTest] Iniciando teste de latência...')
      const latency = await runLatencyTest()
      setLatencyResult(latency)
      setPhase('download')

      // Phase 2: Download test (~60%)
      console.log('[SpeedTest] Iniciando teste de download...')
      
      const downloadData = await runDownloadTest((progress) => {
        if (progress.phase === 'download') {
          setCurrentSpeed(parseFloat(progress.message?.split(': ')[1]?.split(' Mbps')[0] || '0'))
          setOverallProgress(25 + (progress.progress / 100) * 35)
        } else if (progress.phase === 'upload') {
          setCurrentSpeed(parseFloat(progress.message?.split(': ')[1]?.split(' Mbps')[0] || '0'))
          setOverallProgress(60 + (progress.progress / 100) * 35)
        }
      })
      if (downloadData) {
        setDownloadResult(downloadData)
      }

      // Phase 3: Upload test (~95%)
      console.log('[SpeedTest] Iniciando teste de upload...')
      setPhase('upload')
      
      const uploadData = await runUploadTest((progress) => {
        if (progress.phase === 'download') {
          setCurrentSpeed(parseFloat(progress.message?.split(': ')[1]?.split(' Mbps')[0] || '0'))
          setOverallProgress(25 + (progress.progress / 100) * 35)
        } else if (progress.phase === 'upload') {
          setCurrentSpeed(parseFloat(progress.message?.split(': ')[1]?.split(' Mbps')[0] || '0'))
          setOverallProgress(60 + (progress.progress / 100) * 35)
        }
      })
      if (uploadData) {
        setUploadResult(uploadData)
      }

      setOverallProgress(100)
      setCurrentSpeed(0)
      setPhase('complete')
    } catch (error) {
      console.error('[SpeedTest] Erro:', error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0e1a] text-white">
      {/* Title Bar customizada (Electron frame: false) */}
      <TitleBar version="1.0" />

      {/* Main Content — padding-top compensa a title bar de 32px */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto pt-4">
        {/* Gauge Section */}
        <div className={`mb-8 ${isRunning ? 'gauge-active' : ''}`}>
          <SpeedGauge 
            speed={currentSpeed} 
            phase={phase}
            isRunning={isRunning}
          />
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="w-80 mb-8">
            <ProgressBar progress={overallProgress} />
          </div>
        )}

        {/* Start Button */}
        {!isRunning && phase === 'idle' && (
          <button
            onClick={startTest}
            className="px-12 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full text-lg font-semibold 
                       hover:from-blue-500 hover:to-cyan-400 transition-all duration-300 shadow-lg 
                       hover:shadow-blue-500/25 active:scale-95"
          >
            Iniciar Teste
          </button>
        )}

        {/* Results */}
        {(phase === 'complete' || phase === 'upload') && (
          <div className="grid grid-cols-3 gap-6 mt-4 w-full max-w-2xl">
            {downloadResult && (
              <ResultCard
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
                label="Download"
                value={downloadResult.speedMbps.toFixed(2)}
                unit="Mbps"
                color="blue"
              />
            )}
            {uploadResult && (
              <ResultCard
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                }
                label="Upload"
                value={uploadResult.speedMbps.toFixed(2)}
                unit="Mbps"
                color="cyan"
              />
            )}
            {latencyResult && (
              <ResultCard
                icon={
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                label="Latência"
                value={latencyResult.avgPing.toFixed(1)}
                unit="ms"
                color="green"
              />
            )}
          </div>
        )}

        {/* Detailed stats when complete */}
        {phase === 'complete' && latencyResult && (
          <div className="mt-6 flex gap-8 text-sm text-gray-400">
            <span>Min: {latencyResult.minPing}ms</span>
            <span>Max: {latencyResult.maxPing}ms</span>
            <span>Jitter: {latencyResult.jitter}ms</span>
          </div>
        )}

        {/* Restart button */}
        {phase === 'complete' && (
          <button
            onClick={startTest}
            className="mt-6 px-8 py-3 border border-gray-600 rounded-full text-sm font-medium 
                       hover:border-gray-400 hover:text-white transition-all duration-300"
          >
            Repetir Teste
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-xs text-gray-600">
        Internet Velocity — Teste de velocidade da internet
      </footer>
    </div>
  )
}
