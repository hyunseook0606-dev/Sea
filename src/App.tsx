import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BrandLanding } from './BrandLanding'
import { Shell } from './Shell'
import { PortCheckPage, PortCheckProvider } from './portcheck/LegacyWorkspace'
import { ProcessDemo } from './portcheck/ProcessDemo'

function WorkspaceShell() {
  return (
    <PortCheckProvider>
      <Shell />
    </PortCheckProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BrandLanding />} />
        <Route path="/flow" element={<ProcessDemo />} />
        <Route path="/app" element={<WorkspaceShell />}>
          <Route index element={<PortCheckPage view="dashboard" />} />
          <Route path="documents" element={<PortCheckPage view="documents" />} />
          <Route path="agent" element={<PortCheckPage view="agent" />} />
          <Route path="review" element={<PortCheckPage view="review" />} />
          <Route path="twin" element={<PortCheckPage view="twin" />} />
          <Route path="evidence" element={<PortCheckPage view="evidence" />} />
          <Route path="verify" element={<PortCheckPage view="verify" />} />
          <Route path="inbox" element={<Navigate to="/app/documents" replace />} />
          <Route path="exceptions/*" element={<Navigate to="/app/review" replace />} />
          <Route path="approvals" element={<Navigate to="/app/evidence" replace />} />
          <Route path="rules" element={<Navigate to="/app/twin" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
