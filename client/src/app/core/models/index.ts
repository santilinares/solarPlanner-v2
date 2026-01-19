// Re-export all models from a single entry point.
// NOTE: `project.model.ts` and `panel.model.ts` both export `Panel`.
// We alias the project-scoped one to avoid TS2308 ambiguity.

export * from './user.model';
export * from './api.model';
export * from './http-error.model';

export {
  Project,
  Coordinates,
  Polygon,
  MonthlyProduction,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  Panel as ProjectPanel,
  SunPosition,
  SunPathData,
  PanelDetails,
  PlanData,
  DashboardStats,
  ProjectResponse,
  OptimalConfigResponse,
  OptimalConfigFromPolygonRequest,
} from './project.model';

export * from './panel.model';
