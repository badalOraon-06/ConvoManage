const mongoose = require('mongoose');
const Session = require('./src/models/Session');
const User = require('./src/models/User');

async function createSampleSessions() {
  try {
    await mongoose.connect('mongodb://localhost:27017/convomanage');
    
    // Get all speakers and admins
    const speakers = await User.find({ 
      role: { $in: ['speaker', 'admin'] }
    });
    
    if (speakers.length === 0) {
      console.log('No speakers found. Please create a user with speaker role first.');
      return;
    }
    
    console.log('Found speakers:', speakers.map(s => `${s.name} (${s.email})`));
    
    const sampleSessions = [
      {
        title: 'Introduction to React Hooks',
        description: 'Learn the fundamentals of React Hooks and how to use them in your applications. We\'ll cover useState, useEffect, useContext, and custom hooks with practical examples.',
        speaker: speakers[0]._id,
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        startTime: '14:00',
        endTime: '15:30',
        maxAttendees: 50,
        category: 'technology',
        tags: ['react', 'javascript', 'frontend', 'hooks'],
        meetingLink: 'https://zoom.us/j/123456789',
        status: 'scheduled'
      },
      {
        title: 'Building Scalable Node.js Applications',
        description: 'Deep dive into building scalable and maintainable Node.js applications. Topics include architecture patterns, performance optimization, and deployment strategies.',
        speaker: speakers[0]._id,
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        startTime: '16:00',
        endTime: '17:30',
        maxAttendees: 30,
        category: 'technology',
        tags: ['nodejs', 'backend', 'scalability', 'architecture'],
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        status: 'scheduled'
      }
    ];
    
    // Add more sessions if we have multiple speakers
    if (speakers.length > 1) {
      sampleSessions.push({
        title: 'Digital Marketing Strategies for 2025',
        description: 'Explore the latest digital marketing trends and strategies that will dominate 2025. Learn about AI-powered marketing, content strategies, and customer engagement techniques.',
        speaker: speakers[1]._id,
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        startTime: '13:00',
        endTime: '14:30',
        maxAttendees: 100,
        category: 'business',
        tags: ['marketing', 'digital', 'strategy', 'AI'],
        meetingLink: 'https://teams.microsoft.com/l/meetup-join/xyz',
        status: 'scheduled'
      });
    }
    
    // Add a completed session for demo
    sampleSessions.push({
      title: 'Introduction to MongoDB',
      description: 'A comprehensive introduction to MongoDB, covering document databases, queries, indexing, and best practices.',
      speaker: speakers[0]._id,
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      startTime: '10:00',
      endTime: '11:30',
      maxAttendees: 40,
      category: 'technology',
      tags: ['mongodb', 'database', 'nosql'],
      status: 'completed'
    });
    
    // Calculate duration for each session
    sampleSessions.forEach(session => {
      const start = new Date(`2000-01-01T${session.startTime}:00`);
      const end = new Date(`2000-01-01T${session.endTime}:00`);
      session.duration = (end - start) / (1000 * 60); // duration in minutes
    });
    
    // Create sessions
    const createdSessions = await Session.insertMany(sampleSessions);
    
    console.log(`Created ${createdSessions.length} sample sessions:`);
    createdSessions.forEach(session => {
      console.log(`- ${session.title} (${session.status})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating sample sessions:', error);
    process.exit(1);
  }
}

createSampleSessions();
