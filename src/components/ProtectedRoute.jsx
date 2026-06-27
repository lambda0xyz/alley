import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// adminOnly: if true, also checks is_admin and redirects artists away.
// On an artist route the reverse holds — admins have no inventory of their own
// here, so send them back to their own dashboard.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { session, isAdmin, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    // Don't render anything or redirect until we know the auth state
    return null
  }

  if (!session) {
    // If trying to access /admin, send to admin login
    const isAdminRoute = location.pathname.startsWith('/admin')
    return <Navigate to={isAdminRoute ? '/admin/login' : '/login'} replace />
  }

  if (adminOnly && !isAdmin) {
    // Logged in but not an admin — send them to their own dashboard
    return <Navigate to="/artist" replace />
  }

  if (!adminOnly && isAdmin) {
    // Admin on an artist route — nothing for them to do here, bounce to /admin
    return <Navigate to="/admin" replace />
  }

  return children
}
