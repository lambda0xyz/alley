import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// On the public login pages, send an already-authenticated user to their
// dashboard (admins to /admin, everyone else to /artist). Returns a <Navigate>
// element to render, or null to stay on the login page. Waits for isLoading so
// a page refresh doesn't flash-redirect before the session/profile resolve.
export function useRedirectIfAuthed() {
  const { session, isAdmin, isLoading } = useAuth()
  if (!isLoading && session) {
    return <Navigate to={isAdmin ? '/admin' : '/artist'} replace />
  }
  return null
}
