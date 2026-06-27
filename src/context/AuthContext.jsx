import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    // Fetch the profile row for the logged-in user. Defined inside the effect so
    // the mount-only dependency list stays honest (it closes over nothing that changes).
    async function fetchProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }
      return data
    }

    // getSession() checks for an existing session on mount (e.g. page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session) setProfile(await fetchProfile(session.user.id))
    })

    // onAuthStateChange fires on login, logout, and token refresh.
    // This keeps session in sync without any manual polling.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        setProfile(await fetchProfile(session.user.id))
      } else {
        setProfile(null)
      }
    })

    // Clean up the listener when the provider unmounts
    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password, captchaToken) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Two distinct "not settled yet" cases: the initial getSession() hasn't
  // resolved (session still undefined), or we have a session but its profile
  // row is still being fetched. Either one means auth state isn't ready.
  const sessionLoading = session === undefined
  const profileLoading = session !== null && profile === null

  const value = {
    session, // the raw Supabase session (null if logged out)
    profile, // your public.profiles row (has is_admin, display_name)
    isAdmin: profile?.is_admin ?? false,
    isLoading: sessionLoading || profileLoading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook — components call useAuth() instead of useContext(AuthContext) directly.
// Co-located with the provider by design; the only fast-refresh cost is this file
// reloading fully on edit, which is fine for a context module.
// biome-ignore lint/style/useComponentExportOnlyModules: hook is co-located with its provider by design (see note above)
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
