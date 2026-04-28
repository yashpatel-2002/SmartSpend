import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import MainLayout from './components/Layout/MainLayout'
import HomePage from './pages/HomePage'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import Budget from './pages/Budget'
import Categories from './pages/Categories'
import RecurringExpenses from './pages/RecurringExpenses'
import ImportExport from './pages/ImportExport'
import Goals from './pages/Goals'
import Debts from './pages/Debts'
import Insights from './pages/Insights'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Help from './pages/Help'
import Notifications from './pages/Notifications'
import AdvancedAnalytics from './pages/AdvancedAnalytics'
import ForecastPage from './pages/ForecastPage'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }
  
  return user ? children : <Navigate to="/login" />
}

const PublicRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" /> : children
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public home page - THIS IS THE CORRECT ROUTE */}
      <Route path="/" element={<HomePage />} />
      
      {/* Auth routes - redirect to dashboard if logged in */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      
      {/* Dashboard route - separate from MainLayout pattern */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
      </Route>

      {/* All other protected routes with MainLayout */}
      <Route path="/expenses" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Expenses />} />
      </Route>

      <Route path="/reports" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Reports />} />
      </Route>

      <Route path="/budget" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Budget />} />
      </Route>

      <Route path="/categories" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Categories />} />
      </Route>

      <Route path="/recurring" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<RecurringExpenses />} />
      </Route>

      <Route path="/import-export" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<ImportExport />} />
      </Route>

      <Route path="/goals" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Goals />} />
      </Route>

      <Route path="/debts" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Debts />} />
      </Route>

      <Route path="/insights" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Insights />} />
      </Route>

      <Route path="/profile" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Profile />} />
      </Route>

      <Route path="/settings" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Settings />} />
      </Route>

      <Route path="/help" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Help />} />
      </Route>

      <Route path="/notifications" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Notifications />} />
      </Route>

      <Route path="/advanced-analytics" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<AdvancedAnalytics />} />
      </Route>

      <Route path="/forecast" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<ForecastPage />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}