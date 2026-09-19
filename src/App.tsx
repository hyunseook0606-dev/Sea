import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { BrandLanding } from './BrandLanding'
import { Shell } from './Shell'
import { PacePage, PaceProvider } from './pace/Workspace'
import { ProcessDemo } from './pace/ProcessDemo'

function WorkspaceShell() {
  return (
    <PaceProvider>
      <Shell />
    </PaceProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BrandLanding />} />
        <Route path="/flow" element={<ProcessDemo />} />
        <Route path="/app" element={<WorkspaceShell />}>
          <Route index element={<PacePage view="dashboard" />} />
          <Route path="documents" element={<PacePage view="documents" />} />
          <Route path="agent" element={<PacePage view="agent" />} />
          <Route path="review" element={<PacePage view="review" />} />
          <Route path="twin" element={<PacePage view="twin" />} />
          <Route path="evidence" element={<PacePage view="evidence" />} />
          <Route path="verify" element={<PacePage view="verify" />} />
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
