import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { APP_NAME } from '@/constants/app'
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2]">
        <p className="text-sm text-white/80">Loading...</p>
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
        setCookie(
          cookieName,
          data.session.access_token,
          7, // 7 days expiration
        )

        // Also set a generic auth token cookie for easier access
        setCookie(
          'auth_token',
          data.session.access_token,
          7,
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
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center px-5 py-12">
      <div className="bg-white rounded-3xl shadow-2xl max-w-[700px] w-full p-8 sm:p-12 md:p-16">
        <div className="text-center mb-10">
          <div className="inline-block text-[11px] font-semibold tracking-[2px] uppercase text-[#667eea] bg-[rgba(102,126,234,0.1)] px-5 py-2 rounded-full mb-8">
            {APP_NAME}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a202c] mb-6 leading-tight">
            Describe your ideal hire.<br />We'll help you hire them.
          </h1>
          <p className="text-base sm:text-lg text-[#4a5568] mb-8 leading-relaxed">
            Talk to our AI hiring assistant about your ideal candidate—what skills matter most, what experience you need, and what makes someone successful in this role.
          </p>
        </div>

        <div className="bg-[#f7fafc] rounded-2xl p-6 sm:p-8 mb-8">
          <p className="text-base text-[#2d3748] mb-5 font-medium">
            From there, we'll help you:
          </p>
          
          <div className="space-y-5">
            <div className="flex items-start">
              <span className="text-[#667eea] text-2xl mr-3 leading-none flex-shrink-0">•</span>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-[#1a202c] mb-1">
                  Build the right interview
                </h3>
                <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                  Custom questions that assess what actually matters for success in the role
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <span className="text-[#667eea] text-2xl mr-3 leading-none flex-shrink-0">•</span>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-[#1a202c] mb-1">
                  Source better candidates
                </h3>
                <p className="text-sm sm:text-base text-[#4a5568] leading-relaxed">
                  Targeted job descriptions and outreach strategies that attract qualified talent
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg font-semibold text-[#2d3748] mb-5">
            Get started
          </p>
          <form className="space-y-4" onSubmit={handleVerifyPasscode} noValidate>
            <div className="space-y-2">
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleInputChange}
                onBlur={handleEmailBlur}
                aria-invalid={Boolean(emailError)}
                required
                className="w-full px-5 py-4 text-base text-[#1a202c] placeholder:text-[#718096] border-2 border-[#e2e8f0] rounded-xl outline-none transition-all bg-white focus:border-[#667eea] focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
              />
              {emailError && (
                <p className="text-xs text-red-500 text-left" role="alert">
                  {emailError}
                </p>
              )}
            </div>
            {codeRequested && (
              <div className="space-y-2">
                <input
                  id="passcode"
                  name="passcode"
                  type="text"
                  placeholder="Enter 8-digit code"
                  value={form.passcode}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  pattern="\\d{8}"
                  maxLength={8}
                  required={codeRequested}
                  className="w-full px-5 py-4 text-base text-[#1a202c] placeholder:text-[#718096] border-2 border-[#e2e8f0] rounded-xl outline-none transition-all bg-white focus:border-[#667eea] focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]"
                />
                <p className="text-xs text-[#718096] text-left">
                  Enter the latest code from your inbox. Codes expire quickly, so request a new one if needed.
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleRequestPasscode}
                disabled={requestingCode || !canRequestPasscode}
                className="w-full sm:flex-1 px-5 py-4 text-base font-semibold text-white bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl cursor-pointer transition-all shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.5)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {requestingCode
                  ? 'Sending...'
                  : codeRequested
                    ? 'Resend passcode'
                    : 'Send passcode'}
              </button>
              {codeRequested && (
                <button
                  type="submit"
                  disabled={verifyingCode}
                  className="w-full sm:flex-1 px-5 py-4 text-base font-semibold text-white bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl cursor-pointer transition-all shadow-[0_4px_14px_rgba(102,126,234,0.4)] hover:translate-y-[-2px] hover:shadow-[0_6px_20px_rgba(102,126,234,0.5)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {verifyingCode ? 'Verifying...' : 'Verify passcode'}
                </button>
              )}
            </div>
            {!codeRequested && (
              <p className="text-sm text-[#718096]">
                We'll email you an 8-digit code once you provide a valid address.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}


