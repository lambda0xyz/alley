import { useAuth } from '../context/AuthContext'

export default function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button onClick={signOut} style={{ cursor: 'pointer' }}>
      Sign out
    </button>
  )
}