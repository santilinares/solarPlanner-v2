import { z } from 'zod';

/**
 * Environment variable validation schema
 * Ensures all required configuration is present and valid before server starts
 */
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(1235),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXP: z.string().default('24h'),

  // Email
  EMAIL_HOST: z.string().min(1, 'Email host is required'),
  EMAIL_PORT: z.coerce.number().int().positive(),
  EMAIL_USER: z.string().email('Valid email user is required'),
  EMAIL_PASS: z.string().min(1, 'Email password is required'),

  // Frontend
  FRONTEND_URL: z.string().url('Valid frontend URL is required'),

  // External APIs (optional for initial setup)
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  SOLCAST_API_KEY: z.string().optional(),

  REFRESH_TOKEN_SECRET: z.string().min(32, 'Refresh token secret must be at least 32 characters'),
  REFRESH_TOKEN_EXP: z.string().default('7d'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Load and validate environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}
