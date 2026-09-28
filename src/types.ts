export interface LatencyResult {
  avgPing: number
  minPing: number
  maxPing: number
  jitter: number
}

export interface DownloadResult {
  speedMbps: number
  durationMs: number
}

export interface UploadResult {
  speedMbps: number
  durationMs: number
}

export type TestPhase = 'idle' | 'latency' | 'download' | 'upload' | 'complete'

export interface SpeedTestProgress {
  phase: TestPhase
  progress: number // 0-100
  message?: string
}
