import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

export const useCommunication = (sessionId) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Chat functionality
  const loadMessages = useCallback(async (limit = 50, skip = 0) => {
    try {
      setLoading(true);
      const response = await api.get(`/chat/session/${sessionId}`, {
        params: { limit, skip }
      });
      
      if (skip === 0) {
        setMessages(response.data.messages);
      } else {
        setMessages(prev => [...response.data.messages, ...prev]);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const sendMessage = useCallback(async (message, type = 'text') => {
    try {
      const response = await api.post('/chat/send', {
        sessionId,
        message,
        type
      });
      
      // Message will be received via socket, no need to update state here
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  }, [sessionId]);

  const uploadFile = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const response = await api.post('/chat/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      throw error;
    }
  }, [sessionId]);

  const addReaction = useCallback(async (messageId, reaction) => {
    try {
      await api.post(`/chat/${messageId}/reaction`, { reaction });
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  }, []);

  // Q&A functionality
  const loadQuestions = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const response = await api.get(`/qa/${sessionId}/questions`, {
        params: filters
      });
      
      setQuestions(response.data.questions);
      return response.data;
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
      return null;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const submitQuestion = useCallback(async (question, category = 'general', isAnonymous = false) => {
    try {
      const response = await api.post(`/qa/${sessionId}/questions`, {
        question,
        category,
        isAnonymous
      });
      
      // Question will be received via socket
      return response.data;
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error('Failed to submit question');
      throw error;
    }
  }, [sessionId]);

  const voteQuestion = useCallback(async (questionId, voteType) => {
    try {
      const response = await api.post(`/qa/questions/${questionId}/vote`, {
        voteType
      });
      
      // Update will be received via socket
      return response.data;
    } catch (error) {
      console.error('Error voting on question:', error);
      toast.error('Failed to vote on question');
      throw error;
    }
  }, []);

  const answerQuestion = useCallback(async (questionId, answer) => {
    try {
      const response = await api.post(`/qa/questions/${questionId}/answer`, {
        answer
      });
      
      // Update will be received via socket
      return response.data;
    } catch (error) {
      console.error('Error answering question:', error);
      toast.error('Failed to answer question');
      throw error;
    }
  }, []);

  // Typing indicators
  const startTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing-start', { sessionId });
    }
  }, [socket, isConnected, sessionId]);

  const stopTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing-stop', { sessionId });
    }
  }, [socket, isConnected, sessionId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Chat events
    const handleNewMessage = (messageData) => {
      setMessages(prev => [...prev, messageData]);
    };

    const handleMessageReaction = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions } : msg
      ));
    };

    const handleUserTyping = ({ userId, userName }) => {
      setTypingUsers(prev => new Set([...prev, userName]));
      
      // Remove typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userName);
          return newSet;
        });
      }, 3000);
    };

    const handleUserStoppedTyping = ({ userId }) => {
      // This would need user name mapping
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        // Remove by userId (would need to map userId to name)
        return newSet;
      });
    };

    // Q&A events
    const handleNewQuestion = (questionData) => {
      setQuestions(prev => [questionData, ...prev]);
    };

    const handleQuestionUpdated = ({ id, voteUpdate, ...updates }) => {
      setQuestions(prev => prev.map(q => 
        q.id === id ? { ...q, ...updates } : q
      ));
    };

    const handleQuestionAnswered = ({ questionId, answer, answeredAt, answeredBy }) => {
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? { 
          ...q, 
          answer, 
          answeredAt, 
          answeredBy, 
          isAnswered: true 
        } : q
      ));
    };

    // User presence events
    const handleUsersOnline = (users) => {
      setOnlineUsers(users);
    };

    const handleUserConnected = (user) => {
      setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
    };

    const handleUserDisconnected = (userId) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== userId));
    };

    // Register event listeners
    socket.on('new-message', handleNewMessage);
    socket.on('message-reaction', handleMessageReaction);
    socket.on('user-typing', handleUserTyping);
    socket.on('user-stopped-typing', handleUserStoppedTyping);
    socket.on('new-question', handleNewQuestion);
    socket.on('question-updated', handleQuestionUpdated);
    socket.on('question-answered', handleQuestionAnswered);
    socket.on('users-online', handleUsersOnline);
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);

    // Join communication rooms
    socket.emit('join-session-chat', sessionId);
    socket.emit('join-qa-room', sessionId);

    // Cleanup function
    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-reaction', handleMessageReaction);
      socket.off('user-typing', handleUserTyping);
      socket.off('user-stopped-typing', handleUserStoppedTyping);
      socket.off('new-question', handleNewQuestion);
      socket.off('question-updated', handleQuestionUpdated);
      socket.off('question-answered', handleQuestionAnswered);
      socket.off('users-online', handleUsersOnline);
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      
      socket.emit('leave-session-chat', sessionId);
      socket.emit('leave-qa-room', sessionId);
    };
  }, [socket, isConnected, sessionId]);

  return {
    // State
    messages,
    questions,
    onlineUsers,
    typingUsers,
    loading,
    isConnected,
    
    // Chat functions
    loadMessages,
    sendMessage,
    uploadFile,
    addReaction,
    
    // Q&A functions
    loadQuestions,
    submitQuestion,
    voteQuestion,
    answerQuestion,
    
    // Typing functions
    startTyping,
    stopTyping
  };
};

export default useCommunication;
