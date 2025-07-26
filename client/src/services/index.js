import api from './api'

export const sessionService = {
  // Get all sessions
  getSessions: async (params = {}) => {
    const response = await api.get('/sessions', { params })
    return response.data
  },

  // Get single session
  getSession: async (id) => {
    const response = await api.get(`/sessions/${id}`)
    return response.data
  },

  // Create session (admin only)
  createSession: async (sessionData) => {
    const response = await api.post('/sessions', sessionData)
    return response.data
  },

  // Update session
  updateSession: async (id, sessionData) => {
    const response = await api.put(`/sessions/${id}`, sessionData)
    return response.data
  },

  // Delete session (admin only)
  deleteSession: async (id) => {
    const response = await api.delete(`/sessions/${id}`)
    return response.data
  },

  // Register for session
  registerForSession: async (id) => {
    const response = await api.post(`/sessions/${id}/register`)
    return response.data
  },

  // Unregister from session
  unregisterFromSession: async (id) => {
    const response = await api.delete(`/sessions/${id}/register`)
    return response.data
  },

  // Get sessions where user is speaking
  getMySpeakingSessions: async () => {
    const response = await api.get('/sessions/my/speaking')
    return response.data
  },

  // Get sessions user is registered for
  getMyRegisteredSessions: async () => {
    const response = await api.get('/sessions/my/registered')
    return response.data
  }
}

export const userService = {
  // Get all users (admin only)
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params })
    return response.data
  },

  // Get single user (admin only)
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },

  // Update user (admin only)
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData)
    return response.data
  },

  // Delete user (admin only)
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },

  // Get speakers list (admin only)
  getSpeakers: async () => {
    const response = await api.get('/users/speakers/list')
    return response.data
  },

  // Get user statistics (admin only)
  getStats: async () => {
    const response = await api.get('/users/stats/overview')
    return response.data
  }
}

export const chatService = {
  // Get chat messages for session
  getChatMessages: async (sessionId, params = {}) => {
    const response = await api.get(`/chat/${sessionId}`, { params })
    return response.data
  },

  // Send message
  sendMessage: async (sessionId, messageData) => {
    const response = await api.post(`/chat/${sessionId}`, messageData)
    return response.data
  },

  // Send announcement (speaker/admin only)
  sendAnnouncement: async (sessionId, message) => {
    const response = await api.post(`/chat/${sessionId}/announce`, { message })
    return response.data
  },

  // Like/unlike message
  toggleLike: async (messageId) => {
    const response = await api.post(`/chat/message/${messageId}/like`)
    return response.data
  },

  // Answer question (speaker/admin only)
  answerQuestion: async (questionId, answer) => {
    const response = await api.post(`/chat/question/${questionId}/answer`, { answer })
    return response.data
  },

  // Get unanswered questions (speaker/admin only)
  getQuestions: async (sessionId) => {
    const response = await api.get(`/chat/${sessionId}/questions`)
    return response.data
  }
}
