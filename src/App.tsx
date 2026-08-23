import { lazy, Suspense, useEffect, useState } from 'react'

const OverviewApp = lazy(() => import('./engineer_1/App'))
const PlannerApp = lazy(() => import('./engineer_2/App'))
const SatelliteApp = lazy(() => import('./enginerr_4/App'))

type Workspace = 'overview' | 'blocks' | 'planner' | 'forecasting' | 'satellite'

const workspaceFromHash = (): Workspace => {
  const hash = window.location.hash.replace('#', '')
  return ['blocks', 'planner', 'forecasting', 'satellite'].includes(hash)
    ? hash as Workspace
    : 'overview'
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(workspaceFromHash)

  useEffect(() => {
    const handleHashChange = () => setWorkspace(workspaceFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return <Suspense fallback={<div className="app-loading">Loading VineFlow…</div>}>
    {workspace === 'planner' || workspace === 'forecasting'
      ? <PlannerApp key={workspace} />
      : workspace === 'satellite'
        ? <SatelliteApp />
        : <OverviewApp key={workspace} />}
  </Suspense>
}
