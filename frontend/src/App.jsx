import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import Navbar from '@/components/layout/Navbar'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import PublicRoute from '@/components/layout/PublicRoute'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import CourseDetailPage from '@/pages/CourseDetailPage'
import GroupDetailPage from '@/pages/GroupDetailPage'
import NotificationsPage from '@/pages/NotificationsPage'
import HistoryPage from '@/pages/HistoryPage'
import client from '@/api/client'

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  )
}

export default function App() {
  // Ping the backend on app load so Render wakes from sleep before the user hits a data page
  useEffect(() => { client.get('/').catch(() => {}) }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public only routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"      element={<Layout><DashboardPage /></Layout>} />
              <Route path="/courses/:id"    element={<Layout><CourseDetailPage /></Layout>} />
              <Route path="/groups/:id"     element={<Layout><GroupDetailPage /></Layout>} />
              <Route path="/notifications"  element={<Layout><NotificationsPage /></Layout>} />
              <Route path="/history"        element={<Layout><HistoryPage /></Layout>} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
