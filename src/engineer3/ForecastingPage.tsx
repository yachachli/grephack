import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, ChevronRight, CircleAlert, CloudSun, DatabaseZap, RefreshCw, Search, X } from 'lucide-react'
import { forecastApi } from './api'
import type { DataStatus, Forecast, ForecastDetail } from './types'
import './styles.css'

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : '—'
const formatRange = (forecast: Forecast) => forecast.projectedStart ? `${formatDate(forecast.projectedStart)}${forecast.projectedEnd ? ` – ${formatDate(forecast.projectedEnd)}` : ''}` : 'Needs review'
const formatTarget = (forecast: Forecast) => forecast.status === 'missing-target' ? 'Not set' : `${forecast.targetMin.toFixed(1)}${forecast.targetMax ? `–${forecast.targetMax.toFixed(1)}` : '+'}°`
const formatSlope = (slope: number | null) => slope === null ? '—' : `${(slope * 7).toFixed(1)}°/wk`

function statusLabel(status: Forecast['status']) {
  return { ready: 'Ready now', watch: 'Forecasted', urgent: 'Review now', 'needs-sample': 'New sample', 'missing-target': 'No target', harvested: 'Harvested' }[status]
}

function ForecastBadge({ forecast }: { forecast: Forecast }) {
  return <span className={`e3-badge ${forecast.status} ${forecast.confidence}`}><i />{statusLabel(forecast.status)}</span>
}

function MiniChart({ detail }: { detail: ForecastDetail }) {
  const samples = detail.history.filter((sample) => sample.season === 2026).sort((a, b) => a.date.localeCompare(b.date))
  if (!samples.length) return <div className="e3-chart-empty">No current-season Brix readings are available for this block.</div>
  const width = 620
  const height = 215
  const padding = { top: 20, right: 22, bottom: 35, left: 38 }
  const targetValues = [detail.forecast.targetMin, detail.forecast.targetMax].filter((value): value is number => value !== null)
  const values = [...samples.map((sample) => sample.brix), ...targetValues]
  const yMin = Math.floor((Math.min(...values) - 1) * 2) / 2
  const yMax = Math.ceil((Math.max(...values) + 1) * 2) / 2
  const start = Date.parse(`${samples[0].date}T00:00:00Z`)
  const end = Math.max(Date.parse(`${samples[samples.length - 1].date}T00:00:00Z`), start + 86_400_000)
  const x = (date: string) => padding.left + ((Date.parse(`${date}T00:00:00Z`) - start) / (end - start)) * (width - padding.left - padding.right)
  const y = (brix: number) => padding.top + ((yMax - brix) / (yMax - yMin)) * (height - padding.top - padding.bottom)
  const points = samples.map((sample) => `${x(sample.date)},${y(sample.brix)}`).join(' ')
  const targetY = y(detail.forecast.targetMin)
  const targetBottom = detail.forecast.targetMax === null ? targetY + 2 : y(detail.forecast.targetMax)
  return <svg className="e3-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Current season Brix history">
    <rect x={padding.left} y={Math.min(targetY, targetBottom)} width={width - padding.left - padding.right} height={Math.abs(targetBottom - targetY) || 3} className="e3-target-band" />
    {[yMin, (yMin + yMax) / 2, yMax].map((value) => <g key={value}><line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} className="e3-grid-line" /><text x={5} y={y(value) + 4} className="e3-axis-label">{value.toFixed(1)}°</text></g>)}
    <polyline points={points} className="e3-chart-line" />
    {samples.map((sample) => <g key={`${sample.date}-${sample.brix}`}><circle cx={x(sample.date)} cy={y(sample.brix)} r="4" className="e3-chart-point" /><title>{`${formatDate(sample.date)} · ${sample.brix.toFixed(1)}° Brix`}</title></g>)}
    <text x={padding.left} y={height - 9} className="e3-axis-label">{formatDate(samples[0].date)}</text>
    <text x={width - padding.right} y={height - 9} className="e3-axis-label e3-axis-right">{formatDate(samples[samples.length - 1].date)}</text>
    <text x={width - padding.right} y={Math.min(targetY, targetBottom) - 7} className="e3-target-label">Target {formatTarget(detail.forecast)}</text>
  </svg>
}

function DetailPanel({ selected, onClose }: { selected: Forecast | null; onClose: () => void }) {
  const [detail, setDetail] = useState<ForecastDetail | null>(null)
  const [error, setError] = useState<{ blockCode: string; message: string } | null>(null)
  useEffect(() => {
    if (!selected) return
    let active = true
    void forecastApi.detail(selected.blockCode)
      .then((result) => { if (active) setDetail(result) })
      .catch((reason: unknown) => { if (active) setError({ blockCode: selected.blockCode, message: reason instanceof Error ? reason.message : 'Could not load Brix history' }) })
    return () => { active = false }
  }, [selected])
  if (!selected) return null
  const selectedDetail = detail?.forecast.blockCode === selected.blockCode ? detail : null
  const selectedError = error?.blockCode === selected.blockCode ? error.message : ''
  return <aside className="e3-detail" aria-label="Forecast details">
    <div className="e3-detail-head"><div><span className="e3-overline">Block forecast</span><h2>{selected.vineyard}</h2><p>{selected.blockCode} · {selected.variety} · {selected.region ?? 'Region not mapped'}</p></div><button className="e3-icon-button" onClick={onClose} aria-label="Close forecast details"><X size={18} /></button></div>
    <div className="e3-detail-badges"><ForecastBadge forecast={selected} /><span className={`e3-confidence ${selected.confidence}`}>{selected.confidence} confidence</span></div>
    {selectedError ? <p className="e3-detail-error">{selectedError}</p> : selectedDetail ? <MiniChart detail={selectedDetail} /> : <div className="e3-chart-empty">Loading Brix history…</div>}
    <dl className="e3-details-grid"><div><dt>Last reading</dt><dd>{selected.latestBrix.toFixed(1)}° <span>{formatDate(selected.latestSampleDate)}</span></dd></div><div><dt>Target range</dt><dd>{formatTarget(selected)}</dd></div><div><dt>Recent rate</dt><dd>{formatSlope(selected.recentSlopePerDay)}</dd></div><div><dt>Est. rate</dt><dd>{formatSlope(selected.estimatedSlopePerDay)}</dd></div><div><dt>Likely ready</dt><dd>{formatRange(selected)}</dd></div><div><dt>Field status</dt><dd>{selected.operationalStatus?.replace('_', ' ') ?? 'No status event'}</dd></div></dl>
    <div className="e3-explanation"><CloudSun size={17} /><div><b>Why this forecast</b><p>{selected.explanation}</p><small>Historical fallback: {selected.slopeSource}. {selected.sampleCount} current-season sample{selected.sampleCount === 1 ? '' : 's'}.</small></div></div>
  </aside>
}

function DataHealth({ dataStatus, onRefresh, refreshing }: { dataStatus: DataStatus | null; onRefresh: () => void; refreshing: boolean }) {
  if (!dataStatus) return null
  const issues = dataStatus.unmappedCurrentSamples + dataStatus.blocksWithoutTargets
  return <section className="e3-health card"><div className="e3-section-title"><div><span className="e3-overline">Normalized Brix source</span><h2>Data health</h2><p>Using Engineer 1’s generated Brix observations and block IDs.</p></div><button className="e3-refresh" onClick={onRefresh} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'e3-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh files'}</button></div><div className="e3-health-metrics"><div><b>{dataStatus.currentSeasonBlocks}</b><span>2026 blocks</span></div><div><b>{dataStatus.currentSeasonSamples.toLocaleString()}</b><span>mapped samples</span></div><div><b>{dataStatus.historicalSamples.toLocaleString()}</b><span>history samples</span></div><div className={issues ? 'warn' : ''}><b>{issues}</b><span>items to review</span></div></div><div className="e3-file-list">{dataStatus.files.map((file) => <span key={file.file} title={file.message}><i className={file.loaded ? 'ok' : 'bad'} />{file.file} <em>{file.loaded ? `${file.records} records` : 'not loaded'}</em></span>)}</div>{issues > 0 && <p className="e3-health-note"><CircleAlert size={15} />{dataStatus.unmappedCurrentSamples} current Brix samples have no canonical block; {dataStatus.blocksWithoutTargets} blocks have no target Brix and cannot receive a timing forecast.</p>}{dataStatus.warnings.slice(0, 2).map((warning) => <p className="e3-health-note subtle" key={warning}><CircleAlert size={15} />{warning}</p>)}</section>
}

export function ForecastingPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null)
  const [selected, setSelected] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')
  const [confidence, setConfidence] = useState('all')

  const fetchData = useCallback(() => Promise.all([forecastApi.list(), forecastApi.status()]), [])
  const load = () => {
    setLoading(true); setError('')
    void fetchData().then(([loadedForecasts, loadedStatus]) => {
      setForecasts(loadedForecasts); setDataStatus(loadedStatus)
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not load the forecasting service')).finally(() => setLoading(false))
  }
  useEffect(() => {
    let active = true
    void fetchData().then(([loadedForecasts, loadedStatus]) => {
      if (active) { setForecasts(loadedForecasts); setDataStatus(loadedStatus) }
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load the forecasting service') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fetchData])
  const regions = useMemo(() => [...new Set(forecasts.map((forecast) => forecast.region).filter((value): value is string => Boolean(value)))].sort(), [forecasts])
  const filtered = useMemo(() => forecasts.filter((forecast) => {
    const text = `${forecast.vineyard} ${forecast.blockCode} ${forecast.variety} ${forecast.winery ?? ''}`.toLowerCase()
    return (!search || text.includes(search.toLowerCase())) && (region === 'all' || forecast.region === region) && (confidence === 'all' || forecast.confidence === confidence)
  }), [forecasts, search, region, confidence])
  const ready = forecasts.filter((forecast) => forecast.status === 'ready' || forecast.status === 'urgent').length
  const watch = forecasts.filter((forecast) => forecast.status === 'watch').length
  const needsAttention = forecasts.filter((forecast) => forecast.status !== 'harvested' && (forecast.status === 'needs-sample' || forecast.status === 'missing-target' || forecast.confidence === 'low')).length
  const refresh = async () => {
    setRefreshing(true)
    try { await forecastApi.refresh(); load() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not refresh workbook data') } finally { setRefreshing(false) }
  }

  return <div className="e3-workspace">
    <div className="e3-page-header"><div><p>Forecasting workspace</p><h1>Ripeness, made actionable.</h1><span>Projected target-Brix windows from current readings and 2022–24 vineyard history.</span></div><div className="e3-model-note"><BarChart3 size={17} /><div><b>Linear Brix model</b><span>Recent slope + historical fallback</span></div></div></div>
    {error && <div className="e3-error"><AlertTriangle size={18} /><div><b>Forecast service unavailable</b><span>{error}. Start the backend with <code>npm run dev:api</code>.</span></div><button onClick={load}>Retry</button></div>}
    <section className="e3-summary"><div className="e3-summary-card ready"><CheckCircle2 /><div><span>Ready or late</span><b>{ready}</b><small>Blocks in or above target range</small></div></div><div className="e3-summary-card watch"><CloudSun /><div><span>Projected next</span><b>{watch}</b><small>Blocks with an active window</small></div></div><div className="e3-summary-card attention"><AlertTriangle /><div><span>Needs attention</span><b>{needsAttention}</b><small>Low confidence, missing target, or sample</small></div></div><div className="e3-summary-card coverage"><DatabaseZap /><div><span>Historical coverage</span><b>{dataStatus ? '3' : '—'} years</b><small>2022–24 used as a baseline</small></div></div></section>
    <DataHealth dataStatus={dataStatus} onRefresh={refresh} refreshing={refreshing} />
    <section className="e3-forecasts card"><div className="e3-section-title"><div><span className="e3-overline">Block-level predictions</span><h2>Forecast queue</h2><p>{loading ? 'Loading workbook forecasts…' : `${filtered.length} of ${forecasts.length} current-season blocks`}</p></div></div><div className="e3-filters"><label className="e3-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search block, vineyard, variety…" /></label><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">All regions</option>{regions.map((value) => <option key={value} value={value}>{value}</option>)}</select><select value={confidence} onChange={(event) => setConfidence(event.target.value)}><option value="all">All confidence</option><option value="high">High confidence</option><option value="medium">Medium confidence</option><option value="low">Low confidence</option></select></div><div className="e3-table-wrap"><table className="e3-table"><thead><tr><th>Vineyard / block</th><th>Variety</th><th>Last Brix</th><th>Target</th><th>Ripening rate</th><th>Likely ready</th><th>Confidence</th><th /></tr></thead><tbody>{!loading && filtered.map((forecast) => <tr key={forecast.blockCode} onClick={() => setSelected(forecast)}><td><b>{forecast.vineyard}</b><span>{forecast.blockCode} · {forecast.region ?? 'Unmapped region'}</span></td><td>{forecast.variety}</td><td><b>{forecast.latestBrix.toFixed(1)}°</b><span>{formatDate(forecast.latestSampleDate)}</span></td><td>{formatTarget(forecast)}</td><td>{formatSlope(forecast.estimatedSlopePerDay)}</td><td><b>{formatRange(forecast)}</b><span>{statusLabel(forecast.status)}</span></td><td><span className={`e3-confidence ${forecast.confidence}`}>{forecast.confidence}</span></td><td><ChevronRight size={17} /></td></tr>)}{!loading && !filtered.length && <tr><td colSpan={8} className="e3-empty-row">No blocks match these filters.</td></tr>}{loading && <tr><td colSpan={8} className="e3-empty-row">Loading forecast records from the workbook service…</td></tr>}</tbody></table></div></section>
    <DetailPanel selected={selected} onClose={() => setSelected(null)} />
  </div>
}
