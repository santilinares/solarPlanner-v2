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

  // TODO - Sin protección contra ejecuciones solapadas: si refreshProductionData tarda más de lo esperado
  // (por ejemplo, por un timeout de Solcast colgado), el siguiente job nocturno podría lanzarse en paralelo
  // para el mismo proyecto. Considerar añadir un flag de "en progreso" o un lock por proyecto.
  // TODO - Jobs no se recuperan si el servidor se reinicia después de las 3:47: initializeScheduler registra
  // los jobs al arrancar, pero si el servidor cae y vuelve a las 4:00, ese día no se refresca ningún proyecto.
  // Considerar añadir un "catch-up" al arrancar: si el último refresh fue hace más de X horas, ejecutarlo inmediatamente.
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
