import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import routes from './routes';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app: Application = express();

  // Security middleware
  app.use(helmet());

  // CORS middleware
  app.use(corsMiddleware);


  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // TODO: Metrics endpoint (Prometheus format)
  // app.get('/metrics', metricsHandler);

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  });

  // Error handling middleware (must be last)
  app.use(errorMiddleware);

  return app;
}
