export type Confidence = 'low' | 'medium' | 'high'

export interface ParentBlock {
  block_id: string
  parent_code: string
  region: string | null
  variety_code: string | null
  total_acres: number
  subblock_count: number
  active_2026: boolean | null
}

export interface VineyardBlock {
  block_id: string
  subblock_id: string
  parent_code: string
  subblock_code: string
  region: string | null
  variety_code: string | null
  vines_per_acre: number | null
  total_vines: number | null
  total_acres: number | null
  active_2026: boolean | null
}

export interface HarvestEvent {
  event_id: string
  observed_at: string
  source_block_code: string
  block_id: string | null
  subblock_id: string | null
  acres_picked: number | null
  acres_remaining: number | null
  acres_picked_since_last_count: number | null
  actual_loads: number | null
  actual_tons: number | null
  observed_tpa: number | null
  payload_tons: number | null
  winery_raw: string | null
}

export interface BlockStatus {
  block_id: string | null
  subblock_id: string | null
  source_block_code: string
  as_of_date: string
  status: 'pending' | 'in_progress' | 'harvested'
  total_acres: number | null
  acres_picked: number | null
  acres_remaining: number | null
  rolling_tpa: number | null
  estimated_tons_remaining: number | null
  estimated_loads_remaining: number | null
  required_trucks_one_trip: number | null
  payload_assumption_tons: number
}

export interface BrixObservation {
  observation_id: string
  season: number
  sampled_at: string
  source_code: string | null
  block_id: string | null
  vineyard_name: string
  variety: string | null
  winery_raw: string | null
  brix: number
  raw_value: string | number
  provenance: string
}

export interface CropEstimate {
  observation_id: string
  block_id: string | null
  source_code: string
  source_block_name: string
  variety: string | null
  observed_at: string | null
  net_acres: number | null
  estimated_tpa: number | null
  estimated_total_tons: number | null
  sample_n: number
  sample_mean_all_vines: number | null
  workbook_average_clusters: number | null
  selected: boolean
}

export interface ReadinessForecast {
  block_id: string
  as_of_date: string
  latest_brix: number
  target_min: number | null
  target_max: number | null
  recent_brix_per_day: number | null
  forecast_window_start: string | null
  forecast_window_end: string | null
  confidence: Confidence
  reason: string
}

export interface DailyLoadPlan {
  plan_date: string
  block_id: string | null
  expected_tons: number | null
  required_loads: number | null
  scheduled_loads: number | null
  load_capacity_gap: number | null
}

export interface BackendBlockCandidate {
  externalId: string
  vineyardName: string
  blockName: string
  variety: string
  region: string
  acres: number
  estimatedTons: number | null
  harvestWindowStart: string | null
  harvestWindowEnd: string | null
  apiReady: boolean
  blockers: string[]
}
