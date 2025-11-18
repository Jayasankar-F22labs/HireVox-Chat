/**
 * Utility functions for checking authentication tokens in cookies
 */

import { API_ORIGIN } from '@/config/api'

/**
 * Gets a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)

  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }

  return null
}

/**
 * Checks if a Supabase auth token exists in cookies
 * Supabase stores tokens with pattern: sb-<project-ref>-auth-token
 * Also checks for access_token and refresh_token patterns
 */
export function hasAuthTokenInCookies(): boolean {
  if (typeof document === 'undefined') return false

  // Check for Supabase auth token cookie pattern
  const cookies = document.cookie.split(';')
  
  for (const cookie of cookies) {
    const trimmed = cookie.trim()
    const [name, value] = trimmed.split('=')
    
    if (!name || !value) continue
    
    // Check for Supabase auth token pattern (sb-*-auth-token)
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      if (value && value.length > 0) {
        return true
      }
    }
    
    // Also check for access_token and refresh_token in Supabase cookies
    if (name.startsWith('sb-') && (name.includes('access_token') || name.includes('refresh_token'))) {
      if (value && value.length > 0) {
        return true
      }
    }
  }

  return false
}

/**
 * Gets all Supabase-related cookies
 */
export function getSupabaseCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {}

  const cookies: Record<string, string> = {}
  const cookieArray = document.cookie.split(';')

  for (const cookie of cookieArray) {
    const trimmed = cookie.trim()
    if (trimmed.startsWith('sb-')) {
      const [name, ...valueParts] = trimmed.split('=')
      if (name && valueParts.length > 0) {
        cookies[name] = valueParts.join('=')
      }
    }
  }

  return cookies
}

/**
 * Sets a cookie securely
 * For cross-origin requests, use sameSite: 'none' and secure: true
 */
export function setCookie(name: string, value: string, days?: number, options?: { secure?: boolean; sameSite?: 'strict' | 'lax' | 'none' }): void {
  if (typeof document === 'undefined') return

  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = `; expires=${date.toUTCString()}`
  }

  // For cross-origin requests, we need sameSite: 'none' and secure: true
  // Check if we're making requests to a different origin
  let isCrossOrigin = false
  try {
    isCrossOrigin = window.location.origin !== new URL(API_ORIGIN).origin
  } catch {
    // If URL parsing fails, assume same origin
    isCrossOrigin = false
  }
  
  // Use secure flag if explicitly requested OR if sameSite is 'none' (required by browsers)
  const useSecure = options?.secure || options?.sameSite === 'none' || isCrossOrigin
  const secure = useSecure ? '; secure' : ''
  
  // Default to 'none' for cross-origin, 'lax' for same-origin
  const sameSiteValue = options?.sameSite || (isCrossOrigin ? 'none' : 'lax')
  const sameSite = `; samesite=${sameSiteValue}`
  const path = '; path=/'

  // Encode the value to handle special characters
  const encodedValue = encodeURIComponent(value)
  const cookieString = `${name}=${encodedValue}${expires}${path}${secure}${sameSite}`
  
  document.cookie = cookieString
  
  // Verify cookie was set
  const cookieValue = getCookie(name)
  if (cookieValue !== value) {
    console.warn(`Failed to set cookie: ${name}. Expected: ${value}, Got: ${cookieValue}`)
    console.warn(`Cookie string: ${cookieString}`)
  }
}

/**
 * Removes a cookie
 */
export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

/**
 * Gets the auth token from cookies
 */
export function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';')
  
  for (const cookie of cookies) {
    const trimmed = cookie.trim()
    const [name, value] = trimmed.split('=')
    
    if (!name || !value) continue
    
    // Check for Supabase auth token pattern (sb-*-auth-token)
    if (name.startsWith('sb-') && name.includes('-auth-token')) {
      return value
    }
    
    // Also check for access_token
    if (name.startsWith('sb-') && name.includes('access_token')) {
      return value
    }
  }

  return null
}

