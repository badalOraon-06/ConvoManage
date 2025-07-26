import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          userId: user.id
        }
      })

      // Connection event listeners
      socketInstance.on('connect', () => {
        console.log('Connected to server:', socketInstance.id)
        setIsConnected(true)
      })

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from server')
        setIsConnected(false)
      })

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setIsConnected(false)
      })

      setSocket(socketInstance)

      return () => {
        socketInstance.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
    }
  }, [isAuthenticated, user])

  // Join session room
  const joinSession = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('join-session', sessionId)
      console.log(`Joined session: ${sessionId}`)
    }
  }

  // Leave session room
  const leaveSession = (sessionId) => {
    if (socket && isConnected) {
      socket.emit('leave-session', sessionId)
      console.log(`Left session: ${sessionId}`)
    }
  }

  // Send message
  const sendMessage = (sessionId, message) => {
    if (socket && isConnected) {
      const messageData = {
        sessionId,
        message,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        }
      }
      socket.emit('send-message', messageData)
    }
  }

  // Send question
  const sendQuestion = (sessionId, question) => {
    if (socket && isConnected) {
      const questionData = {
        sessionId,
        question,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        }
      }
      socket.emit('send-question', questionData)
    }
  }

  // Subscribe to messages
  const onMessage = (callback) => {
    if (socket) {
      socket.on('receive-message', callback)
      return () => socket.off('receive-message', callback)
    }
  }

  // Subscribe to questions
  const onQuestion = (callback) => {
    if (socket) {
      socket.on('receive-question', callback)
      return () => socket.off('receive-question', callback)
    }
  }

  const value = {
    socket,
    isConnected,
    joinSession,
    leaveSession,
    sendMessage,
    sendQuestion,
    onMessage,
    onQuestion
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export default SocketContext
