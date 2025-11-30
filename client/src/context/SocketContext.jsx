import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { token, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to backend server
      const getSocketUrl = () => {
        if (import.meta.env.PROD) {
          return import.meta.env.VITE_SOCKET_URL || window.location.origin
        }
        return 'http://localhost:5000'
      }
      
      const newSocket = io(getSocketUrl(), {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      newSocket.on('connect', () => {
        console.log('Socket connected')
        setIsConnected(true)
      })

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected')
        setIsConnected(false)
      })

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setIsConnected(false)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    } else {
      if (socket) {
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, token])

  const joinRoom = (roomId, peerId) => {
    if (socket) {
      socket.emit('join-room', { roomId, peerId })
    }
  }

  const leaveRoom = (roomId) => {
    if (socket) {
      socket.emit('leave-room', { roomId })
    }
  }

  const sendOffer = (roomId, offer, to) => {
    if (socket) {
      socket.emit('offer', { roomId, offer, to })
    }
  }

  const sendAnswer = (roomId, answer, to) => {
    if (socket) {
      socket.emit('answer', { roomId, answer, to })
    }
  }

  const sendIceCandidate = (roomId, candidate, to) => {
    if (socket) {
      socket.emit('ice-candidate', { roomId, candidate, to })
    }
  }

  const toggleVideo = (roomId, enabled) => {
    if (socket) {
      socket.emit('toggle-video', { roomId, enabled })
    }
  }

  const toggleAudio = (roomId, enabled) => {
    if (socket) {
      socket.emit('toggle-audio', { roomId, enabled })
    }
  }

  const endCall = (roomId) => {
    if (socket) {
      socket.emit('end-call', { roomId })
    }
  }

  const joinConversation = (conversationId) => {
    if (socket) {
      socket.emit('join-conversation', { conversationId })
    }
  }

  const leaveConversation = (conversationId) => {
    if (socket) {
      socket.emit('leave-conversation', { conversationId })
    }
  }

  const sendTyping = (conversationId) => {
    if (socket) {
      socket.emit('typing', { conversationId })
    }
  }

  const stopTyping = (conversationId) => {
    if (socket) {
      socket.emit('stop-typing', { conversationId })
    }
  }

  const value = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    toggleVideo,
    toggleAudio,
    endCall,
    joinConversation,
    leaveConversation,
    sendTyping,
    stopTyping
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}


