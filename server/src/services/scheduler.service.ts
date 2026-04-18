import schedule from 'node-schedule';
import mongoose from 'mongoose';
import { ProjectModel } from '../models/project.model';
import { projectService } from './project.service';

/**
 * Scheduler Service — 2.3 Nightly production refresh
 *
 * At 3:47 AM local time for each project, re-fetches Solcast data and
 * updates prodToday, nextProd, previousProd, and accumulates totalProd.
 */

// Track scheduled jobs keyed by project ID string
const scheduledJobs = new Map<string, schedule.Job>();

/**
 * Schedule the nightly refresh job for a single project.
 * Safe to call multiple times — cancels the previous job first.
 */
export function scheduleProjectJob(project: {
  _id: mongoose.Types.ObjectId;
  timezone?: string;
}): void {
  const projectId = project._id.toString();
  const tz = project.timezone ?? 'UTC';

  // Cancel any existing job for this project
  cancelProjectJob(projectId);

  const job = schedule.scheduleJob({ hour: 3, minute: 47, tz }, async () => {
    try {
      await projectService.refreshProductionData(projectId);
    } catch (error) {
      console.error(`[Scheduler] Failed to refresh project ${projectId}:`, error);
    }
  });

  if (job) {
    scheduledJobs.set(projectId, job);
    console.info(`[Scheduler] Scheduled nightly refresh for project ${projectId} at 03:47 ${tz}`);
  }
}

/**
 * Cancel the nightly refresh job for a project (call on project deletion).
 */
export function cancelProjectJob(projectId: string): void {
  const job = scheduledJobs.get(projectId);
  if (job) {
    job.cancel();
    scheduledJobs.delete(projectId);
    console.info(`[Scheduler] Cancelled refresh job for project ${projectId}`);
  }
}

/**
 * Load all existing projects and register their nightly jobs.
 * Called once on server startup after DB connection is established.
 */
export async function initializeScheduler(): Promise<void> {
  console.info('[Scheduler] Initializing nightly production refresh jobs...');

  const projects = await ProjectModel.find({}, '_id timezone').lean();

  for (const project of projects) {
    scheduleProjectJob(project as { _id: mongoose.Types.ObjectId; timezone?: string });
  }

  console.info(`[Scheduler] Registered ${projects.length} nightly refresh jobs`);
}
