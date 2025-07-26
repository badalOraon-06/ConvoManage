const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(limiter);
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join session room
  socket.on('join-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    console.log(`User ${socket.id} joined session ${sessionId}`);
  });

  // Leave session room
  socket.on('leave-session', (sessionId) => {
    socket.leave(`session-${sessionId}`);
    console.log(`User ${socket.id} left session ${sessionId}`);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    const { sessionId, message, user } = data;
    const messageData = {
      id: Date.now(),
      sessionId,
      message,
      user,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast message to all users in the session room
    io.to(`session-${sessionId}`).emit('receive-message', messageData);
  });

  // Handle Q&A questions
  socket.on('send-question', (data) => {
    const { sessionId, question, user } = data;
    const questionData = {
      id: Date.now(),
      sessionId,
      question,
      user,
      timestamp: new Date().toISOString(),
      answered: false
    };
    
    // Broadcast question to all users in the session room
    io.to(`session-${sessionId}`).emit('receive-question', questionData);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/convomanage', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  
  // Create default admin user if it doesn't exist
  const User = require('./models/User');
  const bcrypt = require('bcryptjs');
  
  User.findOne({ email: 'admin@convomanage.com' })
    .then(async (admin) => {
      if (!admin) {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const adminUser = new User({
          name: 'Admin User',
          email: 'admin@convomanage.com',
          password: hashedPassword,
          role: 'admin'
        });
        await adminUser.save();
        console.log('Default admin user created');
        console.log('📧 Email: admin@convomanage.com');
        console.log('🔑 Password: admin123');
      }
    })
    .catch(err => console.log('Error creating admin user:', err));
})
.catch((err) => {
  console.error('MongoDB connection error:', err.message);
  console.log('\n⚠️  Database connection failed - the app will continue but with limited functionality');
  console.log('💡 To fix this:');
  console.log('   1. Check your MongoDB Atlas credentials in server/.env');
  console.log('   2. Or install MongoDB locally: https://www.mongodb.com/try/download/community');
  console.log('   3. Or contact your MongoDB Atlas admin for correct credentials\n');
  
  // Don't exit - let the server run without database for demo purposes
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  const status = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  res.status(status).json({ error: message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, io };
