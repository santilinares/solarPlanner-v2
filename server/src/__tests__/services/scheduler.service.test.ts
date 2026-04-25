import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these mocks are available inside the vi.mock factory (which is hoisted)
const { mockJobCancel, mockScheduleJob, mockRefreshProductionData, mockProjectFind } = vi.hoisted(() => {
  const mockJobCancel = vi.fn();
  const mockScheduleJob = vi.fn().mockReturnValue({ cancel: mockJobCancel });
  const mockRefreshProductionData = vi.fn().mockResolvedValue(undefined);
  const mockProjectFind = vi.fn();
  return { mockJobCancel, mockScheduleJob, mockRefreshProductionData, mockProjectFind };
});

vi.mock('node-schedule', () => ({
  default: {
    scheduleJob: mockScheduleJob,
  },
}));

vi.mock('../../models/project.model', () => ({
  ProjectModel: {
    find: mockProjectFind,
  },
}));

vi.mock('../../services/project.service', () => ({
  projectService: {
    refreshProductionData: mockRefreshProductionData,
  },
}));

import mongoose from 'mongoose';
import type { IProject } from '../../models/project.model';

function mockFind(result: Partial<IProject>[]): void {
  mockProjectFind.mockReturnValueOnce({
    lean: vi.fn().mockResolvedValue(result),
  });
}

import {
  scheduleProjectJob,
  cancelProjectJob,
  initializeScheduler,
} from '../../services/scheduler.service';

function makeProjectId() {
  return new mongoose.Types.ObjectId();
}

function makeLeanProject(overrides: { timezone?: string; lastRefreshedAt?: Date } = {}) {
  return {
    _id: makeProjectId(),
    timezone: overrides.timezone ?? 'UTC',
    lastRefreshedAt: overrides.lastRefreshedAt,
  };
}

// Build a UTC timestamp for today at the given hour:minute
function todayUtcAt(hour: number, minute: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));
}

describe('scheduleProjectJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduleJob.mockReturnValue({ cancel: mockJobCancel });
  });

  it('registers a nightly job at 03:47 in the project timezone', () => {
    const project = { _id: makeProjectId(), timezone: 'Europe/Madrid' };
    scheduleProjectJob(project);

    expect(mockScheduleJob).toHaveBeenCalledWith(
      { hour: 3, minute: 47, tz: 'Europe/Madrid' },
      expect.any(Function)
    );
  });

  it('defaults to UTC when no timezone is provided', () => {
    const project = { _id: makeProjectId() } as { _id: mongoose.Types.ObjectId; timezone?: string };
    scheduleProjectJob(project);

    expect(mockScheduleJob).toHaveBeenCalledWith(
      { hour: 3, minute: 47, tz: 'UTC' },
      expect.any(Function)
    );
  });

  it('cancels an existing job before registering a new one for the same project', () => {
    const project = { _id: makeProjectId(), timezone: 'UTC' };
    scheduleProjectJob(project);
    vi.clearAllMocks();
    mockScheduleJob.mockReturnValue({ cancel: mockJobCancel });

    scheduleProjectJob(project); // re-schedule same project

    expect(mockJobCancel).toHaveBeenCalledTimes(1);
    expect(mockScheduleJob).toHaveBeenCalledTimes(1);
  });
});

describe('cancelProjectJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduleJob.mockReturnValue({ cancel: mockJobCancel });
  });

  it('cancels and removes the job for a known project', () => {
    const project = { _id: makeProjectId(), timezone: 'UTC' };
    scheduleProjectJob(project);
    vi.clearAllMocks();

    cancelProjectJob(project._id.toString());

    expect(mockJobCancel).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for an unknown project id', () => {
    cancelProjectJob('non-existent-id');
    expect(mockJobCancel).not.toHaveBeenCalled();
  });
});

describe('initializeScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduleJob.mockReturnValue({ cancel: mockJobCancel });
  });

  it('schedules a job for every project', async () => {
    const projects = [
      makeLeanProject({ lastRefreshedAt: new Date() }),
      makeLeanProject({ lastRefreshedAt: new Date() }),
    ];
    mockFind(projects);

    await initializeScheduler();

    expect(mockScheduleJob).toHaveBeenCalledTimes(2);
  });

  it('runs catch-up refresh for projects that missed today\'s 03:47 UTC', async () => {
    // Fake "now" to 05:00 UTC — after the scheduled window
    vi.setSystemTime(todayUtcAt(5, 0));

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const projects = [
      makeLeanProject({ lastRefreshedAt: yesterday }),        // stale → catch-up
      makeLeanProject({ lastRefreshedAt: todayUtcAt(4, 0) }), // refreshed at 04:00 → no catch-up
    ];
    mockFind(projects);

    await initializeScheduler();

    vi.useRealTimers();

    expect(mockRefreshProductionData).toHaveBeenCalledTimes(1);
  });

  it('skips catch-up when server starts before 03:47 UTC today', async () => {
    vi.setSystemTime(todayUtcAt(2, 0));

    const projects = [makeLeanProject({ lastRefreshedAt: undefined })];
    mockFind(projects);

    await initializeScheduler();

    vi.useRealTimers();

    expect(mockRefreshProductionData).not.toHaveBeenCalled();
  });

  it('skips catch-up for projects already refreshed after today\'s 03:47', async () => {
    vi.setSystemTime(todayUtcAt(6, 0));

    const projects = [makeLeanProject({ lastRefreshedAt: todayUtcAt(4, 0) })];
    mockFind(projects);

    await initializeScheduler();

    vi.useRealTimers();

    expect(mockRefreshProductionData).not.toHaveBeenCalled();
  });

  it('runs catch-up for a project with no lastRefreshedAt after 03:47', async () => {
    vi.setSystemTime(todayUtcAt(5, 0));

    const projects = [makeLeanProject({ lastRefreshedAt: undefined })];
    mockFind(projects);

    await initializeScheduler();

    vi.useRealTimers();

    expect(mockRefreshProductionData).toHaveBeenCalledTimes(1);
  });
});

describe('safeRefresh concurrent-lock (via scheduled job callback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScheduleJob.mockReturnValue({ cancel: mockJobCancel });
  });

  it('skips a second refresh while the first is still running', async () => {
    let resolveFirst!: () => void;
    const slowRefresh = new Promise<void>((res) => {
      resolveFirst = res;
    });
    mockRefreshProductionData
      .mockReturnValueOnce(slowRefresh)
      .mockResolvedValue(undefined);

    const project = { _id: makeProjectId(), timezone: 'UTC' };
    scheduleProjectJob(project);

    const jobCallback = mockScheduleJob.mock.calls[0][1] as () => Promise<void>;

    // Fire callback twice without awaiting the first
    const first = jobCallback();
    const second = jobCallback(); // should be skipped due to lock

    resolveFirst();
    await first;
    await second;

    expect(mockRefreshProductionData).toHaveBeenCalledTimes(1);
  });
});
