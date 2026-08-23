import { useEffect, useState } from 'react'
import OverviewApp from './engineer_1/App'
import PlannerApp from './engineer_2/App'

type Workspace = 'overview' | 'planner'

const workspaceFromHash = (): Workspace =>
  window.location.hash.replace('#', '') === 'planner' ? 'planner' : 'overview'

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(workspaceFromHash)

  useEffect(() => {
    const handleHashChange = () => setWorkspace(workspaceFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return workspace === 'planner' ? <PlannerApp /> : <OverviewApp />
}
