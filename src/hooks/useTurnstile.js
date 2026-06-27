import { useCallback, useRef, useState } from 'react'

// Shared Turnstile state for the login pages: the verified token, the widget
// ref, and a reset(). Turnstile tokens are single-use, so after a failed
// sign-in the widget must be reset to fetch a fresh token for the next attempt.
export function useTurnstile() {
  const ref = useRef(null)
  const [token, setToken] = useState(null)

  const reset = useCallback(() => {
    ref.current?.reset()
    setToken(null)
  }, [])

  return { token, setToken, ref, reset }
}
