import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ManagePage } from './pages/ManagePage'
import { PresentationPage } from './pages/PresentationPage'
import { AuthProvider } from './features/auth/AuthProvider'
import { SettingsProvider } from './features/timers/SettingsContext'
import { TimerRepositoryProvider } from './features/timers/TimerRepositoryProvider'

function App() {
  return (
    <AuthProvider>
      <TimerRepositoryProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/manage" element={<ManagePage />} />
              <Route path="/view" element={<PresentationPage />} />
              <Route path="*" element={<Navigate to="/manage" replace />} />
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </TimerRepositoryProvider>
    </AuthProvider>
  )
}

export default App
