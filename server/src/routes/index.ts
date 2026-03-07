import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import panelRoutes from './panel.routes';
import cultivarRoutes from './cultivar.routes';

/**
 * Main router aggregator
 * Combines all feature routes
 */

const router = Router();

// Mount feature routes with prefixes
router.use('/auth', authRoutes);      // Authentication: /api/auth/*
router.use('/users', userRoutes);     // User management: /api/users/*
router.use('/projects', projectRoutes); // Projects: /api/projects/*
router.use('/panels', panelRoutes);   // Panels: /api/panels/*
router.use('/cultivars', cultivarRoutes); // Cultivars: /api/cultivars/*

export default router;
