import pino from 'pino';

/**
 * Logger configuration using pino
 * Provides structured JSON logging with correlation IDs
 */

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // TODO: Add pretty print for development. Is that really necessary? 
  // I am currently using console.log and I see the logs just fine. 
  // KEEP OR DELETE PINO-PRETTY?
  // transport: process.env.NODE_ENV !== 'production' ? {
  //   target: 'pino-pretty',
  //   options: {
  //     colorize: true
  //   }
  // } : undefined
});

/**
 * Create a child logger with additional context
 * @param context Additional context fields
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log with request correlation ID
 * @param requestId Request correlation ID
 */
export function logWithRequestId(requestId: string) {
  return logger.child({ requestId });
}

export default logger;
