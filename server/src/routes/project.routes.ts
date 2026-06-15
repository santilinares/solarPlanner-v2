import { Router } from 'express';
import {
  createProject,
  listProjects,
  getUserDashboard,
  getAdminDashboard,
  getProjectById,
  updateProject,
  getSunPath,
  generatePlan,
  calculateOptimalConfig,
  deleteProject,
  adminDeleteProject,
  calculateFromPolygon,
  getElectricityPriceSuggestion,
  estimateProject,
  refreshProduction,
  getProjectAnalytics,
  previewProjectConfig,
} from '../controllers/project.controller';
import { verifyUserJwtToken, verifyAdminJwtToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  ProjectCreateSchema,
  ProjectQuerySchema,
  ProjectUpdateSchema,
  OptimalConfigSchema,
  OptimalConfigFromPolygonSchema,
  EstimateSchema,
  RefreshProductionSchema,
  ProjectConfigPreviewSchema,
} from '../schemas/project.schema';

const router = Router();

/**
 * Public routes (no auth)
 */
router.post('/estimate', validateBody(EstimateSchema), estimateProject);
router.post('/calculate', validateBody(OptimalConfigFromPolygonSchema), calculateFromPolygon);
router.get('/pricing/electricity', getElectricityPriceSuggestion);
router.get('/electricity-price', getElectricityPriceSuggestion);

/**
 * Project CRUD routes (mounted at /api/projects)
 */
router.post('/', verifyUserJwtToken, validateBody(ProjectCreateSchema), createProject);

router.get('/', verifyUserJwtToken, validateQuery(ProjectQuerySchema), listProjects);

/**
 * Dashboard routes (must come before /:id route)
 */
router.get('/dashboard', verifyUserJwtToken, getUserDashboard);

router.get('/admin/dashboard', verifyAdminJwtToken, getAdminDashboard);

router.get('/electricity-price', verifyUserJwtToken, getElectricityPriceSuggestion);

router.get('/:id', verifyUserJwtToken, getProjectById);

router.put('/:id', verifyUserJwtToken, validateBody(ProjectUpdateSchema), updateProject);

router.post(
  '/:id/config-preview',
  verifyUserJwtToken,
  validateBody(ProjectConfigPreviewSchema),
  previewProjectConfig,
);

router.delete('/:id', verifyUserJwtToken, deleteProject);

/**
 * Project calculations and data
 */
router.get('/:id/analytics', verifyUserJwtToken, getProjectAnalytics);

router.get('/:id/sun-path', verifyUserJwtToken, getSunPath);

router.get('/:id/plan', verifyUserJwtToken, generatePlan);

router.post(
  '/:id/config/optimal',
  verifyUserJwtToken,
  validateBody(OptimalConfigSchema),
  calculateOptimalConfig
);

router.delete('/:id/admin', verifyAdminJwtToken, adminDeleteProject);

router.post(
  '/:id/refresh-production',
  verifyUserJwtToken,
  validateBody(RefreshProductionSchema),
  refreshProduction,
);

export default router;
