import { useAuth } from '../context/AuthContext'

export default function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button type="button" className="btn-signout" onClick={signOut}>
      Sign out
    </button>
  )
}
