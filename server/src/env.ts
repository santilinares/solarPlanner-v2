/**
 * Environment variable validation and configuration
 * Validates all required environment variables on server startup
 */

interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXP: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXP: string;
  FRONTEND_URL: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  SOLCAST_API_KEY: string;
  USE_MOCK_SOLCAST: boolean;
}

/**
 * Load and validate environment variables
 * Throws error if required variables are missing
 */
export function loadEnv(): AppConfig {
  const env = process.env;

  // Validate required variables
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'SOLCAST_API_KEY',
  ];

  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: (env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    PORT: parseInt(env.PORT || '1235', 10),
    MONGODB_URI: env.MONGODB_URI!,
    JWT_SECRET: env.JWT_SECRET!,
    JWT_EXP: env.JWT_EXP || '24h',
    REFRESH_TOKEN_SECRET: env.REFRESH_TOKEN_SECRET!,
    REFRESH_TOKEN_EXP: env.REFRESH_TOKEN_EXP || '7d',
    FRONTEND_URL: env.FRONTEND_URL || 'http://localhost:4200',
    EMAIL_HOST: env.EMAIL_HOST!,
    EMAIL_PORT: parseInt(env.EMAIL_PORT!, 10),
    EMAIL_USER: env.EMAIL_USER!,
    EMAIL_PASS: env.EMAIL_PASS!,
    SOLCAST_API_KEY: env.SOLCAST_API_KEY!,
    USE_MOCK_SOLCAST: env.USE_MOCK_SOLCAST === 'true',
  };
}
