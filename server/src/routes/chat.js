const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Chat = require('../models/Chat');
const Session = require('../models/Session');
const { auth, authenticatedUser } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chat/:sessionId
// @desc    Get chat messages for a session
// @access  Authenticated users
router.get('/:sessionId', [
  auth,
  authenticatedUser,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['message', 'question', 'announcement']).withMessage('Invalid type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { sessionId } = req.params;
    const { page = 1, limit = 50, type } = req.query;

    // Check if session exists and user has access
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is registered for the session or is the speaker/admin
    const isRegistered = session.attendees.some(
      attendee => attendee.user.toString() === req.user._id.toString()
    );
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isRegistered && !isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You must be registered for this session.' });
    }

    // Build query
    const query = { sessionId };
    if (type) query.type = type;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const messages = await Chat.find(query)
      .populate('userId', 'name avatar role')
      .populate('answeredBy', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Chat.countDocuments(query);

    res.json({
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error fetching chat messages' });
  }
});

// @route   POST /api/chat/:sessionId
// @desc    Send a chat message or question
// @access  Authenticated users
router.post('/:sessionId', [
  auth,
  authenticatedUser,
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters'),
  body('type')
    .optional()
    .isIn(['message', 'question'])
    .withMessage('Type must be either message or question')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { sessionId } = req.params;
    const { message, type = 'message' } = req.body;

    // Check if session exists and user has access
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if chat is enabled for the session
    if (!session.chatEnabled && type === 'message') {
      return res.status(403).json({ error: 'Chat is disabled for this session' });
    }

    if (!session.qaEnabled && type === 'question') {
      return res.status(403).json({ error: 'Q&A is disabled for this session' });
    }

    // Check if user is registered for the session or is the speaker/admin
    const isRegistered = session.attendees.some(
      attendee => attendee.user.toString() === req.user._id.toString()
    );
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isRegistered && !isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You must be registered for this session.' });
    }

    // Create chat message
    const chatMessage = new Chat({
      sessionId,
      userId: req.user._id,
      message,
      type
    });

    await chatMessage.save();
    await chatMessage.populate('userId', 'name avatar role');

    res.status(201).json({
      message: 'Message sent successfully',
      chatMessage
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error sending message' });
  }
});

// @route   POST /api/chat/:sessionId/announce
// @desc    Send an announcement (speaker/admin only)
// @access  Speaker or Admin
router.post('/:sessionId/announce', [
  auth,
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Announcement must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { sessionId } = req.params;
    const { message } = req.body;

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is the speaker or admin
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. Only speakers and admins can make announcements.' });
    }

    // Create announcement
    const announcement = new Chat({
      sessionId,
      userId: req.user._id,
      message,
      type: 'announcement'
    });

    await announcement.save();
    await announcement.populate('userId', 'name avatar role');

    res.status(201).json({
      message: 'Announcement sent successfully',
      announcement
    });
  } catch (error) {
    console.error('Send announcement error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error sending announcement' });
  }
});

// @route   POST /api/chat/message/:messageId/like
// @desc    Like/unlike a chat message
// @access  Authenticated users
router.post('/message/:messageId/like', auth, authenticatedUser, async (req, res) => {
  try {
    const { messageId } = req.params;

    const chatMessage = await Chat.findById(messageId);
    if (!chatMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user has access to the session
    const session = await Session.findById(chatMessage.sessionId);
    const isRegistered = session.attendees.some(
      attendee => attendee.user.toString() === req.user._id.toString()
    );
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isRegistered && !isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Toggle like
    const hasLiked = chatMessage.likes.includes(req.user._id);
    
    if (hasLiked) {
      chatMessage.likes = chatMessage.likes.filter(
        like => like.toString() !== req.user._id.toString()
      );
    } else {
      chatMessage.likes.push(req.user._id);
    }

    await chatMessage.save();

    res.json({
      message: hasLiked ? 'Like removed' : 'Message liked',
      likeCount: chatMessage.likes.length,
      hasLiked: !hasLiked
    });
  } catch (error) {
    console.error('Like message error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    res.status(500).json({ error: 'Server error liking message' });
  }
});

// @route   POST /api/chat/question/:questionId/answer
// @desc    Answer a question (speaker/admin only)
// @access  Speaker or Admin
router.post('/question/:questionId/answer', [
  auth,
  body('answer')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Answer must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { questionId } = req.params;
    const { answer } = req.body;

    const question = await Chat.findById(questionId);
    if (!question || question.type !== 'question') {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user is the speaker or admin for this session
    const session = await Session.findById(question.sessionId);
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. Only speakers and admins can answer questions.' });
    }

    // Answer the question
    question.answer = answer;
    question.answeredBy = req.user._id;
    question.isAnswered = true;
    question.answeredAt = new Date();

    await question.save();
    await question.populate('answeredBy', 'name avatar');

    res.json({
      message: 'Question answered successfully',
      question
    });
  } catch (error) {
    console.error('Answer question error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    res.status(500).json({ error: 'Server error answering question' });
  }
});

// @route   GET /api/chat/:sessionId/questions
// @desc    Get unanswered questions for a session
// @access  Speaker or Admin
router.get('/:sessionId/questions', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if user is the speaker or admin
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. Only speakers and admins can view questions.' });
    }

    const questions = await Chat.find({
      sessionId,
      type: 'question',
      isAnswered: false
    })
    .populate('userId', 'name avatar')
    .sort({ createdAt: -1 });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error fetching questions' });
  }
});

module.exports = router;
