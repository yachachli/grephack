import { useState } from 'react'
import {
  AlertTriangle, ArrowDown, ArrowUp, CalendarDays, ChevronDown, CircleHelp,
  CloudSun, FileSpreadsheet, Grape, LayoutDashboard, Menu, MoreHorizontal,
  Search, Settings, Sprout, Truck, Upload, X,
} from 'lucide-react'

type Status = 'Ready' | 'Watch' | 'Scheduled' | 'Harvested'

const blocks: { vineyard: string; block: string; variety: string; region: string; acres: number; brix: number; tons: number; window: string; status: Status }[] = [
  { vineyard: 'Smith Vineyard', block: 'A-12', variety: 'Cabernet Sauvignon', region: 'North Bench', acres: 42, brix: 23.8, tons: 160, window: 'Sep 13–15', status: 'Ready' },
  { vineyard: 'Mesa Ridge', block: 'C-04', variety: 'Chardonnay', region: 'East Valley', acres: 28, brix: 22.1, tons: 112, window: 'Sep 15–17', status: 'Scheduled' },
  { vineyard: 'Coyote Run', block: 'B-08', variety: 'Pinot Noir', region: 'West Hills', acres: 35, brix: 21.6, tons: 126, window: 'Sep 18–20', status: 'Watch' },
  { vineyard: 'Los Robles', block: 'D-17', variety: 'Merlot', region: 'South Valley', acres: 51, brix: 24.2, tons: 194, window: 'Sep 12–14', status: 'Ready' },
  { vineyard: 'Stone Creek', block: 'A-03', variety: 'Sauvignon Blanc', region: 'North Bench', acres: 24, brix: 23.4, tons: 88, window: 'Sep 11–12', status: 'Harvested' },
]

const nights = [
  { day: 'MON', date: '11', tons: 180, loads: 9, trucks: 10, state: 'covered' },
  { day: 'TUE', date: '12', tons: 240, loads: 12, trucks: 9, state: 'short' },
  { day: 'WED', date: '13', tons: 220, loads: 11, trucks: 11, state: 'covered' },
  { day: 'THU', date: '14', tons: 150, loads: 8, trucks: 10, state: 'extra' },
  { day: 'FRI', date: '15', tons: 260, loads: 13, trucks: 11, state: 'short' },
]

function Metric({ label, value, note, trend, icon: Icon }: { label: string; value: string; note: string; trend?: 'up' | 'down'; icon: typeof Sprout }) {
  return <div className="metric card">
    <div className="metric-head"><span>{label}</span><span className="icon-box"><Icon size={18} /></span></div>
    <div className="metric-value">{value}</div>
    <div className={`metric-note ${trend || ''}`}>{trend === 'up' && <ArrowUp size={13}/>} {trend === 'down' && <ArrowDown size={13}/>} {note}</div>
  </div>
}

function Badge({ status }: { status: Status }) { return <span className={`badge ${status.toLowerCase()}`}><i />{status}</span> }

export default function App() {
  const [nav, setNav] = useState('Overview')
  const [mobile, setMobile] = useState(false)
  const [toast, setToast] = useState('')
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }

  const navItems = [
    ['Overview', LayoutDashboard], ['Block Status', Grape], ['Harvest Planner', CalendarDays],
    ['Forecasting', CloudSun], ['Fleet & Logistics', Truck], ['Data Sources', FileSpreadsheet],
  ] as const

  return <div className="app-shell">
    <aside className={mobile ? 'open' : ''}>
      <div className="brand"><div className="brand-mark"><Sprout /></div><div><b>VineFlow</b><small>HARVEST OPERATIONS</small></div></div>
      <button className="close-mobile" onClick={() => setMobile(false)}><X /></button>
      <nav>{navItems.map(([label, Icon]) => <button key={label} className={nav === label ? 'active' : ''} onClick={() => { setNav(label); setMobile(false); notify(`${label} workspace selected`) }}><Icon size={19}/>{label}</button>)}</nav>
      <div className="side-bottom">
        <button><CircleHelp size={19}/>Help & support</button><button><Settings size={19}/>Settings</button>
        <div className="profile"><div className="avatar">JM</div><div><b>Jordan Miller</b><span>Operations Manager</span></div><MoreHorizontal size={18}/></div>
      </div>
    </aside>

    <main>
      <header>
        <button className="menu" onClick={() => setMobile(true)}><Menu /></button>
        <div className="search"><Search size={18}/><input placeholder="Search vineyards, blocks, varieties..." /></div>
        <div className="season"><span>Current season</span><button>2025 Harvest <ChevronDown size={15}/></button></div>
        <button className="import" onClick={() => notify('Import workflow ready for spreadsheet connection')}><Upload size={17}/>Import data</button>
      </header>

      <div className="content">
        <div className="page-title"><div><p>Sunday, September 10</p><h1>Good morning, Jordan.</h1><span>Here’s how your harvest operation is shaping up.</span></div><button className="live"><i/>Live data <ChevronDown size={14}/></button></div>

        <section className="metrics">
          <Metric label="Acres picked" value="1,284" note="18.4% from last week" trend="up" icon={Sprout}/>
          <Metric label="Acres remaining" value="2,146" note="62.6% of total acreage" icon={Grape}/>
          <Metric label="Loads remaining" value="428" note="Est. 8,560 tons" icon={Truck}/>
          <Metric label="Harvest progress" value="37.4%" note="On track for Oct 22 finish" trend="up" icon={CalendarDays}/>
        </section>

        <section className="grid-top">
          <div className="card harvest-card">
            <div className="card-title"><div><h2>Harvest progress</h2><p>Acres picked by region</p></div><button>View details</button></div>
            <div className="progress-layout">
              <div className="donut"><div><b>1,284</b><span>of 3,430 acres</span></div></div>
              <div className="region-list">
                {[['North Bench', 68, '512 / 750 ac'], ['East Valley', 42, '378 / 900 ac'], ['West Hills', 31, '248 / 800 ac'], ['South Valley', 15, '146 / 980 ac']].map(([name, pct, val]) => <div key={name as string}><div className="region-label"><span>{name}</span><b>{val}</b></div><div className="bar"><i style={{width: `${pct}%`}}/></div></div>)}
              </div>
            </div>
          </div>
          <div className="card alert-card">
            <div className="card-title"><div><h2>Needs attention</h2><p>Issues affecting this week</p></div><span className="count">3</span></div>
            <div className="alert critical"><AlertTriangle/><div><b>Tuesday is short 3 trucks</b><span>240 tons · 12 loads · 9 trucks</span></div><button onClick={() => notify('Opening Tuesday logistics plan')}>Resolve</button></div>
            <div className="alert warning"><CloudSun/><div><b>Heat spike forecast Thursday</b><span>4 blocks may ripen 1–2 days early</span></div><button onClick={() => notify('Forecast review opened')}>Review</button></div>
            <div className="alert neutral"><FileSpreadsheet/><div><b>3 sugar readings are overdue</b><span>Last updated more than 72 hours ago</span></div><button onClick={() => notify('Data source review opened')}>View</button></div>
          </div>
        </section>

        <section className="card week-card">
          <div className="card-title"><div><h2>This week’s harvest plan</h2><p>Expected volume and truck capacity by night</p></div><button onClick={() => { setNav('Harvest Planner'); notify('Harvest Planner workspace selected') }}>Open planner →</button></div>
          <div className="night-grid">{nights.map(n => <div className={`night ${n.state}`} key={n.day}>
            <div className="night-date"><b>{n.day}</b><span>SEP {n.date}</span></div><strong>{n.tons}<small> tons</small></strong><div className="load-row"><span><Truck size={15}/>{n.loads} loads</span><span>{n.trucks} trucks</span></div>
            <div className="capacity"><i style={{width: `${Math.min(100, n.trucks / n.loads * 100)}%`}}/></div>
            <p>{n.state === 'short' ? <><AlertTriangle size={14}/> Short {n.loads-n.trucks} trucks</> : n.state === 'extra' ? <>2 trucks available</> : <>Capacity covered</>}</p>
          </div>)}</div>
        </section>

        <section className="card blocks-card">
          <div className="card-title"><div><h2>Upcoming blocks</h2><p>Forecasted harvest windows and readiness</p></div><button onClick={() => notify('All vineyard blocks loaded')}>View all blocks →</button></div>
          <div className="table-wrap"><table><thead><tr><th>Vineyard / block</th><th>Variety</th><th>Region</th><th>Acres</th><th>Brix</th><th>Est. tons</th><th>Harvest window</th><th>Status</th></tr></thead><tbody>{blocks.map(b => <tr key={b.block}><td><b>{b.vineyard}</b><span>Block {b.block}</span></td><td>{b.variety}</td><td>{b.region}</td><td>{b.acres}</td><td><b>{b.brix}</b></td><td>{b.tons}</td><td>{b.window}</td><td><Badge status={b.status}/></td></tr>)}</tbody></table></div>
        </section>
        <footer><span>Last synced 2 minutes ago from 5 data sources</span><span><i/>All systems operational</span></footer>
      </div>
    </main>
    {toast && <div className="toast">{toast}</div>}
  </div>
}
