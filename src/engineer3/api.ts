import type { DataStatus, Forecast, ForecastDetail } from './types'

const apiBase = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, init)
  const payload = await response.json().catch(() => null) as { data?: T; error?: { message?: string } } | null
  if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? `Forecast API returned ${response.status}`)
  return payload.data
}

export const forecastApi = {
  list: () => request<Forecast[]>('/api/forecasts'),
  detail: (blockCode: string) => request<ForecastDetail>(`/api/forecasts/${encodeURIComponent(blockCode)}`),
  status: () => request<DataStatus>('/api/forecasts/data-status'),
  refresh: () => request<DataStatus>('/api/forecasts/refresh', { method: 'POST' }),
}
