const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Session title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Session description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  speaker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Speaker is required']
  },
  date: {
    type: Date,
    required: [true, 'Session date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  maxAttendees: {
    type: Number,
    default: 100,
    min: [1, 'Max attendees must be at least 1']
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  category: {
    type: String,
    enum: ['technology', 'business', 'health', 'education', 'entertainment', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  meetingLink: {
    type: String,
    trim: true
  },
  resources: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['document', 'video', 'link', 'image']
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  chatEnabled: {
    type: Boolean,
    default: true
  },
  qaEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
sessionSchema.index({ date: 1, startTime: 1 });
sessionSchema.index({ speaker: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ 'attendees.user': 1 });

// Virtual for attendee count
sessionSchema.virtual('attendeeCount').get(function() {
  return this.attendees.length;
});

// Virtual for checking if session is full
sessionSchema.virtual('isFull').get(function() {
  return this.attendees.length >= this.maxAttendees;
});

// Virtual for session datetime
sessionSchema.virtual('sessionDateTime').get(function() {
  const sessionDate = new Date(this.date);
  const [hours, minutes] = this.startTime.split(':');
  sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return sessionDate;
});

// Pre-save middleware to calculate duration
sessionSchema.pre('save', function(next) {
  if (this.isModified('startTime') || this.isModified('endTime')) {
    const [startHours, startMinutes] = this.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    this.duration = endTotalMinutes - startTotalMinutes;
    
    if (this.duration <= 0) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

// Method to add attendee
sessionSchema.methods.addAttendee = function(userId) {
  const existingAttendee = this.attendees.find(
    attendee => attendee.user.toString() === userId.toString()
  );
  
  if (existingAttendee) {
    throw new Error('User is already registered for this session');
  }
  
  if (this.isFull) {
    throw new Error('Session is full');
  }
  
  this.attendees.push({ user: userId });
  return this.save();
};

// Method to remove attendee
sessionSchema.methods.removeAttendee = function(userId) {
  this.attendees = this.attendees.filter(
    attendee => attendee.user.toString() !== userId.toString()
  );
  return this.save();
};

// Ensure virtuals are included in JSON
sessionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Session', sessionSchema);
