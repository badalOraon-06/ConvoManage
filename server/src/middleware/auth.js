const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Token is not valid.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Token is not valid.' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Please authenticate.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}` 
      });
    }

    next();
  };
};

// Admin only middleware
const adminOnly = authorize('admin');

// Speaker or Admin middleware
const speakerOrAdmin = authorize('speaker', 'admin');

// Attendee, Speaker, or Admin middleware (authenticated users)
const authenticatedUser = authorize('attendee', 'speaker', 'admin');

module.exports = {
  auth,
  authorize,
  adminOnly,
  speakerOrAdmin,
  authenticatedUser
};
