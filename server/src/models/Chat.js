const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['up', 'down'],
    required: true
  }
}, { _id: false });

const chatSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: [true, 'Session ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isAnonymous;
    }
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'voice', 'question', 'announcement'],
    default: 'text'
  },
  // Enhanced file support
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileType: {
    type: String
  },
  // Q&A specific fields
  category: {
    type: String,
    default: 'general'
  },
  isAnonymous: {
    type: Boolean,
    default: false
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
    maxlength: [2000, 'Answer cannot exceed 2000 characters']
  },
  answeredAt: {
    type: Date
  },
  // Enhanced reactions and voting
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: {
    type: Map,
    of: Number,
    default: {}
  },
  votes: [voteSchema],
  // Moderation
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
  },
  // Additional metadata
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatSchema.index({ sessionId: 1, createdAt: -1 });
chatSchema.index({ userId: 1 });
chatSchema.index({ type: 1 });
chatSchema.index({ category: 1 });
chatSchema.index({ isAnswered: 1 });

// Virtual for like count
chatSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for vote counts
chatSchema.virtual('upvotes').get(function() {
  return this.votes.filter(vote => vote.type === 'up').length;
});

chatSchema.virtual('downvotes').get(function() {
  return this.votes.filter(vote => vote.type === 'down').length;
});

chatSchema.virtual('netVotes').get(function() {
  return this.upvotes - this.downvotes;
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

// Method to add reaction
chatSchema.methods.addReaction = function(reaction) {
  if (!this.reactions) {
    this.reactions = new Map();
  }
  const currentCount = this.reactions.get(reaction) || 0;
  this.reactions.set(reaction, currentCount + 1);
  return this.save();
};

// Method to vote on question
chatSchema.methods.addVote = function(userId, voteType) {
  if (this.type !== 'question') {
    throw new Error('Only questions can be voted on');
  }
  
  // Remove existing vote if any
  this.votes = this.votes.filter(vote => vote.userId.toString() !== userId.toString());
  
  // Add new vote
  this.votes.push({ userId, type: voteType });
  
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

// Method to edit message
chatSchema.methods.editMessage = function(newMessage) {
  this.message = newMessage;
  this.edited = true;
  this.editedAt = new Date();
  
  return this.save();
};

// Ensure virtuals are included in JSON
chatSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Chat', chatSchema);
