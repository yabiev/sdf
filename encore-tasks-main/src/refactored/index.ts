// Export all layers
export * from './presentation';
export * from './business';
export * from './data';

// Export main service factory for easy access
export { ServiceFactory } from './business/services';

// Export main types
export type {
  // Core entities
  Project,
  Board,
  Task,
  User,
  Column,
  
  // Data transfer objects
  CreateProjectData,
  UpdateProjectData,
  CreateBoardData,
  UpdateBoardData,
  DuplicateBoardData,
  CreateTaskData,
  UpdateTaskData,
  
  // Enums
  ProjectStatus,
  BoardStatus,
  TaskStatus,
  TaskPriority,
  UserRole,
  
  // API types
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  
  // Statistics
  ProjectStatistics,
  BoardStatistics,
  TaskStatistics
} from './data/types';