import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const { signIn, session, isAdmin, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && session) {
    return <Navigate to={isAdmin ? '/admin' : '/artist'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="page-center">
      <div className="page-center-inner">
        <h1 className="brand-title">alley</h1>
        <p className="brand-subtitle">Admin</p>
        <form onSubmit={handleSubmit} className="form-stack form-narrow">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-error">{error}</p>}
          <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
