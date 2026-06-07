import { useAuth } from '../context/AuthContext'

export default function SignOutButton() {
  const { signOut } = useAuth()
  return (
    <button className="btn-signout" onClick={signOut}>
      Sign out
    </button>
  )
}
