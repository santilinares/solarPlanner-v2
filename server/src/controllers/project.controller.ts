import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { success, created } from '../utils/response';
import { projectService } from '../services/project.service';
import {
  ProjectCreateInput,
  ProjectQueryInput,
  OptimalConfigInput,
} from '../schemas/project.schema';

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
  const userId = req.userId!;
  const userRole = req.userRole!;
  
  // Admin can see all projects, users see only their own
  const effectiveUserId = userRole === 'admin' ? undefined : userId;
  
  const projects = await projectService.listProjects(req.query as ProjectQueryInput, effectiveUserId);
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
  const userId = req.userId!;
  const userRole = req.userRole!;
  
  // Admin can see any project, users only their own
  const effectiveUserId = userRole === 'admin' ? undefined : userId;
  
  const project = await projectService.getProjectById(req.params.id, effectiveUserId);
  return success(res, project);
});

/**
 * @route   GET /projects/:id/sun-path
 * @desc    Get sun path calculations for project
 * @access  Private
 */
export const getSunPath = asyncHandler(async (req: Request, res: Response) => {
  const sunPath = await projectService.getSunPath(req.params.id);
  return success(res, sunPath);
});

/**
 * @route   GET /projects/:id/plan
 * @desc    Generate plan data for PDF
 * @access  Private
 */
export const generatePlan = asyncHandler(async (req: Request, res: Response) => {
  const planData = await projectService.generatePlanData(req.params.id);
  return success(res, planData);
});

/**
 * @route   POST /projects/:id/config/optimal
 * @desc    Calculate optimal panel configuration
 * @access  Private
 */
export const calculateOptimalConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await projectService.calculateOptimalConfig(req.body as OptimalConfigInput);
  return success(res, config);
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
 * @route   GET /projects/admin/summary
 * @desc    Get admin project summary
 * @access  Private (Admin)
 */
export const getAdminSummary = asyncHandler(async (_req: Request, res: Response) => {
  // TODO: Implement admin summary endpoint
  // This could return aggregated stats, counts by country, etc.
  // Async placeholder for future database operations
  // TODO: remove Promise.resolve when implemented
  return Promise.resolve(success(res, { message: 'Admin summary endpoint - to be implemented' }));
});
