import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'

import { API_BASE_URL } from '@/config/api'

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
//   withCredentials: true, // Automatically send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - ensures cookies are sent and adds Authorization header
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Note: Browsers automatically send cookies with withCredentials: true
    // We cannot manually set the Cookie header due to browser security restrictions
    // However, we can extract the token and set it in Authorization header as a fallback
    
    if (typeof document !== 'undefined' && document.cookie) {
      // Try to get auth token from cookies
      let authToken: string | null = null

      // Check for generic auth_token cookie first (we set this in LoginPage)
      const authTokenMatch = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
      if (authTokenMatch && authTokenMatch[1]) {
        authToken = decodeURIComponent(authTokenMatch[1])
      } else {
        // Fallback to Supabase auth token pattern
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const trimmed = cookie.trim()
          const [name, value] = trimmed.split('=')
          
          if (!name || !value) continue
          
          // Check for Supabase auth token pattern (sb-*-auth-token)
          if (name.startsWith('sb-') && name.includes('-auth-token')) {
            authToken = decodeURIComponent(value)
            break
          }
          
          // Also check for access_token
          if (name.startsWith('sb-') && name.includes('access_token')) {
            authToken = decodeURIComponent(value)
            break
          }
        }
      }

      // Set Authorization header if token found (many backends prefer this over cookies)
      if (authToken && config.headers) {
        config.headers.Authorization = `Bearer ${authToken}`
        console.log('Authorization header set with token')
      } else {
        console.warn('No auth token found in cookies. Available cookies:', document.cookie)
      }

      // Log cookies for debugging (remove in production)
      if (import.meta.env.DEV) {
        console.log('Cookies available:', document.cookie)
        console.log('Request URL:', config.url)
        console.log('withCredentials:', config.withCredentials)
      }
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  },
)

// Response interceptor - handles errors globally
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    // Handle common error cases
    if (error.response) {
      // Server responded with error status
      const status = error.response.status

      switch (status) {
        case 401:
          // Unauthorized - token might be invalid or expired
          console.error('Unauthorized: Authentication required')
          toast.error('Authentication required', {
            description: 'Your session has expired. Please sign in again.',
          })
          // Optionally redirect to login
          if (typeof window !== 'undefined' && window.location.pathname !== '/') {
            // window.location.href = '/'
          }
          break
        case 403:
          console.error('Forbidden: Access denied')
          toast.error('Access denied', {
            description: 'You do not have permission to perform this action.',
          })
          break
        case 404:
          console.error('Not Found: Resource not found')
          toast.error('Resource not found', {
            description: 'The requested resource could not be found.',
          })
          break
        case 500:
          console.error('Server Error: Internal server error')
          toast.error('Server error', {
            description: 'An internal server error occurred. Please try again later.',
          })
          break
        default:
          console.error(`API Error: ${status}`, error.response.data)
          const errorData = error.response.data as { message?: string } | undefined
          toast.error('Request failed', {
            description: `Error ${status}: ${errorData?.message || 'An error occurred'}`,
          })
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error: No response from server', error.request)
      toast.error('Network error', {
        description: 'Unable to connect to the server. Please check your connection.',
      })
    } else {
      // Something else happened
      console.error('Error:', error.message)
      toast.error('Request failed', {
        description: error.message || 'An unexpected error occurred',
      })
    }

    return Promise.reject(error)
  },
)

export default axiosInstance

