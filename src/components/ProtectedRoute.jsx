import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// adminOnly: if true, also checks is_admin and redirects artists away
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { session, isAdmin, isLoading } = useAuth()

  if (isLoading) {
    // Don't render anything or redirect until we know the auth state
    return null
  }

  if (!session) {
    if (!session) {
      // If trying to access /admin, send to admin login
      const isAdminRoute = window.location.pathname.startsWith('/admin')
      return <Navigate to={isAdminRoute ? '/admin/login' : '/login'} replace />
    }
  }

  if (adminOnly && !isAdmin) {
    // Logged in but not an admin — send them to their own dashboard
    return <Navigate to="/artist" replace />
  }

  return children
}