const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['message', 'question', 'announcement'],
    default: 'message'
  },
  isAnswered: {
    type: Boolean,
    default: false
  },
  answeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  answer: {
    type: String,
    maxlength: [1000, 'Answer cannot exceed 1000 characters']
  },
  answeredAt: {
    type: Date
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isModerated: {
    type: Boolean,
    default: false
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ sessionId: 1, createdAt: -1 });
chatSchema.index({ userId: 1 });
chatSchema.index({ type: 1 });

// Virtual for like count
chatSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Method to add like
chatSchema.methods.addLike = function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    return this.save();
  }
  throw new Error('User has already liked this message');
};

// Method to remove like
chatSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.toString() !== userId.toString());
  return this.save();
};

// Method to answer question
chatSchema.methods.answerQuestion = function(answer, answeredBy) {
  if (this.type !== 'question') {
    throw new Error('Only questions can be answered');
  }
  
  this.answer = answer;
  this.answeredBy = answeredBy;
  this.isAnswered = true;
  this.answeredAt = new Date();
  
  return this.save();
};

// Ensure virtuals are included in JSON
chatSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Chat', chatSchema);
