import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './contexts/auth-context'
import { DataProvider } from './contexts/data-context'
import Layout from './components/Layout'

import Login from './pages/Login'
import NotFound from './pages/NotFound'

// Patient Pages
import PatientDashboard from './pages/patient/Dashboard'
import RegisterMeal from './pages/patient/RegisterMeal'
import History from './pages/patient/History'
import Profile from './pages/patient/Profile'

// Nutri Pages
import NutriDashboard from './pages/nutri/Dashboard'
import PatientsList from './pages/nutri/PatientsList'
import PatientDetail from './pages/nutri/PatientDetail'
import Alerts from './pages/nutri/Alerts'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Login />} />

              {/* Patient Routes */}
              <Route path="/patient" element={<PatientDashboard />} />
              <Route path="/patient/register" element={<RegisterMeal />} />
              <Route path="/patient/history" element={<History />} />
              <Route path="/patient/profile" element={<Profile />} />

              {/* Nutri Routes */}
              <Route path="/nutri" element={<NutriDashboard />} />
              <Route path="/nutri/patients" element={<PatientsList />} />
              <Route path="/nutri/patients/:id" element={<PatientDetail />} />
              <Route path="/nutri/alerts" element={<Alerts />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
