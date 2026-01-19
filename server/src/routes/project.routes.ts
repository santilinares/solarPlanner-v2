import { Router } from 'express';
import {
  createProject,
  listProjects,
  getUserDashboard,
  getAdminDashboard,
  getProjectById,
  getSunPath,
  generatePlan,
  calculateOptimalConfig,
  deleteProject,
  adminDeleteProject,
  getAdminSummary,
  calculateFromPolygon,
} from '../controllers/project.controller';
import { verifyUserJwtToken, verifyAdminJwtToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  ProjectCreateSchema,
  ProjectQuerySchema,
  OptimalConfigSchema,
  OptimalConfigFromPolygonSchema,
} from '../schemas/project.schema';

const router = Router();

/**
 * Project CRUD routes (mounted at /api/projects)
 */
router.post('/', verifyUserJwtToken, validateBody(ProjectCreateSchema), createProject);

router.get('/', verifyUserJwtToken, validateQuery(ProjectQuerySchema), listProjects);

/**
 * Calculations (no ID needed)
 */
router.post(
  '/calculate',
  verifyUserJwtToken,
  validateBody(OptimalConfigFromPolygonSchema),
  calculateFromPolygon
);

/**
 * Dashboard routes (must come before /:id route)
 */
router.get('/dashboard', verifyUserJwtToken, getUserDashboard);

router.get('/admin/dashboard', verifyAdminJwtToken, getAdminDashboard);

/**
 * Admin routes (must come before /:id route)
 */
router.get('/admin/summary', verifyAdminJwtToken, getAdminSummary);

router.get('/:id', verifyUserJwtToken, getProjectById);

router.delete('/:id', verifyUserJwtToken, deleteProject);

/**
 * Project calculations and data
 */
router.get('/:id/sun-path', verifyUserJwtToken, getSunPath);

router.get('/:id/plan', verifyUserJwtToken, generatePlan);

router.post(
  '/:id/config/optimal',
  verifyUserJwtToken,
  validateBody(OptimalConfigSchema),
  calculateOptimalConfig
);

router.delete('/:id/admin', verifyAdminJwtToken, adminDeleteProject);

export default router;
