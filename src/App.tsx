import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BrandLanding } from './BrandLanding'
import { Shell } from './Shell'
import { CommandCenter } from './views/CommandCenter'
import { VerifyPage } from './views/VerifyPage'
import { ExceptionWorkspace } from './views/ExceptionWorkspace'
import { ScheduleInbox } from './views/ScheduleInbox'
import {
  ApprovalsPage,
  AuditPage,
  DataSourcesPage,
  ExceptionsList,
  HistoryPage,
  RulesPage,
  SettingsPage,
  VoyagesPage,
  FavoritesPage,
} from './views/pages'
import { BoardPage, PartiesPage, TerminalsPage, VesselsPage, VoyageDetailPage } from './views/masters'
import { useSeaStore } from './store'

function ToExceptionVoucher() {
  const last = useSeaStore((s) => s.exceptions[0])
  return <Navigate to={last ? `/app/exceptions/${last.id}` : '/app/exceptions'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BrandLanding />} />
        <Route path="/app" element={<Shell />}>
          <Route index element={<CommandCenter />} />
          <Route path="verify" element={<VerifyPage />} />
          <Route path="effects" element={<Navigate to="/app/verify" replace />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="voyages" element={<VoyagesPage />} />
          <Route path="voyages/:id" element={<VoyageDetailPage />} />
          <Route path="board" element={<BoardPage />} />
          <Route path="vessels" element={<VesselsPage />} />
          <Route path="parties" element={<PartiesPage />} />
          <Route path="terminals" element={<TerminalsPage />} />
          <Route path="inbox" element={<ScheduleInbox />} />
          <Route path="exceptions" element={<ExceptionsList />} />
          <Route path="exceptions/:id" element={<ExceptionWorkspace />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="sources" element={<DataSourcesPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="rules" element={<RulesPage />} />
          <Route path="agent" element={<Navigate to="/app/history" replace />} />
          <Route path="users" element={<Navigate to="/app/settings" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="workflows" element={<Navigate to="/app/rules" replace />} />
          <Route path="intelligence" element={<Navigate to="/app/rules" replace />} />
          <Route path="extraction" element={<ToExceptionVoucher />} />
          <Route path="context" element={<ToExceptionVoucher />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
