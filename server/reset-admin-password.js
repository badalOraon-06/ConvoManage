const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const email = 'admin@convomanage.com';
    const newPassword = 'admin123';
    
    console.log(`🔍 Looking for user: ${email}`);
    
    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log('❌ Admin user not found! Creating one...');
      
      // Create new admin user
      const adminUser = new User({
        name: 'Admin User',
        email: email,
        password: newPassword,
        role: 'admin',
        isActive: true
      });
      
      await adminUser.save();
      console.log('🎉 Admin user created successfully!');
    } else {
      console.log(`👤 Found user: ${user.name}`);
      console.log(`📊 Current role: ${user.role}`);
      
      // Reset password
      user.password = newPassword;
      user.role = 'admin'; // Ensure admin role
      user.isActive = true; // Ensure active
      user.updatedAt = new Date();
      
      await user.save();
      console.log('🔑 Password reset successfully!');
    }
    
    console.log('\n📧 Admin Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: admin`);
    
    // Test the password
    const testUser = await User.findOne({ email: email });
    const isPasswordValid = await testUser.comparePassword(newPassword);
    
    console.log(`\n🧪 Password Test: ${isPasswordValid ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the reset
console.log('🔑 ConvoManage Admin Password Reset');
console.log('===================================');
resetAdminPassword();
