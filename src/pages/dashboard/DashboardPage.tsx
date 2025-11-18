import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

import { Download, LogOut, MessageSquarePlus, Mic, Send, Share2, User } from 'lucide-react'

import { ChatHistory } from '@/components/chat/ChatHistory'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/providers/AuthProvider'
import { getConversations, getConversationMessages, sendChatMessage, downloadConversation, type Conversation } from '@/services/api'

// Generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function DashboardPage() {
  const { id } = useParams<{ id?: string }>()
  const [promptValue, setPromptValue] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationsFetchedRef = useRef(false)
  const messagesFetchedRef = useRef<string | null>(null)
  
  // Use id from URL as activeChatId
  const activeChatId = id

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch conversations on component mount
  useEffect(() => {
    // Prevent duplicate calls (React StrictMode in development)
    if (conversationsFetchedRef.current) {
      return
    }
    conversationsFetchedRef.current = true

    const fetchConversations = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getConversations()
        setConversations(data)
        
        // Don't auto-select first conversation - let user select one
        // if (data.length > 0) {
        //   setActiveChatId((prev) => prev || data[0].id)
        // }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations'
        console.error('Failed to fetch conversations:', err)
        setError(errorMessage)
        toast.error('Failed to load conversations', {
          description: errorMessage,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load conversation messages when id changes
  useEffect(() => {
    // Prevent duplicate calls for the same chatId (React StrictMode in development)
    if (messagesFetchedRef.current === activeChatId) {
      return
    }
    messagesFetchedRef.current = activeChatId || null

    const loadConversationMessages = async () => {
      if (!activeChatId) {
        // Clear messages if no chat is selected
        setMessages([])
        return
      }

      try {
        setLoadingMessages(true)
        setError(null)
        const conversationResponse = await getConversationMessages(activeChatId)
        
        if (conversationResponse && conversationResponse.success && conversationResponse.conversation) {
          // Transform API messages to component Message format
          // Generate IDs for messages since API doesn't provide them
          const loadedMessages: Message[] = conversationResponse.conversation.map((msg, index) => ({
            id: `${activeChatId}-${index}-${Date.now()}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(),
          }))
          setMessages(loadedMessages)
        } else {
          // No messages found, start with empty array
          setMessages([])
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation'
        console.error('Failed to fetch conversation messages:', err)
        setError(errorMessage)
        toast.error('Failed to load conversation', {
          description: errorMessage,
        })
        setMessages([])
      } finally {
        setLoadingMessages(false)
      }
    }

    loadConversationMessages()
  }, [activeChatId])

  const handleNewChat = () => {
    // Generate new UUID and navigate to /chat/:id
    const newChatId = generateUUID()
    navigate(`/chat/${newChatId}`, { replace: true })
    setPromptValue('')
  }

  const handlePromptSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    if (!promptValue.trim()) {
      return
    }

    // Get session_id from URL (id param)
    if (!activeChatId) {
      toast.error('No chat selected', {
        description: 'Please select or create a chat first.',
      })
      return
    }

    const currentSessionId = activeChatId
    const userMessage = promptValue.trim()
    
    // Add user message to UI
    const userMsg: Message = {
      id: generateUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    
    // Clear the input
    setPromptValue('')
    
    // Create assistant message for streaming
    const assistantMsgId = generateUUID()
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, assistantMsg])

    setSending(true)
    try {
      await sendChatMessage(
        {
          message: userMessage,
          session_id: currentSessionId,
        },
        (chunk) => {
          // Update the assistant message with streaming content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + (chunk.content || '') }
                : msg
            )
          )
        }
      )
      
      // Refresh conversations list after sending message
      const data = await getConversations()
      setConversations(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      toast.error('Failed to send message', {
        description: errorMessage,
      })
      // Remove the assistant message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId))
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error('Failed to sign out', {
        description: error instanceof Error ? error.message : 'An error occurred',
      })
    }
  }

  const handleChatSelect = (conversation: Conversation) => {
    // Navigate to the chat URL with the conversation ID
    // Messages will be automatically loaded by the useEffect when id changes
    navigate(`/chat/${conversation.session_id}`, { replace: true })
  }

  const handleDownloadConversation = async () => {
    if (!activeChatId) {
      toast.error('No chat selected', {
        description: 'Please select a conversation to download.',
      })
      return
    }

    try {
      await downloadConversation(activeChatId)
      toast.success('Conversation downloaded', {
        description: 'The conversation file has been downloaded successfully.',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download conversation'
      toast.error('Download failed', {
        description: errorMessage,
      })
    }
  }

  // Get user info from session
  const userName = session?.user?.email?.split('@')[0] || 'Murtuza'
  const userInitial = userName.charAt(0).toUpperCase()

  // Get selected conversation title
  const selectedConversation = conversations.find(
    (conv) => (conv.session_id || conv.id) === activeChatId
  )
  const chatTitle = selectedConversation?.title 
    ? selectedConversation.title 
    : activeChatId 
      ? `Chat ${activeChatId.slice(0, 8)}` 
      : 'AI Powered Hiring Assistant'

  return (
    <div
      className="flex h-screen overflow-hidden text-white"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1.5px), radial-gradient(circle at 15% 10%, rgba(120,60,200,0.25), transparent 45%), radial-gradient(circle at 85% 5%, rgba(60,120,255,0.18), transparent 50%), linear-gradient(180deg, #0b0024 0%, #050015 55%, #02000c 100%)',
        backgroundSize: '160px 160px, 100% 100%, 100% 100%, 100% 100%',
        backgroundPosition: '0 0, center, center, center',
        backgroundBlendMode: 'normal, screen, screen, normal',
      }}
    >
      <div className="flex h-full w-full flex-col gap-4 sm:gap-6 sm:flex-row">
        <aside className="flex h-full w-full flex-col border border-white/5 bg-[#09011a]/70 p-4 sm:p-6 text-sm text-white/70 backdrop-blur sm:w-64 sm:max-h-full shrink-0">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CFF] to-[#4ED0FF] text-base font-semibold text-white">
              HV
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.55em] text-white/40">hirevox</p>
              <p className="text-base font-semibold text-white">AI Assistant</p>
            </div>
          </div>

          <Button
            onClick={handleNewChat}
            className="mt-6 w-full gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 transition hover:bg-white/[0.08] hover:text-white"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </Button>

          <ChatHistory
            conversations={conversations}
            activeChatId={activeChatId}
            loading={loading}
            error={error}
            onChatSelect={handleChatSelect}
          />

          <div className="mt-4 flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-700/80 text-sm font-semibold text-white">
              {userInitial}
            </div>
            <div className="flex-1 text-sm leading-tight">
              <p className="font-semibold text-white">{userName}</p>
              <p className="text-white/60">Hirevox</p>
            </div>
            <Popover
              trigger={
                <button
                  type="button"
                  className="flex items-center justify-center rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white/80"
                  aria-label="Profile menu"
                >
                  <span className="text-xl leading-none">⋯</span>
                </button>
              }
              align="end"
              side="top"
            >
              <PopoverContent className="min-w-[200px] p-2">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      // Profile action - can be extended later
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/90 transition hover:bg-white/10"
                  >
                    <User className="h-4 w-4 text-white/70" />
                    <span>Profile</span>
                  </button>
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </aside>

        <main className="flex h-full flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/5 bg-transparent py-4 px-4 sm:px-6 backdrop-blur-sm">
            <h1 className="text-xl sm:text-2xl font-semibold text-white truncate">{chatTitle}</h1>
            {activeChatId && (
            <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleDownloadConversation}
                  className="gap-2 rounded-lg border border-white/10 bg-[#0a0a0a]/80 px-4 py-2 text-sm text-white/90 backdrop-blur-sm transition hover:bg-[#0f0f0f]/90 hover:text-white"
                >
                <Download className="h-4 w-4" />
                Download Conversation
              </Button>
                <Button
                  variant="ghost"
                  className="gap-2 rounded-lg border border-white/10 bg-[#0a0a0a]/80 px-4 py-2 text-sm text-white/90 backdrop-blur-sm transition hover:bg-[#0f0f0f]/90 hover:text-white"
                >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
            )}
          </header>

          {!activeChatId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <svg
                    className="h-8 w-8 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
            </div>
                <h2 className="mb-2 text-xl font-semibold text-white">No chat selected</h2>
                <p className="text-sm text-white/60">
                  Select a conversation from the sidebar to view messages
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto pt-6">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-white/50">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-white/50">No messages yet. Start a conversation!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-[#7D3BFF] text-white'
                            : 'bg-white/5 text-white/90 border border-white/10'
                        }`}
                      >
                        <div className="prose prose-invert prose-sm max-w-none break-words text-sm leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              h1: ({ children }) => <h1 className="mb-2 mt-4 text-xl font-bold first:mt-0">{children}</h1>,
                              h2: ({ children }) => <h2 className="mb-2 mt-3 text-lg font-bold first:mt-0">{children}</h2>,
                              h3: ({ children }) => <h3 className="mb-2 mt-2 text-base font-bold first:mt-0">{children}</h3>,
                              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              code: ({ children, className }) => {
                                // Inline code has no className, code blocks have className with 'language-'
                                const isInline = !className
                                if (isInline) {
                                  return (
                                    <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-white/90">
                                      {children}
                                    </code>
                                  )
                                }
                                // Code blocks are wrapped in <pre> by react-markdown, so we just style the code
                                return (
                                  <code className="block rounded bg-white/10 p-3 text-xs font-mono text-white/90 overflow-x-auto">
                                    {children}
                                  </code>
                                )
                              },
                              pre: ({ children }) => (
                                <pre className="mb-2 overflow-x-auto rounded bg-white/10 p-3 text-xs">{children}</pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="mb-2 border-l-4 border-white/20 pl-4 italic text-white/80">
                                  {children}
                                </blockquote>
                              ),
                              a: ({ children, href }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 underline hover:text-blue-300"
                                >
                                  {children}
                                </a>
                              ),
                              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                              em: ({ children }) => <em className="italic">{children}</em>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                          {message.role === 'assistant' && sending && message.id === messages[messages.length - 1]?.id && (
                            <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white/60" />
                          )}
                        </div>
                      </div>
              </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              </div>
          )}

          {activeChatId && (
            <form
              onSubmit={handlePromptSubmit}
              className="mt-4 flex shrink-0 items-center gap-4 rounded-[32px] bg-[#121113]/90 px-8 py-4 shadow-[0_0_50px_rgba(0,0,0,0.45)]"
            >
              <label htmlFor="prompt-input" className="sr-only">
                Prompt
              </label>
              <textarea
                id="prompt-input"
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                placeholder="Writing a Prompt Here"
                rows={2}
                className="max-h-32 flex-1 resize-none overflow-hidden border-none bg-transparent text-base text-white placeholder:text-white/60 focus:outline-none"
              />
            <button
              type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 text-white transition hover:text-white/80 focus-visible:outline-none focus-visible:ring-0"
                aria-label="Record voice prompt"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
                type="submit"
                disabled={sending || !promptValue.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7D3BFF] text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send prompt"
            >
              <Send className="h-5 w-5" />
            </button>
            </form>
          )}
        </main>
      </div>
    </div>
  )
}