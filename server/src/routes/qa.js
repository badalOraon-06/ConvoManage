const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Chat = require('../models/Chat');
const Session = require('../models/Session');
const { auth, authenticatedUser } = require('../middleware/auth');
const { getIO } = require('../socket/socketHandlers');

const router = express.Router();

// @route   GET /api/qa/:sessionId/questions
// @desc    Get questions for a session with enhanced filtering
// @access  Authenticated users
router.get('/:sessionId/questions', [
  auth,
  authenticatedUser,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('status').optional().isIn(['all', 'answered', 'unanswered']).withMessage('Invalid status'),
  query('sortBy').optional().isIn(['newest', 'oldest', 'popular']).withMessage('Invalid sortBy value')
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
    const { 
      page = 1, 
      limit = 50, 
      category, 
      status = 'all',
      sortBy = 'newest'
    } = req.query;

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

    // Build query for questions
    const queryFilter = { 
      sessionId,
      type: 'question'
    };

    if (category) {
      queryFilter.category = category;
    }

    if (status === 'answered') {
      queryFilter.isAnswered = true;
    } else if (status === 'unanswered') {
      queryFilter.isAnswered = false;
    }

    // Determine sort order
    let sortOptions = {};
    switch (sortBy) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'popular':
        sortOptions = { 'likes.length': -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const questions = await Chat.find(queryFilter)
      .populate('userId', 'name avatar role')
      .populate('answeredBy', 'name avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Chat.countDocuments(queryFilter);

    // Add voting information for each question
    const questionsWithVotes = questions.map(question => {
      const upvotes = question.votes?.filter(vote => vote.type === 'up').length || 0;
      const downvotes = question.votes?.filter(vote => vote.type === 'down').length || 0;
      const userVote = question.votes?.find(vote => 
        vote.userId.toString() === req.user._id.toString()
      );

      return {
        ...question.toObject(),
        upvotes,
        downvotes,
        netVotes: upvotes - downvotes,
        userVote: userVote?.type || null
      };
    });

    res.json({
      questions: questionsWithVotes,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error fetching questions' });
  }
});

// @route   POST /api/qa/:sessionId/questions
// @desc    Submit a question with enhanced features
// @access  Authenticated users
router.post('/:sessionId/questions', [
  auth,
  authenticatedUser,
  body('question')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Question must be between 1 and 1000 characters'),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean')
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
    const { question, category = 'general', isAnonymous = false } = req.body;

    // Check if session exists and user has access
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.qaEnabled) {
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

    // Create question
    const questionData = new Chat({
      sessionId,
      userId: isAnonymous ? null : req.user._id,
      message: question,
      type: 'question',
      category,
      isAnonymous,
      votes: [],
      isAnswered: false
    });

    await questionData.save();
    
    if (!isAnonymous) {
      await questionData.populate('userId', 'name avatar role');
    }

    // Emit real-time event
    const io = getIO();
    io.to(`qa-${sessionId}`).emit('new-question', {
      id: questionData._id,
      question: questionData.message,
      category: questionData.category,
      isAnonymous: questionData.isAnonymous,
      user: isAnonymous ? null : {
        id: questionData.userId?._id,
        name: questionData.userId?.name,
        role: questionData.userId?.role
      },
      timestamp: questionData.createdAt,
      upvotes: 0,
      downvotes: 0,
      netVotes: 0,
      isAnswered: false,
      userVote: null
    });

    res.status(201).json({
      message: 'Question submitted successfully',
      question: questionData
    });
  } catch (error) {
    console.error('Submit question error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error submitting question' });
  }
});

// @route   POST /api/qa/questions/:questionId/vote
// @desc    Vote on a question (upvote/downvote)
// @access  Authenticated users
router.post('/questions/:questionId/vote', [
  auth,
  authenticatedUser,
  body('voteType')
    .isIn(['up', 'down'])
    .withMessage('Vote type must be either "up" or "down"')
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
    const { voteType } = req.body;

    const question = await Chat.findById(questionId);
    if (!question || question.type !== 'question') {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user has access to the session
    const session = await Session.findById(question.sessionId);
    const isRegistered = session.attendees.some(
      attendee => attendee.user.toString() === req.user._id.toString()
    );
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isRegistered && !isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Initialize votes array if it doesn't exist
    if (!question.votes) {
      question.votes = [];
    }

    // Check if user has already voted
    const existingVoteIndex = question.votes.findIndex(
      vote => vote.userId.toString() === req.user._id.toString()
    );

    if (existingVoteIndex !== -1) {
      // User has already voted
      const existingVote = question.votes[existingVoteIndex];
      
      if (existingVote.type === voteType) {
        // Same vote type - remove the vote (toggle off)
        question.votes.splice(existingVoteIndex, 1);
      } else {
        // Different vote type - update the vote
        question.votes[existingVoteIndex].type = voteType;
      }
    } else {
      // New vote
      question.votes.push({
        userId: req.user._id,
        type: voteType
      });
    }

    await question.save();

    // Calculate vote counts
    const upvotes = question.votes.filter(vote => vote.type === 'up').length;
    const downvotes = question.votes.filter(vote => vote.type === 'down').length;
    const userVote = question.votes.find(vote => 
      vote.userId.toString() === req.user._id.toString()
    );

    // Emit real-time update
    const io = getIO();
    io.to(`qa-${question.sessionId}`).emit('question-updated', {
      id: questionId,
      upvotes,
      downvotes,
      netVotes: upvotes - downvotes
    });

    res.json({
      message: 'Vote recorded successfully',
      upvotes,
      downvotes,
      netVotes: upvotes - downvotes,
      userVote: userVote?.type || null
    });
  } catch (error) {
    console.error('Vote question error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    res.status(500).json({ error: 'Server error voting on question' });
  }
});

// @route   POST /api/qa/questions/:questionId/answer
// @desc    Answer a question (speaker/admin only) with enhanced features
// @access  Speaker or Admin
router.post('/questions/:questionId/answer', [
  auth,
  body('answer')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Answer must be between 1 and 2000 characters')
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

    // Emit real-time update
    const io = getIO();
    io.to(`qa-${question.sessionId}`).emit('question-answered', {
      id: questionId,
      answer,
      answeredAt: question.answeredAt,
      answeredBy: {
        id: question.answeredBy._id,
        name: question.answeredBy.name
      }
    });

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

// @route   GET /api/qa/:sessionId/categories
// @desc    Get question categories for a session
// @access  Authenticated users
router.get('/:sessionId/categories', auth, authenticatedUser, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Check if session exists and user has access
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check access
    const isRegistered = session.attendees.some(
      attendee => attendee.user.toString() === req.user._id.toString()
    );
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isRegistered && !isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Get unique categories from questions in this session
    const categories = await Chat.distinct('category', {
      sessionId,
      type: 'question'
    });

    // Get question counts per category
    const categoryCounts = await Chat.aggregate([
      {
        $match: {
          sessionId: mongoose.Types.ObjectId(sessionId),
          type: 'question'
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          answered: {
            $sum: {
              $cond: [{ $eq: ['$isAnswered', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    const categoriesWithCounts = categoryCounts.map(cat => ({
      name: cat._id,
      totalQuestions: cat.count,
      answeredQuestions: cat.answered,
      unansweredQuestions: cat.count - cat.answered
    }));

    res.json({
      categories: categoriesWithCounts
    });
  } catch (error) {
    console.error('Get categories error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error fetching categories' });
  }
});

// @route   DELETE /api/qa/questions/:questionId
// @desc    Delete a question (author, speaker, or admin only)
// @access  Authenticated users
router.delete('/questions/:questionId', auth, authenticatedUser, async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Chat.findById(questionId);
    if (!question || question.type !== 'question') {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if user is the author, speaker, or admin
    const session = await Session.findById(question.sessionId);
    const isAuthor = question.userId && question.userId.toString() === req.user._id.toString();
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own questions.' });
    }

    await Chat.findByIdAndDelete(questionId);

    // Emit real-time update
    const io = getIO();
    io.to(`qa-${question.sessionId}`).emit('question-deleted', {
      id: questionId
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid question ID' });
    }
    res.status(500).json({ error: 'Server error deleting question' });
  }
});

module.exports = router;
