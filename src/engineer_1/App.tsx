import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3, CalendarDays, Grape, Sprout, Truck,
} from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { AppSidebar } from '../components/AppSidebar'
import summary from '../../engineer_1/generated/dashboard_summary.json'
import './styles.css'

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const varieties: Record<string, string> = {
  AG: 'Aglianico', AL: 'Albariño', BA: 'Barbera', CB: 'Cabernet',
  CH: 'Chardonnay', CS: 'Cabernet Sauvignon', ME: 'Merlot',
  PG: 'Pinot Grigio', PN: 'Pinot Noir', SB: 'Sauvignon Blanc', ZN: 'Zinfandel',
}
function Metric({ label, value, note, icon: Icon }: {
  label: string
  value: string
  note: string
  icon: typeof Sprout
}) {
  return <div className="e1-metric"><div><span>{label}</span><Icon size={18} /></div><b>{value}</b><small>{note}</small></div>
}

export default function App() {
  const [mobile, setMobile] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const blocks = useMemo(() => summary.blocks.filter(block => {
    const text = `${block.vineyard_name} ${block.subblock_code} ${block.variety} ${block.region}`.toLowerCase()
    return text.includes(query.toLowerCase()) && (status === 'all' || block.status === status)
  }), [query, status])
  const p = summary.portfolio

  useEffect(() => {
    if (window.location.hash === '#blocks') {
      requestAnimationFrame(() => document.getElementById('block-status')?.scrollIntoView())
    }
  }, [])
  const asOf = new Date(`${summary.as_of_date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return <div className="e1-shell">
    <AppSidebar active={window.location.hash === '#blocks' ? 'blocks' : 'overview'} mobile={mobile} onClose={() => setMobile(false)} />

    <main>
      <AppHeader query={query} onQueryChange={setQuery} onMenu={() => setMobile(true)} />
      <div className="e1-content">
        <div className="e1-title"><div><p>STATUS & OPERATIONS</p><h1>Harvest overview</h1><span>Workbook status through {asOf}</span></div><div className="e1-live"><i />Normalized from 7 source files</div></div>
        <section className="e1-metrics">
          <Metric label="Acres picked" value={number.format(p.acres_picked)} note={`${decimal.format(p.progress_pct)}% of current harvest scope`} icon={Sprout} />
          <Metric label="Acres remaining" value={number.format(p.acres_remaining)} note={`${number.format(p.active_scope_acres)} acres currently in scope`} icon={Grape} />
          <Metric label="Counted-block tonnage" value={`${number.format(p.estimated_tons_remaining)} t`} note={`${p.required_trucks_one_trip} truck-loads at ${summary.payload_tons} tons`} icon={Truck} />
          <Metric label="Managed portfolio" value={number.format(p.managed_acres)} note={`${p.tracked_blocks} blocks have harvest row counts`} icon={BarChart3} />
        </section>

        <section className="e1-grid">
          <div className="e1-card e1-regions"><div className="e1-card-title"><div><h2>Progress by region</h2><p>Current 2026 harvest scope</p></div><b>{decimal.format(p.progress_pct)}%</b></div>{summary.by_region.map(region => <div className="e1-region" key={region.key}><div><b>{region.key}</b><span>{number.format(region.acres_picked)} of {number.format(region.total_acres)} acres</span><strong>{region.progress_pct}%</strong></div><div className="e1-bar"><i style={{ width: `${region.progress_pct}%` }} /></div><small>{number.format(region.acres_remaining)} acres remaining · {region.required_trucks_one_trip} counted truck-loads</small></div>)}</div>
          <div className="e1-card e1-attention"><div className="e1-card-title"><div><h2>Planning signals</h2><p>Confirmed operating constraints</p></div></div><div><Truck /><p><b>Order trucks 24 hours ahead</b><span>12 hours is the minimum workable lead time.</span></p></div><div><CalendarDays /><p><b>One truck per planned load</b><span>{summary.payload_tons} tons; one trip per truck for the MVP.</span></p></div><div><Grape /><p><b>{number.format(p.pending_acres)} acres pending</b><span>Winery appointments and target Brix determine release.</span></p></div></div>
        </section>

        <section className="e1-card e1-varieties"><div className="e1-card-title"><div><h2>Progress by variety</h2><p>Decoded from the canonical parent block</p></div></div><div>{summary.by_variety.slice(0, 10).map(item => <article key={item.key}><span>{varieties[item.key] || item.key}</span><b>{item.progress_pct}%</b><div className="e1-bar"><i style={{ width: `${item.progress_pct}%` }} /></div><small>{number.format(item.acres_remaining)} acres left</small></article>)}</div></section>

        <section className="e1-card e1-blocks" id="block-status"><div className="e1-card-title"><div><h2>Block status</h2><p>Latest row-count state, Brix reading, and estimated remaining volume</p></div><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="in_progress">In progress</option><option value="harvested">Harvested</option><option value="pending">Pending</option></select></div><div className="e1-table"><table><thead><tr><th>Vineyard / sub-block</th><th>Region</th><th>Variety</th><th>Picked</th><th>Remaining</th><th>Latest Brix</th><th>Est. tons left</th><th>Truck-loads</th><th>Status</th></tr></thead><tbody>{blocks.map(block => <tr key={`${block.subblock_code}-${block.as_of_date}`}><td><b>{block.vineyard_name}</b><span>{block.subblock_code}</span></td><td>{block.region}</td><td>{varieties[block.variety] || block.variety}</td><td>{block.acres_picked == null ? '—' : decimal.format(block.acres_picked)} ac</td><td>{block.acres_remaining == null ? '—' : decimal.format(block.acres_remaining)} ac</td><td>{block.latest_brix ?? '—'}</td><td>{block.estimated_tons_remaining == null ? '—' : number.format(block.estimated_tons_remaining)}</td><td>{block.required_trucks_one_trip ?? '—'}</td><td><span className={`e1-status ${block.status}`}>{block.status.replace('_', ' ')}</span></td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  </div>
}
