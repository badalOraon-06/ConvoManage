const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Session = require('../models/Session');
const User = require('../models/User');
const { auth, adminOnly, speakerOrAdmin, authenticatedUser } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sessions
// @desc    Get all sessions with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['scheduled', 'live', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('category').optional().isIn(['technology', 'business', 'health', 'education', 'entertainment', 'other']).withMessage('Invalid category'),
  query('speaker').optional().isMongoId().withMessage('Invalid speaker ID'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      category,
      speaker,
      search,
      upcoming,
      past
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (status) query.status = status;
    if (category) query.category = category;
    if (speaker) query.speaker = speaker;

    // Date filtering
    const now = new Date();
    if (upcoming === 'true') {
      query.date = { $gte: now };
    } else if (past === 'true') {
      query.date = { $lt: now };
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sessions = await Session.find(query)
      .populate('speaker', 'name email bio avatar')
      .populate('attendees.user', 'name email')
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Session.countDocuments(query);

    res.json({
      sessions,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Server error fetching sessions' });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get single session by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('speaker', 'name email bio avatar')
      .populate('attendees.user', 'name email');

    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error fetching session' });
  }
});

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Admin only
router.post('/', [
  auth,
  adminOnly,
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('speaker')
    .isMongoId()
    .withMessage('Invalid speaker ID'),
  body('date')
    .isISO8601()
    .withMessage('Invalid date format'),
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)'),
  body('maxAttendees')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max attendees must be at least 1'),
  body('category')
    .optional()
    .isIn(['technology', 'business', 'health', 'education', 'entertainment', 'other'])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('meetingLink')
    .optional()
    .isURL()
    .withMessage('Meeting link must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const {
      title,
      description,
      speaker,
      date,
      startTime,
      endTime,
      maxAttendees = 100,
      category = 'other',
      tags = [],
      meetingLink,
      resources = []
    } = req.body;

    // Validate speaker exists and has speaker role
    const speakerUser = await User.findById(speaker);
    if (!speakerUser) {
      return res.status(400).json({ error: 'Speaker not found' });
    }
    if (speakerUser.role !== 'speaker' && speakerUser.role !== 'admin') {
      return res.status(400).json({ error: 'Selected user is not a speaker' });
    }

    // Validate date is in the future
    const sessionDate = new Date(date);
    if (sessionDate < new Date()) {
      return res.status(400).json({ error: 'Session date must be in the future' });
    }

    // Create session
    const session = new Session({
      title,
      description,
      speaker,
      date: sessionDate,
      startTime,
      endTime,
      maxAttendees,
      category,
      tags,
      meetingLink,
      resources
    });

    await session.save();
    await session.populate('speaker', 'name email bio avatar');

    res.status(201).json({
      message: 'Session created successfully',
      session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Server error creating session' });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update a session
// @access  Admin or assigned speaker
router.put('/:id', [
  auth,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid start time format (HH:MM)'),
  body('endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid end time format (HH:MM)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const session = await Session.findById(req.params.id);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isSpeaker = session.speaker.toString() === req.user._id.toString();
    
    if (!isAdmin && !isSpeaker) {
      return res.status(403).json({ error: 'Access denied. You can only edit your own sessions or need admin privileges.' });
    }

    // If user is speaker (not admin), limit what they can update
    const allowedFields = isAdmin 
      ? Object.keys(req.body)
      : ['description', 'meetingLink', 'resources', 'tags'];

    const updateFields = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    // Validate date is in the future if being updated
    if (updateFields.date) {
      const sessionDate = new Date(updateFields.date);
      if (sessionDate < new Date()) {
        return res.status(400).json({ error: 'Session date must be in the future' });
      }
    }

    const updatedSession = await Session.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('speaker', 'name email bio avatar');

    res.json({
      message: 'Session updated successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Update session error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error updating session' });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete a session (soft delete)
// @access  Admin only
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Soft delete
    session.isActive = false;
    session.status = 'cancelled';
    await session.save();

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete session error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error deleting session' });
  }
});

// @route   POST /api/sessions/:id/register
// @desc    Register for a session
// @access  Authenticated users
router.post('/:id/register', auth, authenticatedUser, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if already registered
    const isAlreadyRegistered = session.attendees.some(
      attendee => attendee.user.toString() === req.user._id.toString()
    );

    if (isAlreadyRegistered) {
      return res.status(400).json({ error: 'Already registered for this session' });
    }

    // Check if session is full
    if (session.attendees.length >= session.maxAttendees) {
      return res.status(400).json({ error: 'Session is full' });
    }

    // Check if session is in the past
    const sessionDateTime = new Date(session.date);
    const [hours, minutes] = session.startTime.split(':');
    sessionDateTime.setHours(parseInt(hours), parseInt(minutes));

    if (sessionDateTime < new Date()) {
      return res.status(400).json({ error: 'Cannot register for past sessions' });
    }

    // Add user to session attendees
    session.attendees.push({ user: req.user._id });
    await session.save();

    // Add session to user's registered sessions
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { registeredSessions: session._id }
    });

    res.json({ message: 'Successfully registered for session' });
  } catch (error) {
    console.error('Register for session error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error registering for session' });
  }
});

// @route   DELETE /api/sessions/:id/register
// @desc    Unregister from a session
// @access  Authenticated users
router.delete('/:id/register', auth, authenticatedUser, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if registered
    const attendeeIndex = session.attendees.findIndex(
      attendee => attendee.user.toString() === req.user._id.toString()
    );

    if (attendeeIndex === -1) {
      return res.status(400).json({ error: 'Not registered for this session' });
    }

    // Remove user from session attendees
    session.attendees.splice(attendeeIndex, 1);
    await session.save();

    // Remove session from user's registered sessions
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { registeredSessions: session._id }
    });

    res.json({ message: 'Successfully unregistered from session' });
  } catch (error) {
    console.error('Unregister from session error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    res.status(500).json({ error: 'Server error unregistering from session' });
  }
});

// @route   GET /api/sessions/my/speaking
// @desc    Get sessions where user is the speaker
// @access  Speakers and Admins
router.get('/my/speaking', auth, speakerOrAdmin, async (req, res) => {
  try {
    const sessions = await Session.find({
      speaker: req.user._id,
      isActive: true
    })
    .populate('attendees.user', 'name email')
    .sort({ date: 1, startTime: 1 });

    res.json({ sessions });
  } catch (error) {
    console.error('Get my speaking sessions error:', error);
    res.status(500).json({ error: 'Server error fetching speaking sessions' });
  }
});

// @route   GET /api/sessions/my/registered
// @desc    Get sessions user is registered for
// @access  Authenticated users
router.get('/my/registered', auth, authenticatedUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'registeredSessions',
        match: { isActive: true },
        populate: {
          path: 'speaker',
          select: 'name email bio avatar'
        }
      });

    res.json({ sessions: user.registeredSessions || [] });
  } catch (error) {
    console.error('Get registered sessions error:', error);
    res.status(500).json({ error: 'Server error fetching registered sessions' });
  }
});

module.exports = router;
