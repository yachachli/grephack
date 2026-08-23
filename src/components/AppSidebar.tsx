import { CalendarDays, CloudSun, Grape, Layers3, LayoutDashboard, Settings, Sprout, X } from 'lucide-react'

export type AppWorkspace = 'overview' | 'blocks' | 'planner' | 'forecasting' | 'satellite'

const items = [
  { id: 'overview', label: 'Overview', route: 'overview', icon: LayoutDashboard },
  { id: 'blocks', label: 'Block Status', route: 'blocks', icon: Grape },
  { id: 'planner', label: 'Harvest Planner', route: 'planner', icon: CalendarDays },
  { id: 'forecasting', label: 'Forecasting', route: 'forecasting', icon: CloudSun },
  { id: 'satellite', label: 'Satellite Intelligence', route: 'satellite', icon: Layers3 },
] as const

export function AppSidebar({ active, mobile, onClose }: {
  active: AppWorkspace
  mobile: boolean
  onClose: () => void
}) {
  return <div className={`app-sidebar${mobile ? ' open' : ''}`} role="navigation" aria-label="Primary navigation">
    <div className="app-sidebar-brand"><span><Sprout /></span><div><b>VineFlow</b><small>HARVEST OPERATIONS</small></div></div>
    <button className="app-sidebar-close" onClick={onClose} aria-label="Close navigation"><X /></button>
    <nav>{items.map(({ id, label, route, icon: Icon }) =>
      <button className={active === id ? 'active' : ''} key={label} onClick={() => { window.location.hash = route; onClose() }}>
        <Icon size={18} /><span>{label}</span>
      </button>)}</nav>
    <div className="app-sidebar-footer">
      <button><Settings size={18} /><span>Settings</span></button>
      <div className="app-sidebar-profile"><span>JM</span><div><b>Jordan Miller</b><small>Operations Manager</small></div></div>
    </div>
  </div>
}
