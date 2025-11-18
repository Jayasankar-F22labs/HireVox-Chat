import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { AuthGuard } from '@/components/auth/AuthGuard'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/providers/AuthProvider'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/chat/:id?"
            element={
              <AuthGuard>
                <DashboardPage />
              </AuthGuard>
            }
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App


