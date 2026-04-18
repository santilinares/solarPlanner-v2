import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from './config/database.config';
import { initializeEmailTransporter } from './config/email.config';
import { loadEnv } from './env';
import { initializeScheduler } from './services/scheduler.service';

// Load environment variables
dotenv.config();

/**
 * Bootstrap and start the server
 */
async function bootstrap(): Promise<void> {
  try {
    // Validate environment variables
    const env = loadEnv();

    // Connect to MongoDB
    await connectDatabase(env.MONGODB_URI);

    // Initialize nightly production refresh scheduler
    await initializeScheduler();

    // Initialize email transporter
    initializeEmailTransporter({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    });

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`📍 Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️ ${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        // Close database connection
        const mongoose = await import('mongoose');
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
bootstrap();
