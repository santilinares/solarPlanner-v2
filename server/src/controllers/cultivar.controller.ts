import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success, created } from '../utils/response';
import { cultivarService } from '../services/cultivar.service';
import { CultivarCreateInput, CultivarQueryInput, CultivarUpdateInput } from '../schemas/cultivar.schema';

/**
 * Cultivar Controller
 * Handles cultivar HTTP requests
 */

/**
 * @route   POST /cultivars
 * @desc    Create a new cultivar
 * @access  Admin
 */
export const createCultivar = asyncHandler(async (req: Request, res: Response) => {
  const cultivar = await cultivarService.createCultivar(req.body as CultivarCreateInput);
  return created(res, cultivar, 'Cultivar created successfully');
});

/**
 * @route   GET /cultivars
 * @desc    List/filter cultivars
 * @access  User
 */
export const listCultivars = asyncHandler(async (req: Request, res: Response) => {
  const cultivars = await cultivarService.listCultivars(req.query as unknown as CultivarQueryInput);
  return success(res, cultivars);
});

/**
 * @route   GET /cultivars/:id
 * @desc    Get cultivar by ID
 * @access  User
 */
export const getCultivarById = asyncHandler(async (req: Request, res: Response) => {
  const cultivar = await cultivarService.getCultivarById(req.params.id);
  return success(res, cultivar);
});

/**
 * @route   PUT /cultivars/:id
 * @desc    Update cultivar
 * @access  Admin
 */
export const updateCultivar = asyncHandler(async (req: Request, res: Response) => {
  const cultivar = await cultivarService.updateCultivar(req.params.id, req.body as CultivarUpdateInput);
  return success(res, cultivar, 'Cultivar updated successfully');
});

/**
 * @route   DELETE /cultivars/:id
 * @desc    Delete cultivar
 * @access  Admin
 */
export const deleteCultivar = asyncHandler(async (req: Request, res: Response) => {
  await cultivarService.deleteCultivar(req.params.id);
  return success(res, null, 'Cultivar deleted successfully');
});
