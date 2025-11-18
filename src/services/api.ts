/**
 * API Service for making HTTP requests using axios with interceptors
 */

import { API_BASE_URL } from '@/config/api'
import axiosInstance from '@/lib/axiosInstance'
import type { AxiosResponse } from 'axios'

export interface Conversation {
  id?: string
  session_id?: string
  title?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationResponse {
  success: boolean
  session_id: string
  conversation: ConversationMessage[]
}

export interface ApiResponse<T> {
  data: T
  error?: string
}

/**
 * Helper function to extract data from response
 */
function extractData<T>(response: AxiosResponse<T>): T {
  const data = response.data

  // Handle different response formats
  if (Array.isArray(data)) {
    return data
  }

  // If response has a data property
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as any).data
  }

  // If response has a conversations property
  if (data && typeof data === 'object' && 'conversations' in data) {
    return (data as any).conversations
  }

  return data
}

/**
 * Fetches all conversations from the API
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const response = await axiosInstance.get<Conversation[]>('/conversations')
    const data = extractData(response)

    // Ensure we return an array
    if (Array.isArray(data)) {
      return data
    }

    console.warn('Unexpected API response format:', data)
    return []
  } catch (error) {
    console.error('Error fetching conversations:', error)
    throw error
  }
}

/**
 * Fetches a single conversation by ID
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  try {
    const response = await axiosInstance.get<Conversation>(`/conversations/${id}`)
    const data = extractData(response)

    if (data && typeof data === 'object' && 'id' in data) {
      return data as Conversation
    }

    return null
  } catch (error) {
    console.error('Error fetching conversation:', error)
    throw error
  }
}

/**
 * Fetches conversation with messages by ID
 */
export async function getConversationMessages(id: string): Promise<ConversationResponse | null> {
  try {
    const response = await axiosInstance.get<ConversationResponse>(`/conversations/${id}`)
    const data = extractData(response)

    // Handle different response formats
    if (data && typeof data === 'object') {
      // If response has success and conversation fields directly
      if ('success' in data && 'conversation' in data) {
        return data as ConversationResponse
      }
      // If response is wrapped in a data property
      if ('data' in data && typeof (data as any).data === 'object') {
        const innerData = (data as any).data
        if ('success' in innerData && 'conversation' in innerData) {
          return innerData as ConversationResponse
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching conversation messages:', error)
    throw error
  }
}

/**
 * Creates a new conversation
 */
export async function createConversation(title?: string): Promise<Conversation> {
  try {
    const response = await axiosInstance.post<Conversation>('/conversations', { title })
    const data = extractData(response)

    if (data && typeof data === 'object' && 'id' in data) {
      return data as Conversation
    }

    throw new Error('Unexpected response format')
  } catch (error) {
    console.error('Error creating conversation:', error)
    throw error
  }
}

/**
 * Downloads a conversation by ID
 */
export async function downloadConversation(id: string): Promise<void> {
  try {
    const response = await axiosInstance.get(`/conversations/${id}/download`, {
      responseType: 'blob', // Important for file downloads
    })

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition']
    let filename = `conversation-${id}.txt`
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '')
      }
    }

    // Create a blob URL and trigger download
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error downloading conversation:', error)
    throw error
  }
}

/**
 * Sends a message to the chat stream endpoint
 */
export interface ChatStreamRequest {
  message: string
  session_id: string
}

export interface ChatStreamChunk {
  content?: string
  session_id: string
  done?: boolean
}

export type StreamCallback = (chunk: ChatStreamChunk) => void

/**
 * Sends a message to the chat stream endpoint and handles streaming response
 * Uses axiosInstance to build request config, then uses fetch for SSE streaming
 * (axios doesn't support SSE streaming in browser, but we use axiosInstance's config)
 */
export async function sendChatMessage(
  payload: ChatStreamRequest,
  onChunk?: StreamCallback
): Promise<void> {
  try {
    // Build request headers using axiosInstance's interceptor logic
    // We manually apply the same logic that axiosInstance uses for consistency
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Extract auth token using the exact same logic as axiosInstance interceptor
    if (typeof document !== 'undefined' && document.cookie) {
      let authToken: string | null = null

      // Check for generic auth_token cookie first (same as axiosInstance)
      const authTokenMatch = document.cookie.match(/(?:^|;\s*)auth_token=([^;]*)/)
      if (authTokenMatch && authTokenMatch[1]) {
        authToken = decodeURIComponent(authTokenMatch[1])
      } else {
        // Fallback to Supabase auth token pattern (same as axiosInstance)
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const trimmed = cookie.trim()
          const [name, value] = trimmed.split('=')
          if (!name || !value) continue
          if (name.startsWith('sb-') && name.includes('-auth-token')) {
            authToken = decodeURIComponent(value)
            break
          }
          if (name.startsWith('sb-') && name.includes('access_token')) {
            authToken = decodeURIComponent(value)
            break
          }
        }
      }

      // Set Authorization header if token found (same as axiosInstance)
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }
    }

    // Use fetch for SSE streaming (axios doesn't support SSE streaming in browser)
    // but with axiosInstance's configuration (headers, auth, credentials)
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers,
      credentials: 'include', // Same as axiosInstance withCredentials
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    // Process streaming response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let streamDone = false

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          // Stream is complete
          break
        }

        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = line.slice(6) // Remove 'data: ' prefix
                if (data.trim()) {
                  const chunk: ChatStreamChunk = JSON.parse(data)
                  onChunk?.(chunk)
                  
                  // Check if stream is done based on chunk data
                  if (chunk.done === true) {
                    streamDone = true
                    break // Exit the for loop
                  }
                }
              } catch (e) {
                console.warn('Failed to parse chunk:', e, line)
              }
            }
          }
        }

        // Exit early if we received a done flag
        if (streamDone) {
          break
        }
      }

      // Process any remaining buffer after stream ends
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = line.slice(6)
              if (data.trim()) {
                const chunk: ChatStreamChunk = JSON.parse(data)
                onChunk?.(chunk)
                
                // Check if stream is done
                if (chunk.done === true) {
                  streamDone = true
                }
              }
            } catch (e) {
              console.warn('Failed to parse chunk:', e, line)
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Error reading stream:', streamError)
      throw streamError
    } finally {
      // Ensure reader is always released, even if there's an error
      try {
        reader.releaseLock()
      } catch (releaseError) {
        console.warn('Error releasing reader:', releaseError)
      }
    }
  } catch (error) {
    console.error('Error sending chat message:', error)
    throw error
  }
}

