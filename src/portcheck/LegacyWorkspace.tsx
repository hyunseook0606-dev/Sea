import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AgentAnalysis, Dashboard, Documents, Evidence, Review, Verification } from './PortCheckApp'
import { COST_ITEMS, EVENTS, PORT_CALL } from './seed'
import { WorkflowFrame, CostSimulation } from './WorkflowFrame'
import type { CostItem, PortEvent } from './types'

type View = 'dashboard' | 'documents' | 'agent' | 'review' | 'twin' | 'evidence' | 'verify'

type WorkspaceState = {
  events: PortEvent[]
  selected: CostItem
  setSelected: (id: string) => void
  toggleEvent: (id: string) => void
  amount: (cost: CostItem) => number
  forecast: number
  variance: number
  reviewCount: number
}

const WorkspaceContext = createContext<WorkspaceState | null>(null)

export function PortCheckProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState(EVENTS)
  const [selectedId, setSelectedId] = useState(COST_ITEMS[2].id)
  const selected = COST_ITEMS.find((cost) => cost.id === selectedId) || COST_ITEMS[0]
  const eventMap = useMemo(() => Object.fromEntries(events.map((event) => [event.id, event])), [events])
  const amount = (cost: CostItem) => cost.baseActualAmount + (cost.eventId && eventMap[cost.eventId]?.enabled ? eventMap[cost.eventId].costImpact : 0)
  const forecast = COST_ITEMS.reduce((sum, cost) => sum + amount(cost), 0)
  const variance = forecast - PORT_CALL.pdaTotal
  const reviewCount = COST_ITEMS.filter((cost) => ['review', 'missing_evidence', 'suspected'].includes(cost.status)).length

  return (
    <WorkspaceContext.Provider
      value={{
        events,
        selected,
        setSelected: setSelectedId,
        toggleEvent: (id) => setEvents((all) => all.map((event) => (event.id === id ? { ...event, enabled: !event.enabled } : event))),
        amount,
        forecast,
        variance,
        reviewCount,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function PortCheckPage({ view }: { view: View }) {
  const workspace = useContext(WorkspaceContext)
  const navigate = useNavigate()
  if (!workspace) throw new Error('PortCheckPage must be rendered inside PortCheckProvider')

  let content: ReactNode
  if (view === 'dashboard') content = <Dashboard forecast={workspace.forecast} variance={workspace.variance} reviewCount={workspace.reviewCount} amount={workspace.amount} onGo={navigate} />
  else if (view === 'documents') content = <Documents />
  else if (view === 'agent') content = <AgentAnalysis />
  else if (view === 'review') content = <Review selected={workspace.selected} onSelect={workspace.setSelected} amount={workspace.amount} />
  else if (view === 'twin') content = <CostSimulation events={workspace.events} onToggle={workspace.toggleEvent} forecast={workspace.forecast} />
  else if (view === 'evidence') content = <Evidence selected={workspace.selected} onSelect={workspace.setSelected} />
  else content = <Verification events={workspace.events} forecast={workspace.forecast} />
  return <WorkflowFrame view={view}>{content}</WorkflowFrame>
}

