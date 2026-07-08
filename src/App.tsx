import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/auth-context'
import { DataProvider } from './contexts/data-context'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard'
import RegisterMeal from './pages/patient/RegisterMeal'
import History from './pages/patient/History'
import Profile from './pages/patient/Profile'
import Assistant from './pages/patient/Assistant'
import ProfileSetup from './pages/patient/ProfileSetup'

// Nutri Pages
import NutriDashboard from './pages/nutri/Dashboard'
import PatientsList from './pages/nutri/PatientsList'
import PatientDetail from './pages/nutri/PatientDetail'
import Alerts from './pages/nutri/Alerts'
import NutriChat from './pages/nutri/Chat'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<Layout />}>
              {/* Public Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Patient Routes */}
              <Route
                path="/patient"
                element={
                  <ProtectedRoute role="patient">
                    <Outlet />
                  </ProtectedRoute>
                }
              >
                <Route index element={<PatientDashboard />} />
                <Route path="register" element={<RegisterMeal />} />
                <Route path="history" element={<History />} />
                <Route path="assistant" element={<Assistant />} />
                <Route path="profile-setup" element={<ProfileSetup />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Nutri Routes */}
              <Route
                path="/nutri"
                element={
                  <ProtectedRoute role="nutritionist">
                    <Outlet />
                  </ProtectedRoute>
                }
              >
                <Route index element={<NutriDashboard />} />
                <Route path="patients" element={<PatientsList />} />
                <Route path="patients/:id" element={<PatientDetail />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="chat" element={<NutriChat />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
