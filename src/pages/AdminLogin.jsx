import { useRef, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import { useAuth } from '../context/AuthContext'
import { TURNSTILE_SITE_KEY } from '../lib/turnstile'

export default function AdminLogin() {
  const { signIn, session, isAdmin, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const turnstileRef = useRef(null)

  if (!isLoading && session) {
    return <Navigate to={isAdmin ? '/admin' : '/artist'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await signIn(email, password, captchaToken)

    if (error) {
      setError(error.message)
      setSubmitting(false)
      // Turnstile tokens are single-use — get a fresh one for the next attempt.
      turnstileRef.current?.reset()
      setCaptchaToken(null)
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
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
          />
          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={submitting || !captchaToken}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <Link to="/login" className="auth-switch">…or go to Artist Login</Link>
        </form>
      </div>
    </div>
  )
}
