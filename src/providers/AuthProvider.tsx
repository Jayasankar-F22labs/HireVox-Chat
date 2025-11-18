import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { API_ORIGIN } from '@/config/api'
import { setCookie } from '@/lib/cookieUtils'
import { supabase } from '@/lib/supabaseClient'

type AuthContextValue = {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session ?? null)
          // Set cookie when session is loaded
          if (data.session?.access_token) {
            setAuthTokenCookie(data.session.access_token)
          }
        }
      })
      .finally(() => mounted && setLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      // Set cookie when session changes
      if (nextSession?.access_token) {
        setAuthTokenCookie(nextSession.access_token)
      }
    })

    // Helper function to set auth token in cookies
    function setAuthTokenCookie(accessToken: string) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
        const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
        
        // Check if API URL is different origin (for cross-origin requests)
        const isCrossOrigin = window.location.origin !== new URL(API_ORIGIN).origin
        
        const cookieName = `sb-${projectRef}-auth-token`
        setCookie(
          cookieName,
          accessToken,
          7,
          {
            secure: isCrossOrigin || window.location.protocol === 'https:',
            sameSite: isCrossOrigin ? 'none' : 'lax',
          }
        )

        // Also set generic auth token
        setCookie(
          'auth_token',
          accessToken,
          7,
          {
            secure: isCrossOrigin || window.location.protocol === 'https:',
            sameSite: isCrossOrigin ? 'none' : 'lax',
          }
        )
      } catch (error) {
        console.error('Failed to set auth token cookie:', error)
      }
    }

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


