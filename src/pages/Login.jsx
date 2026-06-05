import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PIN_LENGTH = 4

export default function Login() {
  const { signIn, session, isAdmin, isLoading } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState('identifier') // 'identifier' | 'pin'
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && session) {
    navigate(isAdmin ? '/admin' : '/artist', { replace: true })
    return null
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

    // Auto-submit when PIN reaches full length
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
      return
    }
    // onAuthStateChange handles the redirect
  }

  function handleBack() {
    setStep('identifier')
    setPin('')
    setError(null)
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>alley</h1>

      {step === 'identifier' ? (
        <form onSubmit={handleIdentifierSubmit} style={styles.form}>
          <label style={styles.label}>Your name or table number</label>
          <input
            style={styles.input}
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="e.g. table12 or sakura"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
          />
          <button
            style={styles.continueButton}
            type="submit"
            disabled={!identifier.trim()}
          >
            Continue
          </button>
        </form>
      ) : (
        <div style={styles.pinContainer}>
          <p style={styles.label}>PIN for <strong>{identifier}</strong></p>

          {/* PIN dots */}
          <div style={styles.dots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.dot,
                  background: i < pin.length ? '#000' : 'transparent'
                }}
              />
            ))}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          {/* Number pad */}
          <div style={styles.pad}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button
                key={n}
                style={styles.padButton}
                onClick={() => handlePinDigit(String(n))}
                disabled={pin.length === PIN_LENGTH || submitting}
              >
                {n}
              </button>
            ))}
            <button style={styles.padButton} onClick={handleBack}>←</button>
            <button
              style={styles.padButton}
              onClick={() => handlePinDigit('0')}
              disabled={pin.length === PIN_LENGTH || submitting}
            >
              0
            </button>
            <button
              style={styles.padButton}
              onClick={handleBackspace}
              disabled={!pin.length || submitting}
            >
              ⌫
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline styles — just enough to make the PIN pad usable on mobile.
// Will be replaced with proper styling in a later step.
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    boxSizing: 'border-box',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '32px',
    letterSpacing: '0.1em',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '320px',
  },
  label: {
    fontSize: '0.9rem',
    textAlign: 'center',
    marginBottom: '8px',
  },
  input: {
    padding: '14px',
    fontSize: '1.1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    textAlign: 'center',
  },
  continueButton: {
    padding: '14px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    background: '#000',
    color: '#fff',
    cursor: 'pointer',
  },
  pinContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
    maxWidth: '320px',
  },
  dots: {
    display: 'flex',
    gap: '16px',
    margin: '16px 0',
  },
  dot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid #000',
  },
  error: {
    color: 'red',
    fontSize: '0.85rem',
    margin: 0,
  },
  pad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    width: '100%',
  },
  padButton: {
    padding: '20px',
    fontSize: '1.4rem',
    borderRadius: '8px',
    border: '1px solid #ddd',
    background: '#f9f9f9',
    cursor: 'pointer',
    touchAction: 'manipulation', // prevents 300ms tap delay on mobile
  },
}