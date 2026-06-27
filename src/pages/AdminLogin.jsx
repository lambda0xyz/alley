import { useState } from 'react'
import { Link } from 'react-router-dom'
import TurnstileWidget from '../components/TurnstileWidget'
import { useAuth } from '../context/AuthContext'
import { useRedirectIfAuthed } from '../hooks/useRedirectIfAuthed'
import { useTurnstile } from '../hooks/useTurnstile'

export default function AdminLogin() {
  const { signIn } = useAuth()
  const redirect = useRedirectIfAuthed()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const {
    token: captchaToken,
    setToken: setCaptchaToken,
    ref: turnstileRef,
    reset: resetCaptcha,
  } = useTurnstile()

  if (redirect) return redirect

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await signIn(email, password, captchaToken)

    if (error) {
      setError(error.message)
      setSubmitting(false)
      resetCaptcha()
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
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-error">{error}</p>}
          <TurnstileWidget innerRef={turnstileRef} onToken={setCaptchaToken} />
          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={submitting || !captchaToken}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <Link to="/login" className="auth-switch">
            …or go to Artist Login
          </Link>
        </form>
      </div>
    </div>
  )
}
