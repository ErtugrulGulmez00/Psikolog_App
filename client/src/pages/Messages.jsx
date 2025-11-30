import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { messagesAPI } from '../services/api'
import { formatTimeAgo } from '../utils/helpers'
import { Send, Paperclip, ArrowLeft, Search } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'
import EmptyState from '../components/common/EmptyState'

const Messages = () => {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, joinConversation, leaveConversation, sendTyping, stopTyping } = useSocket()
  
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId)
      joinConversation(conversationId)
      
      return () => {
        leaveConversation(conversationId)
      }
    }
  }, [conversationId])

  useEffect(() => {
    if (socket) {
      socket.on('new-message', handleNewMessage)
      socket.on('user-typing', handleUserTyping)
      socket.on('user-stop-typing', handleUserStopTyping)

      return () => {
        socket.off('new-message', handleNewMessage)
        socket.off('user-typing', handleUserTyping)
        socket.off('user-stop-typing', handleUserStopTyping)
      }
    }
  }, [socket, conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const res = await messagesAPI.getConversations()
      setConversations(res.data.conversations)
    } catch (error) {
      console.error('Fetch conversations error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (convId) => {
    try {
      setMessagesLoading(true)
      const res = await messagesAPI.getMessages(convId)
      setMessages(res.data.messages)
    } catch (error) {
      console.error('Fetch messages error:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleNewMessage = ({ conversationId: convId, message }) => {
    if (convId === conversationId) {
      setMessages(prev => [...prev, message])
    }
    // Update conversation list
    setConversations(prev => prev.map(conv => 
      conv._id === convId 
        ? { ...conv, lastMessage: message, lastMessageAt: new Date() }
        : conv
    ))
  }

  const handleUserTyping = ({ userId, userName }) => {
    const myId = user?.id || user?._id
    if (userId !== myId) {
      setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, userName }])
    }
  }

  const handleUserStopTyping = ({ userId }) => {
    setTypingUsers(prev => prev.filter(u => u.userId !== userId))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const res = await messagesAPI.sendMessage(conversationId, {
        content: newMessage.trim()
      })
      setMessages(prev => [...prev, res.data.message])
      setNewMessage('')
      stopTyping(conversationId)
    } catch (error) {
      console.error('Send message error:', error)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)
    
    if (conversationId) {
      sendTyping(conversationId)
      
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(conversationId)
      }, 2000)
    }
  }

  const getOtherParticipant = (conversation) => {
    const myId = user?.id || user?._id
    return conversation.participants.find(p => (p.id || p._id) !== myId)
  }

  const selectedConversation = conversations.find(c => c._id === conversationId)
  const filteredConversations = conversations.filter(conv => {
    const other = getOtherParticipant(conv)
    const name = `${other?.firstName} ${other?.lastName}`.toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="h-[calc(100vh-200px)] flex">
      {/* Conversations List */}
      <div className={`w-full md:w-80 border-r border-neutral-200 bg-white flex flex-col ${
        conversationId ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-neutral-100">
          <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
            Mesajlar
          </h2>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara..."
              className="input pl-10 py-2"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredConversations.length === 0 ? (
            <EmptyState
              title="Konuşma yok"
              description="Henüz mesajınız bulunmuyor"
              className="py-8"
            />
          ) : (
            filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv)
              const unread = conv.unreadCount?.get?.(user?.id || user?._id) || 0
              const isSelected = conv._id === conversationId
              
              return (
                <button
                  key={conv._id}
                  onClick={() => navigate(`/messages/${conv._id}`)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-neutral-50 transition-colors ${
                    isSelected ? 'bg-primary-50' : ''
                  }`}
                >
                  <Avatar
                    src={other?.avatar}
                    firstName={other?.firstName}
                    lastName={other?.lastName}
                    size="md"
                  />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-neutral-900 truncate">
                        {other?.firstName} {other?.lastName}
                      </p>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-neutral-500">
                          {formatTimeAgo(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500 truncate">
                      {conv.lastMessage?.content || 'Henüz mesaj yok'}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-neutral-50 ${
        !conversationId ? 'hidden md:flex' : 'flex'
      }`}>
        {conversationId && selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-neutral-100 flex items-center gap-4">
              <button
                onClick={() => navigate('/messages')}
                className="md:hidden p-2 hover:bg-neutral-100 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>
              <Avatar
                src={getOtherParticipant(selectedConversation)?.avatar}
                firstName={getOtherParticipant(selectedConversation)?.firstName}
                lastName={getOtherParticipant(selectedConversation)?.lastName}
                size="md"
              />
              <div>
                <p className="font-medium text-neutral-900">
                  {getOtherParticipant(selectedConversation)?.firstName}{' '}
                  {getOtherParticipant(selectedConversation)?.lastName}
                </p>
                {typingUsers.length > 0 && (
                  <p className="text-sm text-primary-600 animate-pulse">
                    yazıyor...
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = (message.sender.id || message.sender._id) === (user?.id || user?._id)
                  
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isOwn ? 'order-2' : ''}`}>
                        {!isOwn && (
                          <Avatar
                            src={message.sender.avatar}
                            firstName={message.sender.firstName}
                            lastName={message.sender.lastName}
                            size="xs"
                            className="mb-1"
                          />
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwn
                              ? 'bg-primary-600 text-white rounded-br-md'
                              : 'bg-white text-neutral-900 rounded-bl-md shadow-sm'
                          }`}
                        >
                          {message.type === 'file' || message.type === 'image' ? (
                            <a
                              href={message.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 underline"
                            >
                              <Paperclip size={16} />
                              {message.fileName || 'Dosya'}
                            </a>
                          ) : (
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                        <p className={`text-xs text-neutral-500 mt-1 ${isOwn ? 'text-right' : ''}`}>
                          {formatTimeAgo(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-neutral-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Mesajınızı yazın..."
                  className="input flex-1"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn-primary px-4"
                >
                  {sending ? <LoadingSpinner size="sm" /> : <Send size={20} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              title="Bir konuşma seçin"
              description="Sol taraftaki listeden bir konuşma seçerek mesajlaşmaya başlayın"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Messages


