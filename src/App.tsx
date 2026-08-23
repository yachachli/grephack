import { useEffect, useState } from 'react'
import OverviewApp from './engineer_1/App'
import PlannerApp from './engineer_2/App'
import SatelliteApp from './enginerr_4/App'

type Workspace = 'overview' | 'planner' | 'satellite'

const workspaceFromHash = (): Workspace => {
  const hash = window.location.hash.replace('#', '')
  return hash === 'planner' || hash === 'satellite' ? hash : 'overview'
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(workspaceFromHash)

  useEffect(() => {
    const handleHashChange = () => setWorkspace(workspaceFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (workspace === 'planner') return <PlannerApp />
  if (workspace === 'satellite') return <SatelliteApp />
  return <OverviewApp />
}
