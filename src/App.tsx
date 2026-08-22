import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ManagePage } from './pages/ManagePage'
import { PresentationPage } from './pages/PresentationPage'
import { SettingsProvider } from './features/timers/SettingsContext'

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/view" element={<PresentationPage />} />
          <Route path="*" element={<Navigate to="/manage" replace />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  )
}

export default App
