// Enhanced Socket.IO server implementation with communication features
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const Chat = require('../models/Chat');
const Session = require('../models/Session');
const User = require('../models/User');

let io;
const connectedUsers = new Map();
const sessionRooms = new Map();

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.userId})`);
    
    // Add user to connected users
    connectedUsers.set(socket.userId, {
      id: socket.userId,
      name: socket.user.name,
      role: socket.user.role,
      socketId: socket.id,
      status: 'online'
    });

    // Broadcast user connection
    socket.broadcast.emit('user-connected', {
      id: socket.userId,
      name: socket.user.name,
      role: socket.user.role
    });

    // Send online users list
    socket.emit('users-online', Array.from(connectedUsers.values()));

    // Chat functionality
    socket.on('join-session-chat', (sessionId) => {
      socket.join(`session-${sessionId}`);
      console.log(`${socket.user.name} joined chat for session ${sessionId}`);
    });

    socket.on('leave-session-chat', (sessionId) => {
      socket.leave(`session-${sessionId}`);
      console.log(`${socket.user.name} left chat for session ${sessionId}`);
    });

    socket.on('send-message', async (data) => {
      try {
        const { sessionId, message, type = 'text', fileUrl, fileName, fileType } = data;

        // Verify user is registered for the session
        const session = await Session.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        const isRegistered = session.attendees.some(
          attendee => attendee.user.toString() === socket.userId
        ) || session.speaker.toString() === socket.userId;

        if (!isRegistered) {
          socket.emit('error', { message: 'Not registered for this session' });
          return;
        }

        // Create chat message
        const chatMessage = new Chat({
          session: sessionId,
          user: socket.userId,
          message,
          type,
          fileUrl,
          fileName,
          fileType,
          timestamp: new Date()
        });

        await chatMessage.save();
        await chatMessage.populate('user', 'name role avatar');

        // Broadcast message to session room
        io.to(`session-${sessionId}`).emit('new-message', {
          id: chatMessage._id,
          user: {
            id: chatMessage.user._id,
            name: chatMessage.user.name,
            role: chatMessage.user.role,
            avatar: chatMessage.user.avatar
          },
          message: chatMessage.message,
          type: chatMessage.type,
          fileUrl: chatMessage.fileUrl,
          fileName: chatMessage.fileName,
          fileType: chatMessage.fileType,
          timestamp: chatMessage.timestamp,
          reactions: {}
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing-start', (data) => {
      socket.to(`session-${data.sessionId}`).emit('user-typing', {
        userId: socket.userId,
        userName: data.userName || socket.user.name
      });
    });

    socket.on('typing-stop', (data) => {
      socket.to(`session-${data.sessionId}`).emit('user-stopped-typing', {
        userId: socket.userId
      });
    });

    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, reaction, sessionId } = data;
        
        const chatMessage = await Chat.findById(messageId);
        if (!chatMessage) return;

        if (!chatMessage.reactions) {
          chatMessage.reactions = {};
        }

        if (!chatMessage.reactions[reaction]) {
          chatMessage.reactions[reaction] = 0;
        }

        chatMessage.reactions[reaction]++;
        await chatMessage.save();

        io.to(`session-${sessionId}`).emit('message-reaction', {
          messageId,
          reactions: chatMessage.reactions
        });

      } catch (error) {
        console.error('Error adding reaction:', error);
      }
    });

    // Q&A functionality
    socket.on('join-qa-room', (sessionId) => {
      socket.join(`qa-${sessionId}`);
      console.log(`${socket.user.name} joined Q&A for session ${sessionId}`);
    });

    socket.on('leave-qa-room', (sessionId) => {
      socket.leave(`qa-${sessionId}`);
      console.log(`${socket.user.name} left Q&A for session ${sessionId}`);
    });

    socket.on('submit-question', async (data) => {
      try {
        const { sessionId, question, category, isAnonymous } = data;

        // Verify session exists
        const session = await Session.findById(sessionId);
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        // Create question document
        const questionData = {
          id: new Date().getTime().toString(),
          sessionId,
          question,
          category: category || 'general',
          isAnonymous,
          user: isAnonymous ? null : {
            id: socket.userId,
            name: socket.user.name,
            role: socket.user.role
          },
          timestamp: new Date(),
          votes: 0,
          upvotes: 0,
          downvotes: 0,
          isAnswered: false,
          userVotes: {}
        };

        // Broadcast question to Q&A room
        io.to(`qa-${sessionId}`).emit('new-question', questionData);

        // Store question in memory or database
        // You might want to create a Question model for persistence

      } catch (error) {
        console.error('Error submitting question:', error);
        socket.emit('error', { message: 'Failed to submit question' });
      }
    });

    socket.on('vote-question', async (data) => {
      try {
        const { questionId, voteType, sessionId } = data;
        
        // Update question votes (implement according to your storage solution)
        // For now, broadcast the vote update
        io.to(`qa-${sessionId}`).emit('question-updated', {
          id: questionId,
          voteUpdate: { userId: socket.userId, voteType }
        });

      } catch (error) {
        console.error('Error voting on question:', error);
      }
    });

    socket.on('answer-question', async (data) => {
      try {
        const { questionId, answer, sessionId } = data;

        // Verify user is speaker for this session
        const session = await Session.findById(sessionId);
        if (!session || session.speaker.toString() !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to answer questions' });
          return;
        }

        // Broadcast answer to Q&A room
        io.to(`qa-${sessionId}`).emit('question-answered', {
          questionId,
          answer,
          answeredAt: new Date(),
          answeredBy: socket.user.name
        });

      } catch (error) {
        console.error('Error answering question:', error);
      }
    });

    // Video conference functionality
    socket.on('join-video-room', (sessionId) => {
      socket.join(`video-${sessionId}`);
      
      if (!sessionRooms.has(sessionId)) {
        sessionRooms.set(sessionId, new Set());
      }
      
      sessionRooms.get(sessionId).add({
        userId: socket.userId,
        name: socket.user.name,
        role: socket.user.role,
        socketId: socket.id
      });

      // Notify others about participants update
      const participants = Array.from(sessionRooms.get(sessionId));
      io.to(`video-${sessionId}`).emit('participants-updated', participants);
      
      console.log(`${socket.user.name} joined video room for session ${sessionId}`);
    });

    socket.on('leave-video-room', (sessionId) => {
      socket.leave(`video-${sessionId}`);
      
      if (sessionRooms.has(sessionId)) {
        const participants = sessionRooms.get(sessionId);
        participants.forEach(participant => {
          if (participant.userId === socket.userId) {
            participants.delete(participant);
          }
        });
        
        // Notify others about participants update
        io.to(`video-${sessionId}`).emit('participants-updated', Array.from(participants));
      }
      
      console.log(`${socket.user.name} left video room for session ${sessionId}`);
    });

    socket.on('join-video-call', (data) => {
      const { sessionId } = data;
      socket.to(`video-${sessionId}`).emit('user-joined-video', {
        userId: socket.userId,
        ...data.userData,
        initiator: true
      });
    });

    socket.on('leave-video-call', (data) => {
      const { sessionId } = data;
      socket.to(`video-${sessionId}`).emit('user-left-video', {
        userId: socket.userId
      });
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
      socket.to(`video-${data.sessionId}`).emit('offer', {
        offer: data.offer,
        from: socket.userId
      });
    });

    socket.on('answer', (data) => {
      socket.to(`video-${data.sessionId}`).emit('answer', {
        answer: data.answer,
        from: socket.userId
      });
    });

    socket.on('ice-candidate', (data) => {
      socket.to(`video-${data.sessionId}`).emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.userId
      });
    });

    // Private messaging
    socket.on('send-private-message', async (data) => {
      try {
        const { recipientId, message } = data;
        const recipient = connectedUsers.get(recipientId);
        
        if (recipient) {
          io.to(recipient.socketId).emit('receive-private-message', {
            from: {
              id: socket.userId,
              name: socket.user.name,
              role: socket.user.role
            },
            message,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error sending private message:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      
      // Broadcast user disconnection
      socket.broadcast.emit('user-disconnected', socket.userId);
      
      // Clean up session rooms
      sessionRooms.forEach((participants, sessionId) => {
        participants.forEach(participant => {
          if (participant.userId === socket.userId) {
            participants.delete(participant);
            // Notify remaining participants
            io.to(`video-${sessionId}`).emit('participants-updated', Array.from(participants));
          }
        });
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};

module.exports = {
  initializeSocket,
  getIO,
  getConnectedUsers
};
