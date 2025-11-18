import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { hasAuthTokenInCookies } from '@/lib/cookieUtils'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Checks if there's an auth token in localStorage (Supabase's default storage)
 */
function hasAuthTokenInStorage(): boolean {
  if (typeof window === 'undefined') return false

  try {
    // Check localStorage for Supabase auth tokens
    // Supabase stores tokens with keys like: sb-<project-ref>-auth-token
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
        const value = localStorage.getItem(key)
        if (value && value.length > 0) {
          return true
        }
      }
    }
  } catch (error) {
    // localStorage might be disabled or unavailable
    console.warn('Failed to check localStorage for auth token:', error)
  }

  return false
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [verificationTimeout, setVerificationTimeout] = useState(false)

  // Check for tokens in both cookies and localStorage
  const hasTokenInCookies = hasAuthTokenInCookies()
  const hasTokenInStorage = hasAuthTokenInStorage()
  const hasToken = hasTokenInCookies || hasTokenInStorage

  // If we have a token but no session, wait a bit for session to load
  useEffect(() => {
    if (hasToken && !session && !loading) {
      const timer = setTimeout(() => {
        setVerificationTimeout(true)
      }, 2000) // Wait 2 seconds for session to load

      return () => clearTimeout(timer)
    } else {
      setVerificationTimeout(false)
    }
  }, [hasToken, session, loading])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-muted-foreground">Loading workspace...</p>
      </div>
    )
  }

  // If we have a session, allow access (session is the source of truth)
  if (session) {
    return <>{children}</>
  }

  // If we have a token but no session yet, wait for session to load
  if (hasToken && !session && !verificationTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-muted-foreground">Verifying session...</p>
      </div>
    )
  }

  // If no token found or verification timed out, redirect to login
  if (!hasToken || verificationTimeout) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  // Fallback: redirect to login
  return <Navigate to="/" replace state={{ from: location }} />
}


