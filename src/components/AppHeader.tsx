import { ChevronDown, Menu, Search } from 'lucide-react'

export function AppHeader({ query, onQueryChange, onMenu }: {
  query: string
  onQueryChange: (value: string) => void
  onMenu: () => void
}) {
  return <header className="app-header">
    <button className="app-header-menu" onClick={onMenu} aria-label="Open navigation"><Menu /></button>
    <div className="app-header-search"><Search size={18} /><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search vineyards, blocks, varieties..." /></div>
    <button className="app-header-season">2026 Harvest <ChevronDown size={14} /></button>
  </header>
}
