const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Session = require('../models/Session');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filtering and pagination
// @access  Admin only
router.get('/', [
  auth,
  adminOnly,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['admin', 'speaker', 'attendee']).withMessage('Invalid role'),
  query('search').optional().isLength({ max: 100 }).withMessage('Search term too long'),
  query('active').optional().isBoolean().withMessage('Active must be a boolean')
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
      role,
      search,
      active
    } = req.query;

    // Build query
    const query = {};

    if (role) query.role = role;
    if (active !== undefined) query.isActive = active === 'true';

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password')
      .populate('registeredSessions', 'title date startTime')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Get session counts for speakers
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        let speakingSessions = 0;
        if (user.role === 'speaker' || user.role === 'admin') {
          speakingSessions = await Session.countDocuments({
            speaker: user._id,
            isActive: true
          });
        }

        return {
          ...user.toObject(),
          speakingSessions,
          registeredSessionsCount: user.registeredSessions.length
        };
      })
    );

    res.json({
      users: usersWithStats,
      pagination: {
        current: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user by ID
// @access  Admin only
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('registeredSessions', 'title date startTime endTime speaker')
      .populate({
        path: 'registeredSessions',
        populate: {
          path: 'speaker',
          select: 'name email'
        }
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get speaking sessions if user is a speaker
    let speakingSessions = [];
    if (user.role === 'speaker' || user.role === 'admin') {
      speakingSessions = await Session.find({
        speaker: user._id,
        isActive: true
      })
      .populate('attendees.user', 'name email')
      .sort({ date: 1, startTime: 1 });
    }

    res.json({
      user: {
        ...user.toObject(),
        speakingSessions
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Server error fetching user' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user by ID
// @access  Admin only
router.put('/:id', [
  auth,
  adminOnly,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('role')
    .optional()
    .isIn(['admin', 'speaker', 'attendee'])
    .withMessage('Invalid role'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { name, email, role, bio, avatar, isActive } = req.body;

    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken' });
      }
    }

    // Prevent admin from deactivating themselves
    if (isActive === false && user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (role) updateFields.role = role;
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Server error updating user' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Admin only
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Soft delete - deactivate the user
    user.isActive = false;
    await user.save();

    // If user is a speaker, cancel their upcoming sessions
    if (user.role === 'speaker') {
      await Session.updateMany(
        { 
          speaker: user._id, 
          date: { $gte: new Date() },
          isActive: true 
        },
        { 
          status: 'cancelled',
          isActive: false 
        }
      );
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

// @route   GET /api/users/speakers/list
// @desc    Get list of all speakers
// @access  Admin only
router.get('/speakers/list', auth, adminOnly, async (req, res) => {
  try {
    const speakers = await User.find({
      role: { $in: ['speaker', 'admin'] },
      isActive: true
    })
    .select('name email bio avatar')
    .sort({ name: 1 });

    // Get session counts for each speaker
    const speakersWithStats = await Promise.all(
      speakers.map(async (speaker) => {
        const sessionCount = await Session.countDocuments({
          speaker: speaker._id,
          isActive: true
        });

        const upcomingSessions = await Session.countDocuments({
          speaker: speaker._id,
          date: { $gte: new Date() },
          isActive: true
        });

        return {
          ...speaker.toObject(),
          totalSessions: sessionCount,
          upcomingSessions
        };
      })
    );

    res.json({ speakers: speakersWithStats });
  } catch (error) {
    console.error('Get speakers error:', error);
    res.status(500).json({ error: 'Server error fetching speakers' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Admin only
router.get('/stats/overview', auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalSpeakers = await User.countDocuments({ role: 'speaker', isActive: true });
    const totalAttendees = await User.countDocuments({ role: 'attendee', isActive: true });
    const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });

    const totalSessions = await Session.countDocuments({ isActive: true });
    const upcomingSessions = await Session.countDocuments({
      date: { $gte: new Date() },
      isActive: true
    });

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: true
    });

    // Get most popular sessions
    const popularSessions = await Session.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          attendeeCount: { $size: '$attendees' }
        }
      },
      { $sort: { attendeeCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'speaker',
          foreignField: '_id',
          as: 'speaker'
        }
      },
      {
        $project: {
          title: 1,
          date: 1,
          attendeeCount: 1,
          'speaker.name': 1,
          'speaker.email': 1
        }
      }
    ]);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          speakers: totalSpeakers,
          attendees: totalAttendees,
          admins: totalAdmins
        },
        sessions: {
          total: totalSessions,
          upcoming: upcomingSessions
        },
        recentRegistrations,
        popularSessions
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

module.exports = router;
