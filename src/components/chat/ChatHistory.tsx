import type { Conversation } from '@/services/api'

interface ChatHistoryProps {
  conversations: Conversation[]
  activeChatId?: string
  loading?: boolean
  error?: string | null
  onChatSelect?: (conversation: Conversation, index: number) => void
}

export function ChatHistory({ conversations, activeChatId, loading, error, onChatSelect }: ChatHistoryProps) {
  const getChatTitle = (conversation: Conversation): string => {
    if (conversation.title) {
      return conversation.title
    }
    const identifier = conversation.session_id || conversation.id
    if (identifier) {
      return `Chat ${identifier.slice(0, 8)}`
    }
    return 'Untitled Chat'
  }

  return (
    <div className="mt-6 flex-1 overflow-y-auto">
      <p className="text-xs uppercase tracking-[0.45em] text-white/40">Chat History</p>
      <div className="mt-4 space-y-2">
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
            return (
              <button
                key={conversationId || index}
                type="button"
                onClick={() => onChatSelect?.(conversation, index)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7D3BFF]/20 to-[#4ED0FF]/10 border border-[#7D3BFF]/30 text-white shadow-[0_10px_25px_rgba(125,59,255,0.25)]'
                    : 'text-white/70 hover:bg-white/[0.06] hover:text-white/90'
                }`}
              >
                <span className={`truncate ${isActive ? 'font-medium' : ''}`}>{getChatTitle(conversation)}</span>
                <span className={`ml-2 shrink-0 text-[10px] uppercase tracking-[0.3em] ${isActive ? 'text-[#7D3BFF]' : 'text-white/30'}`}>↗</span>
              </button>
            )
          })}
      </div>
      <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  )
}

