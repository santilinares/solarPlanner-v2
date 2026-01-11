import { Router } from 'express';
import {
  createPanel,
  listPanels,
  getPanelById,
  deletePanel,
} from '../controllers/panel.controller';
import { verifyUserJwtToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { PanelCreateSchema, PanelQuerySchema } from '../schemas/panel.schema';

const router = Router();

/**
 * Panel CRUD routes (mounted at /api/panels)
 */
router.post(
  '/',
  verifyUserJwtToken,
  validateBody(PanelCreateSchema),
  createPanel
);

router.get(
  '/',
  verifyUserJwtToken,
  validateQuery(PanelQuerySchema),
  listPanels
);

router.get('/:id', verifyUserJwtToken, getPanelById);

router.delete('/:id', verifyUserJwtToken, deletePanel);

export default router;
