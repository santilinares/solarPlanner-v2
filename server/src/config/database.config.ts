import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 * @param uri MongoDB connection string
 */
export async function connectDatabase(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    // DONE: Add graceful shutdown handler
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

/**
 * Disconnect from MongoDB database
 */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  console.log('✅ MongoDB disconnected');
}
