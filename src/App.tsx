import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

function ManagePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10">
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
        Chronoflow
      </p>
      <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-white sm:text-7xl">
        Make time visible.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
        Create counters and countdowns, then let them run as a focused presentation.
      </p>
      <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-slate-300 shadow-2xl shadow-cyan-950/20">
        <p className="text-sm font-medium text-white">MVP 1 foundation</p>
        <p className="mt-2 text-sm leading-6">
          The domain and local persistence layers are next. No timers exist yet.
        </p>
      </div>
    </main>
  )
}

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
