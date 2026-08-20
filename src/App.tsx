import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ManagePage } from './pages/ManagePage'

function PresentationPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
          Presentation View
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">No timers yet</h1>
        <p className="mt-3 text-slate-300">Create a timer from Manage View to begin.</p>
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/view" element={<PresentationPage />} />
        <Route path="*" element={<Navigate to="/manage" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
