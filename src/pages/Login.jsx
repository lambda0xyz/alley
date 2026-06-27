import { Turnstile } from '@marsidev/react-turnstile'
import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TURNSTILE_SITE_KEY } from '../lib/turnstile'

const PIN_LENGTH = 6

export default function Login() {
  const { signIn, session, isAdmin, isLoading } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState('identifier') // 'identifier' | 'pin'
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const turnstileRef = useRef(null)

  if (!isLoading && session) {
    return <Navigate to={isAdmin ? '/admin' : '/artist'} replace />
  }

  function handleIdentifierSubmit(e) {
    e.preventDefault()
    if (!identifier.trim()) return
    setError(null)
    setStep('pin')
  }

  async function handlePinDigit(digit) {
    if (submitting) return
    const next = pin + digit
    setPin(next)

    if (next.length === PIN_LENGTH) {
      await submitLogin(next)
    }
  }

  function handleBackspace() {
    setPin((p) => p.slice(0, -1))
    setError(null)
  }

  async function submitLogin(fullPin) {
    if (!captchaToken) {
      setError('Verifying you’re human — try again in a moment.')
      setPin('')
      return
    }

    setSubmitting(true)
    setError(null)

    const email = `${identifier.trim().toLowerCase()}@alley.local`
    const { error } = await signIn(email, fullPin, captchaToken)

    if (error) {
      setError('Wrong PIN. Try again.')
      setPin('')
      setSubmitting(false)
      // Turnstile tokens are single-use — get a fresh one for the next attempt.
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    }
    // onAuthStateChange handles the redirect
  }

  function handleBack() {
    setStep('identifier')
    setPin('')
    setError(null)
  }

  return (
    <div className="page-center">
      <div className="page-center-inner">
        <img src="/logo.png" alt="" className="brand-logo" />
        <h1 className="brand-title">alley</h1>

        {step === 'identifier' ? (
          <form
            onSubmit={handleIdentifierSubmit}
            className="form-stack form-narrow"
          >
            <label className="form-label" htmlFor="identifier">
              Your name or table number
            </label>
            <input
              id="identifier"
              className="input input-center"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. table1"
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
            />
            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={!identifier.trim()}
            >
              Continue
            </button>
            <Link to="/admin/login" className="auth-switch">
              …or go to Admin Login
            </Link>
          </form>
        ) : (
          <div className="pin-wrap">
            <p className="form-label">
              PIN for <strong>{identifier}</strong>
            </p>

            <div className="pin-dots">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length presentational dots, never reordered
                  key={i}
                  className={`pin-dot${i < pin.length ? ' pin-dot-filled' : ''}`}
                />
              ))}
            </div>

            {error && <p className="text-error">{error}</p>}

            <div className="pin-pad">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="pin-btn"
                  onClick={() => handlePinDigit(String(n))}
                  disabled={pin.length === PIN_LENGTH || submitting}
                >
                  {n}
                </button>
              ))}
              <button type="button" className="pin-btn" onClick={handleBack}>
                ←
              </button>
              <button
                type="button"
                className="pin-btn"
                onClick={() => handlePinDigit('0')}
                disabled={pin.length === PIN_LENGTH || submitting}
              >
                0
              </button>
              <button
                type="button"
                className="pin-btn"
                onClick={handleBackspace}
                disabled={!pin.length || submitting}
              >
                ⌫
              </button>
            </div>
          </div>
        )}

        <Turnstile
          ref={turnstileRef}
          className="captcha"
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={setCaptchaToken}
          onExpire={() => setCaptchaToken(null)}
          onError={() => setCaptchaToken(null)}
        />
      </div>
    </div>
  )
}
