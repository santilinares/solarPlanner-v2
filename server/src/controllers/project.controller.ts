import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success, created } from '../utils/response';
import { projectService } from '../services/project.service';
import {
  ProjectCreateInput,
  ProjectQueryInput,
  ProjectUpdateInput,
  OptimalConfigInput,
  OptimalConfigFromPolygonInput,
  ProjectConfigPreviewInput,
} from '../schemas/project.schema';
import { CallerContext } from '../types/project.types';


/**
 * Project Controller
 * Handles solar project HTTP requests
 */

/**
 * @route   POST /projects
 * @desc    Create a new project
 * @access  Private
 */
export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const project = await projectService.createProject(userId, req.body as ProjectCreateInput);
  return created(res, project, 'Project created successfully');
});

/**
 * @route   GET /projects
 * @desc    List/filter projects
 * @access  Private
 */
export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  const projects = await projectService.listProjects(req.query as unknown as ProjectQueryInput, caller);
  return success(res, projects);
});

/**
 * @route   GET /projects/dashboard
 * @desc    Get user dashboard statistics
 * @access  Private
 */
export const getUserDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const stats = await projectService.getUserDashboard(userId);
  return success(res, stats);
});

/**
 * @route   GET /projects/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin)
 */
export const getAdminDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await projectService.getAdminDashboard();
  return success(res, stats);
});

/**
 * @route   GET /projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  const project = await projectService.getProjectById(req.params.id, caller);
  return success(res, project);
});

/**
 * @route   PUT /projects/:id
 * @desc    Update project
 * @access  Private
 */
export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  const updatedProject = await projectService.updateProject(caller, req.params.id, req.body as ProjectUpdateInput);
  return success(res, updatedProject, 'Project updated successfully');
});

/**
 * @route   GET /projects/:id/sun-path
 * @desc    Get sun path calculations for project
 * @access  Private
 */

export const getSunPath = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  const sunPath = await projectService.getSunPath(req.params.id, caller);
  return success(res, sunPath);
});

/**
 * @route   GET /projects/:id/plan
 * @desc    Generate plan data for PDF
 * @access  Private
 */
export const generatePlan = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  // TODO - Revisar que se mete en el PDF. Hay que actualizar alguna cosa?
  const planData = await projectService.generatePlanData(req.params.id, caller);
  return success(res, planData);
});

/**
 * @route   POST /projects/:id/config/optimal
 * @desc    Calculate optimal panel configuration
 * @access  Private
 */
export const calculateOptimalConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await projectService.calculateOptimalConfig(req.body as OptimalConfigInput, req.params.id);
  return success(res, config);
});

/**
 * @route   POST /projects/calculate
 * @desc    Calculate optimal panel configuration from polygon (no project needed)
 * @access  Private
 */
export const calculateFromPolygon = asyncHandler(async (req: Request, res: Response) => {
  const config = await projectService.calculateFromPolygon(
    req.body as OptimalConfigFromPolygonInput
  );
  return success(res, config);
});

/**
 * @route   POST /projects/:id/config-preview
 * @desc    Calculate non-mutating configuration preview for project
 * @access  Private
 */
export const previewProjectConfig = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  const preview = await projectService.previewProjectConfig(
    req.params.id,
    caller,
    req.body as ProjectConfigPreviewInput,
  );
  return success(res, preview);
});

/**
 * @route   DELETE /projects/:id
 * @desc    Delete project (owner only)
 * @access  Private
 */
export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  await projectService.deleteProject(req.params.id, userId);
  return success(res, null, 'Project deleted successfully');
});

/**
 * @route   DELETE /projects/:id/admin
 * @desc    Admin delete project
 * @access  Private (Admin)
 */
export const adminDeleteProject = asyncHandler(async (req: Request, res: Response) => {
  await projectService.adminDeleteProject(req.params.id);
  return success(res, null, 'Project deleted successfully');
});

/**
 * @route   POST /projects/estimate
 * @desc    Visitor quick estimate — no auth required
 * @access  Public
 */
export const estimateProject = asyncHandler((req: Request, res: Response) => {
  const { area } = req.body as { area: { lat: number; lon: number }[] };
  const result = projectService.estimateFromPolygon(area);
  return success(res, result);
});

/**
 * @route   GET /projects/:id/analytics
 * @desc    Get performance and financial analytics for a project
 * @access  Private
 */
export const getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  const analytics = await projectService.getProjectAnalytics(req.params.id, caller);
  return success(res, analytics);
});

/**
 * @route   POST /projects/:id/refresh-production
 * @desc    Refresh production data for a project (on-demand by default, full recalc if forceFullRecalc=true)
 * @access  Private (project owner or admin)
 */
export const refreshProduction = asyncHandler(async (req: Request, res: Response) => {
  const caller: CallerContext = { role: req.userRole!, userId: req.userId! };
  const { forceFullRecalc } = req.body as { forceFullRecalc?: boolean };
  const result = await projectService.refreshProjectProductionOnDemand(
    req.params.id,
    caller,
    forceFullRecalc,
  );
  return success(res, result, 'Production data refreshed successfully');
});
