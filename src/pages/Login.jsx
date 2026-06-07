import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PIN_LENGTH = 4

export default function Login() {
  const { signIn, session, isAdmin, isLoading } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState('identifier') // 'identifier' | 'pin'
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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
    setPin(p => p.slice(0, -1))
    setError(null)
  }

  async function submitLogin(fullPin) {
    setSubmitting(true)
    setError(null)

    const email = `${identifier.trim().toLowerCase()}@alley.local`
    const { error } = await signIn(email, fullPin)

    if (error) {
      setError('Wrong PIN. Try again.')
      setPin('')
      setSubmitting(false)
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
        <h1 className="brand-title">alley</h1>

        {step === 'identifier' ? (
          <form onSubmit={handleIdentifierSubmit} className="form-stack form-narrow">
            <label className="form-label">Your name or table number</label>
            <input
              className="input input-center"
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. table12 or sakura"
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
          </form>
        ) : (
          <div className="pin-wrap">
            <p className="form-label">PIN for <strong>{identifier}</strong></p>

            <div className="pin-dots">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className={`pin-dot${i < pin.length ? ' pin-dot-filled' : ''}`}
                />
              ))}
            </div>

            {error && <p className="text-error">{error}</p>}

            <div className="pin-pad">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button
                  key={n}
                  className="pin-btn"
                  onClick={() => handlePinDigit(String(n))}
                  disabled={pin.length === PIN_LENGTH || submitting}
                >
                  {n}
                </button>
              ))}
              <button className="pin-btn" onClick={handleBack}>←</button>
              <button
                className="pin-btn"
                onClick={() => handlePinDigit('0')}
                disabled={pin.length === PIN_LENGTH || submitting}
              >
                0
              </button>
              <button
                className="pin-btn"
                onClick={handleBackspace}
                disabled={!pin.length || submitting}
              >
                ⌫
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
