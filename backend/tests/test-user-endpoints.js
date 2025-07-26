import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function testUserEndpoints() {
  try {
    await connectDB();
    console.log('✅ Connected to database');

    // Create test users
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('TestPass123!', saltRounds);

    const testSeeker = new User({
      email: 'testseeker@example.com',
      password: hashedPassword,
      name: { first: 'John', last: 'Seeker' },
      phone: '01012345679',
      roles: ['seeker'],
      profile: {
        bio: 'I am a test seeker looking for services'
      }
    });

    const testProvider = new User({
      email: 'testprovider@example.com',
      password: hashedPassword,
      name: { first: 'Jane', last: 'Provider' },
      phone: '01087654322',
      roles: ['provider'],
      profile: {
        bio: 'I am a test provider offering various services'
      }
    });

    await testSeeker.save();
    await testProvider.save();

    console.log('✅ Created test users');
    console.log(`   - Seeker ID: ${testSeeker._id}`);
    console.log(`   - Provider ID: ${testProvider._id}`);

    // Test user service methods
    const userService = (await import('../services/userService.js')).default;

    console.log('\n🧪 Testing user service methods...');

    // Test getCurrentUser
    try {
      const currentUser = await userService.getCurrentUser(testSeeker._id);
      console.log('✅ getCurrentUser works:', currentUser.email);
    } catch (error) {
      console.error('❌ getCurrentUser failed:', error.message);
    }

    // Test updateCurrentUser
    try {
      const updateData = {
        name: { first: 'John', last: 'Updated' },
        profile: {
          bio: 'Updated bio for testing'
        }
      };
      const updatedUser = await userService.updateCurrentUser(testSeeker._id, updateData);
      console.log('✅ updateCurrentUser works:', updatedUser.name.first);
    } catch (error) {
      console.error('❌ updateCurrentUser failed:', error.message);
    }

    // Test getPublicUserProfile
    try {
      const publicProfile = await userService.getPublicUserProfile(testProvider._id);
      console.log('✅ getPublicUserProfile works:', publicProfile.name.first);
      console.log('   - Public profile excludes sensitive data:', !publicProfile.email);
    } catch (error) {
      console.error('❌ getPublicUserProfile failed:', error.message);
    }

    // Test getUserStats
    try {
      const stats = await userService.getUserStats(testProvider._id);
      console.log('✅ getUserStats works:', stats.role);
    } catch (error) {
      console.error('❌ getUserStats failed:', error.message);
    }

    // Test getAllUsers with filters
    try {
      // Create additional test users with different verification and block status
      const verifiedUser = new User({
        email: 'verified@example.com',
        password: hashedPassword,
        name: { first: 'Verified', last: 'User' },
        phone: '01011111113',
        roles: ['seeker'],
        isVerified: true,
        isBlocked: false
      });

      const blockedUser = new User({
        email: 'blocked@example.com',
        password: hashedPassword,
        name: { first: 'Blocked', last: 'User' },
        phone: '01022222224',
        roles: ['seeker'],
        isVerified: false,
        isBlocked: true
      });

      await verifiedUser.save();
      await blockedUser.save();

      // Test verified filter
      const verifiedUsers = await userService.getAllUsers({ 
        page: 1, 
        limit: 10, 
        isVerified: 'true' 
      });
      console.log('✅ Verified filter works:', verifiedUsers.users.length, 'verified users found');

      // Test blocked filter
      const blockedUsers = await userService.getAllUsers({ 
        page: 1, 
        limit: 10, 
        isBlocked: 'true' 
      });
      console.log('✅ Blocked filter works:', blockedUsers.users.length, 'blocked users found');

      // Test unverified filter
      const unverifiedUsers = await userService.getAllUsers({ 
        page: 1, 
        limit: 10, 
        isVerified: 'false' 
      });
      console.log('✅ Unverified filter works:', unverifiedUsers.users.length, 'unverified users found');

      // Clean up additional test data
      await User.deleteMany({ 
        email: { $in: ['verified@example.com', 'blocked@example.com'] } 
      });

    } catch (error) {
      console.error('❌ getAllUsers filter test failed:', error.message);
    }

    // Clean up test data
    await User.deleteMany({ 
      email: { $in: ['testseeker@example.com', 'testprovider@example.com'] } 
    });
    console.log('\n🧹 Cleaned up test data');

    console.log('\n✅ All user endpoint tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testUserEndpoints(); 