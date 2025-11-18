/**
 * API Configuration
 * Centralized API URL configuration from environment variables
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hiring-assistant-backend.nhs9sl.easypanel.host/api'

// Extract base URL without /api for origin checking
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

