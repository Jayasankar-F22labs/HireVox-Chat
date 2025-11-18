import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_NAME } from '@/constants/app'
import { API_ORIGIN } from '@/config/api'
import { setCookie } from '@/lib/cookieUtils'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/providers/AuthProvider'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hasRedirectedRef = useRef(false)
  const [form, setForm] = useState({ email: '', passcode: '' })
  const [codeRequested, setCodeRequested] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [requestingCode, setRequestingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)

  const trimmedEmail = form.email.trim()
  const canRequestPasscode = emailPattern.test(trimmedEmail)

  // Use user ID for stable comparison instead of session object
  const sessionUserId = session?.user?.id ?? null
  const prevUserIdRef = useRef<string | null>(null)
  const navigateRef = useRef(navigate)

  // Keep navigate ref updated
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  // Redirect to dashboard if session exists - only when loading completes or user ID changes
  useEffect(() => {
    // Skip if still loading
    if (loading) {
      return
    }

    // If we're already on chat or chat with id, don't redirect
    if (location.pathname.startsWith('/chat')) {
      prevUserIdRef.current = sessionUserId
      return
    }

    // Check if user ID changed (user logged in)
    const userIdChanged = prevUserIdRef.current !== sessionUserId

    // If we have a user ID and it changed (or we haven't redirected yet), redirect
    if (sessionUserId && userIdChanged && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true
      prevUserIdRef.current = sessionUserId
      navigateRef.current('/chat', { replace: true })
      return
    }

    // Update the ref
    prevUserIdRef.current = sessionUserId

    // Reset redirect flag if session is lost
    if (!sessionUserId) {
      hasRedirectedRef.current = false
    }
  }, [loading, sessionUserId, location.pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Don't render login form if session exists (redirect will happen via useEffect)
  if (session) {
    return null
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'email' && emailError) {
      setEmailError(null)
    }
  }

  const handleEmailBlur = () => {
    if (!trimmedEmail) {
      setEmailError('Email is required.')
      return
    }
    if (!emailPattern.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailError(null)
  }

  const handleRequestPasscode = async () => {
    if (!trimmedEmail) {
      setEmailError('Email is required.')
      toast.error('Email is required')
      return
    }

    if (!emailPattern.test(trimmedEmail)) {
      setEmailError('Enter a valid email address.')
      toast.error('Please enter a valid email address')
      return
    }

    setRequestingCode(true)
    const { error } = await supabase.auth
      .signInWithOtp({
        email: trimmedEmail,
        options: { shouldCreateUser: false },
      })
      .finally(() => setRequestingCode(false))

    if (error) {
      toast.error('Failed to send passcode', {
        description: error.message,
      })
      return
    }

    toast.success('Passcode sent!', {
      description: 'Check your email inbox for the 8-digit code.',
    })
    setForm((prev) => ({ ...prev, email: trimmedEmail }))
    setEmailError(null)
    setCodeRequested(true)
  }

  const handleVerifyPasscode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!codeRequested) {
      toast.error('Request a passcode first', {
        description: 'Please request a passcode before attempting to verify.',
      })
      return
    }

    setVerifyingCode(true)
    const { data, error } = await supabase.auth
      .verifyOtp({
        email: trimmedEmail,
        token: form.passcode,
        type: 'email',
      })
      .finally(() => setVerifyingCode(false))

    if (error) {
      toast.error('Verification failed', {
        description: error.message,
      })
      return
    }

    // Set auth token in cookies after successful verification
    if (data?.session?.access_token) {
      try {
        // Get the Supabase project reference from the URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
        const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'default'
        
        // Set the auth token cookie with Supabase naming pattern
        const cookieName = `sb-${projectRef}-auth-token`
        
        // For cross-origin API calls, we need sameSite: 'none' and secure: true
        // Check if API URL is different origin
        const isCrossOrigin = window.location.origin !== new URL(API_ORIGIN).origin
        
        setCookie(
          cookieName,
          data.session.access_token,
          7, // 7 days expiration
          {
            secure: isCrossOrigin || window.location.protocol === 'https:', // Required for cross-origin
            sameSite: isCrossOrigin ? 'none' : 'lax', // 'none' required for cross-origin
          }
        )

        // Also set a generic auth token cookie for easier access
        setCookie(
          'auth_token',
          data.session.access_token,
          7,
          {
            secure: isCrossOrigin || window.location.protocol === 'https:',
            sameSite: isCrossOrigin ? 'none' : 'lax',
          }
        )

      } catch (cookieError) {
        console.error('Failed to set auth token in cookies:', cookieError)
        toast.error('Failed to save authentication', {
          description: 'Your session may not persist across page reloads.',
        })
      }
    }

    toast.success('Signed in successfully!', {
      description: 'Redirecting to your chat...',
    })
    setForm((prev) => ({ ...prev, passcode: '' }))
    setCodeRequested(false)
    
    // Redirect to chat after successful login
    setTimeout(() => {
      navigate('/chat', { replace: true })
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-12 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
        <header className="space-y-3 text-center">
          <p className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {APP_NAME}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Sign in to your AI hiring workspace
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            Secure, passwordless access powered by Supabase. Drop in your email,
            grab the 8-digit code, and jump back into crafting job descriptions,
            interview kits, and outreach briefs with Hiring Assistants.
          </p>
        </header>

        <Card className="w-full max-w-md border-white/10 bg-black/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Continue to Hiring Assistants</CardTitle>
            <CardDescription>
              We’ll email you a one-time passcode to verify it’s really you.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleVerifyPasscode} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleInputChange}
                  onBlur={handleEmailBlur}
                  aria-invalid={Boolean(emailError)}
                  required
                />
                {emailError && (
                  <p className="text-xs text-rose-300" role="alert">
                    {emailError}
                  </p>
                )}
              </div>
              {codeRequested && (
                <div className="space-y-2">
                  <Label htmlFor="passcode">Passcode</Label>
                  <Input
                    id="passcode"
                    name="passcode"
                    type="text"
                    placeholder="8-digit code"
                    value={form.passcode}
                    onChange={handleInputChange}
                    inputMode="numeric"
                    pattern="\\d{8}"
                    maxLength={8}
                    required={codeRequested}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the latest code from your inbox. Codes expire quickly, so request a new
                    one if needed.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="w-full"
                  type="button"
                  variant="secondary"
                  onClick={handleRequestPasscode}
                  disabled={requestingCode || !canRequestPasscode}
                >
                  {requestingCode
                    ? 'Sending...'
                    : codeRequested
                      ? 'Resend passcode'
                      : 'Send passcode'}
                </Button>
                {codeRequested && (
                  <Button className="w-full" type="submit" disabled={verifyingCode}>
                    {verifyingCode ? 'Verifying...' : 'Verify passcode'}
                  </Button>
                )}
              </div>
              {!codeRequested && (
                <p className="text-xs text-muted-foreground">
                  We’ll email you an 8-digit code once you provide a valid address.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


