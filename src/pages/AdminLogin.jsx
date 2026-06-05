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
    <div style={styles.container}>
      <h1 style={styles.title}>alley</h1>
      <p style={styles.subtitle}>Admin</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoFocus
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.button} type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

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
    marginBottom: '4px',
    letterSpacing: '0.1em',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#888',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '320px',
  },
  input: {
    padding: '14px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
  },
  error: {
    color: 'red',
    fontSize: '0.85rem',
    margin: 0,
  },
  button: {
    padding: '14px',
    fontSize: '1rem',
    borderRadius: '8px',
    border: 'none',
    background: '#000',
    color: '#fff',
    cursor: 'pointer',
  },
}