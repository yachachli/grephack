export type Confidence = 'high' | 'medium' | 'low'
export type ForecastStatus = 'ready' | 'watch' | 'urgent' | 'needs-sample' | 'missing-target' | 'harvested'

export interface Forecast {
  blockCode: string
  vineyard: string
  variety: string
  region: string | null
  winery: string | null
  acres: number | null
  operationalStatus: 'pending' | 'in_progress' | 'harvested' | null
  targetMin: number
  targetMax: number | null
  latestBrix: number
  latestSampleDate: string
  recentSlopePerDay: number | null
  historicalSlopePerDay: number | null
  slopeSource: string
  estimatedSlopePerDay: number | null
  projectedStart: string | null
  projectedEnd: string | null
  pointEstimate: string | null
  confidence: Confidence
  status: ForecastStatus
  sampleCount: number
  explanation: string
}

export interface BrixSample {
  blockCode: string
  vineyard: string
  variety: string
  region: string | null
  winery: string | null
  season: number
  date: string
  brix: number
  sourceFile: string
  sheet: string
  rowNumber: number
}

export interface DataStatus {
  loadedAt: string
  generatedAt: string | null
  files: Array<{ file: string; loaded: boolean; records: number; message?: string }>
  currentSeasonBlocks: number
  currentSeasonSamples: number
  historicalSamples: number
  unmappedCurrentSamples: number
  blocksWithoutTargets: number
  warnings: string[]
}

export interface ForecastDetail {
  forecast: Forecast
  history: BrixSample[]
}
