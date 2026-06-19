import { Router } from 'express';
import {
  createCultivar,
  listCultivars,
  getCultivarById,
  updateCultivar,
  deleteCultivar,
} from '../controllers/cultivar.controller';
import { verifyUserJwtToken, verifyAdminJwtToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  CultivarCreateSchema,
  CultivarUpdateSchema,
  CultivarQuerySchema,
} from '../schemas/cultivar.schema';

const router = Router();

/**
 * Cultivar CRUD routes (mounted at /api/cultivars)
 */

// User-accessible
router.get('/', verifyUserJwtToken, validateQuery(CultivarQuerySchema), listCultivars);
router.get('/:id', verifyUserJwtToken, getCultivarById);

// Admin-only
router.post('/', verifyAdminJwtToken, validateBody(CultivarCreateSchema), createCultivar);
router.put('/:id', verifyAdminJwtToken, validateBody(CultivarUpdateSchema), updateCultivar);
router.delete('/:id', verifyAdminJwtToken, deleteCultivar);

export default router;
