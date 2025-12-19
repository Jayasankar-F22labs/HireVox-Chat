import { Trash2 } from 'lucide-react'
import type { Conversation } from '@/services/api'

interface ChatHistoryProps {
  conversations: Conversation[]
  activeChatId?: string
  loading?: boolean
  error?: string | null
  onChatSelect?: (conversation: Conversation) => void
  onChatDelete?: (conversation: Conversation) => void
  deletingChatId?: string | null
}

export function ChatHistory({ conversations, activeChatId, loading, error, onChatSelect, onChatDelete, deletingChatId }: ChatHistoryProps) {
  const getChatTitle = (conversation: Conversation): string => {
    let title: string
    if (conversation.title) {
      title = conversation.title
    } else {
      const identifier = conversation.session_id || conversation.id
      if (identifier) {
        title = `Chat ${identifier.slice(0, 8)}`
      } else {
        title = 'Untitled Chat'
      }
    }
    // Truncate to 30 characters
    return title.length > 30 ? `${title.slice(0, 30)}...` : title
  }

  return (
    <div className="mt-6 flex-1 min-h-0 flex flex-col">
      <div className="sticky top-0 z-10 pb-3 border-b border-white/5">
        <p className="text-xs uppercase tracking-[0.45em] text-white/40">Chat History</p>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 pt-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-white/50">Loading conversations...</p>
          </div>
        )}
        
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
        
        {!loading && !error && conversations.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-white/50">No conversations yet</p>
          </div>
        )}
        
        {!loading &&
          !error &&
          conversations.map((conversation, index) => {
            // Get conversation identifier - prefer session_id, fallback to id
            const conversationId = conversation.session_id || conversation.id
            // Check if this conversation is active by comparing with activeChatId
            // Handle both session_id and id to ensure proper matching
            const isActive = activeChatId && (
              activeChatId === conversation.session_id || 
              activeChatId === conversation.id ||
              activeChatId === conversationId
            )
            const isDeleting = deletingChatId === conversationId
            return (
              <div
                key={conversationId || index}
                className={`group flex w-full items-center gap-2 rounded-2xl px-4 py-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7D3BFF]/20 to-[#4ED0FF]/10 border border-[#7D3BFF]/30 shadow-[0_10px_25px_rgba(125,59,255,0.25)]'
                    : 'hover:bg-white/[0.06]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onChatSelect?.(conversation)}
                  className={`flex-1 text-left text-sm transition-all duration-200 ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-white/70 hover:text-white/90'
                  }`}
                >
                  <span className="truncate block">{getChatTitle(conversation)}</span>
                </button>
                {onChatDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChatDelete(conversation)
                    }}
                    disabled={isDeleting}
                    className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${
                      isDeleting ? 'cursor-not-allowed' : ''
                    }`}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className={`h-3.5 w-3.5 ${isDeleting ? 'text-white/50 animate-pulse' : 'text-white/40 hover:text-red-400'}`} />
                  </button>
                )}
              </div>
            )
          })}
      </div>
      <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  )
}

