const mongoose = require('mongoose');
require('dotenv').config();

// User model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'speaker', 'attendee'], default: 'attendee' },
  avatar: { type: String },
  bio: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user by email
    const email = process.argv[2] || 'admin@convomanage.com';
    
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log('❌ User not found!');
      console.log('💡 Please register first with this email, then run this script.');
      process.exit(1);
    }
    
    console.log(`👤 Found user: ${user.name} (${user.email})`);
    console.log(`📊 Current role: ${user.role}`);
    
    if (user.role === 'admin') {
      console.log('✅ User is already an admin!');
    } else {
      // Update role to admin
      user.role = 'admin';
      user.updatedAt = new Date();
      await user.save();
      
      console.log('🎉 Successfully upgraded user to admin!');
      console.log('📧 Admin credentials:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    }
    
    // List all users
    console.log('\n👥 All users in the system:');
    const allUsers = await User.find().select('name email role createdAt');
    allUsers.forEach((u, index) => {
      console.log(`   ${index + 1}. ${u.name} (${u.email}) - ${u.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the setup
console.log('🚀 ConvoManage Admin Setup Tool');
console.log('================================');
setupAdmin();
