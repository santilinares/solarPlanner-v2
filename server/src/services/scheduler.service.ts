import schedule from 'node-schedule';
import mongoose from 'mongoose';
import { ProjectModel } from '../models/project.model';
import { projectService } from './project.service';

/**
 * Scheduler Service — 2.3 Nightly production refresh
 *
 * re-fetches data and
 * updates prodToday, nextProd, previousProd, and accumulates totalProd.
 */

// Track scheduled jobs keyed by project ID string
const scheduledJobs = new Map<string, schedule.Job>();

// In-memory lock: project IDs whose refresh is currently running
const runningRefreshes = new Set<string>();

/**
 * Run a production refresh with a per-project lock to prevent overlapping executions.
 * If a refresh is already in progress for the given project, the call is skipped.
 */
async function safeRefresh(projectId: string): Promise<void> {
  if (runningRefreshes.has(projectId)) {
    console.warn(`[Scheduler] Refresh already in progress for project ${projectId}, skipping`);
    return;
  }
  runningRefreshes.add(projectId);
  try {
    await projectService.refreshProductionData(projectId);
  } finally {
    runningRefreshes.delete(projectId);
  }
}

/**
 * Returns true if a project missed its scheduled 03:47 refresh today (in its local timezone).
 * Uses Intl UTC offset arithmetic to avoid external timezone libraries.
 */
function missedTodaysRefresh(project: { timezone?: string; lastRefreshedAt?: Date }): boolean {
  const nowUtc = Date.now();

  let offsetMinutes = 0;
  if (project.timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: project.timezone,
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(new Date(nowUtc));
      const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
      // shortOffset format: "GMT+5:30", "GMT-3", "GMT+0", etc.
      const match = offsetStr.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        offsetMinutes = sign * (parseInt(match[2]) * 60 + parseInt(match[3] ?? '0'));
      }
    } catch (error) {
      console.warn(`[Scheduler] Unknown timezone "${project.timezone}", falling back to UTC:`, error);
    }
  }

  const localNowMs = nowUtc + offsetMinutes * 60_000;
  const localNow = new Date(localNowMs);

  // Build today's 03:47 local time as a UTC timestamp
  const scheduledTodayMs =
    Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 3, 47) -
    offsetMinutes * 60_000;

  // Server started before today's scheduled time — nothing missed
  if (nowUtc < scheduledTodayMs) return false;

  if (!project.lastRefreshedAt) return true;

  return project.lastRefreshedAt.getTime() < scheduledTodayMs;
}

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
      await safeRefresh(projectId);
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

  const projects = await ProjectModel.find({}, '_id timezone lastRefreshedAt').lean();

  const catchUpProjects = projects.filter(missedTodaysRefresh);

  if (catchUpProjects.length > 0) {
    console.info(`[Scheduler] Running catch-up refresh for ${catchUpProjects.length} project(s)...`);
    for (const project of catchUpProjects) {
      console.info(`[Scheduler] Running catch-up for project ${project._id.toString()}`);
      await safeRefresh(project._id.toString());
    }
  }

  for (const project of projects) {
    scheduleProjectJob(project as { _id: mongoose.Types.ObjectId; timezone?: string });
  }

  console.info(`[Scheduler] Registered ${projects.length} nightly refresh jobs`);
}
