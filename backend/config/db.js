const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('⚡ Using existing MongoDB connection');
      return;
    }

    console.log('🔌 Attempting to connect to MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Disable buffering to avoid hanging queries if connection isn't ready
    mongoose.set('bufferCommands', false);

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // Increase timeout for initial connection
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // Don't exit process in production/serverless
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
    throw error; // Re-throw to be caught by middleware
  }
};

module.exports = connectDB;
