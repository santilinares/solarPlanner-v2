import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success, created } from '../utils/response';
import { panelService } from '../services/panel.service';
import { PanelCreateInput, PanelQueryInput } from '../schemas/panel.schema';

/**
 * Panel Controller
 * Handles solar panel HTTP requests
 */

/**
 * @route   POST /panels
 * @desc    Create a new solar panel
 * @access  Private
 */
export const createPanel = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const panel = await panelService.createPanel(userId, req.body as PanelCreateInput);
  return created(res, panel, 'Panel created successfully');
});

/**
 * @route   GET /panels
 * @desc    List/filter panels
 * @access  Private
 */
export const listPanels = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const userRole = req.userRole!;
  
  // Admin can see all panels, users see global + their own personal panels
  const effectiveUserId = userRole === 'admin' ? undefined : userId;
  
  const panels = await panelService.listPanels(req.query as PanelQueryInput, effectiveUserId);
  return success(res, panels);
});

/**
 * @route   GET /panels/:id
 * @desc    Get panel by ID
 * @access  Private
 */
export const getPanelById = asyncHandler(async (req: Request, res: Response) => {
  const panel = await panelService.getPanelById(req.params.id);
  return success(res, panel);
});

/**
 * @route   DELETE /panels/:id
 * @desc    Delete panel
 * @access  Private (Owner or Admin)
 */
export const deletePanel = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const userRole = req.userRole!;
  const isAdmin = userRole === 'admin';
  
  await panelService.deletePanel(req.params.id, userId, isAdmin);
  return success(res, null, 'Panel deleted successfully');
});
