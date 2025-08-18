// Business Services Index
// Centralized export of all business services

// Service implementations
export { ProjectService, projectService } from './project.service';
export { BoardService, boardService } from './board.service';
export { TaskService, taskService } from './task.service';
export { UserService, userService } from './user.service';

// Re-export service interfaces for convenience
export type {
  IProjectService,
  IBoardService,
  ITaskService,
  IUserService
} from '../interfaces';

// Service factory for dependency injection
export class ServiceFactory {
  private static projectServiceInstance: ProjectService;
  private static boardServiceInstance: BoardService;
  private static taskServiceInstance: TaskService;
  private static userServiceInstance: UserService;

  static getProjectService(): ProjectService {
    if (!this.projectServiceInstance) {
      this.projectServiceInstance = new ProjectService();
    }
    return this.projectServiceInstance;
  }

  static getBoardService(): BoardService {
    if (!this.boardServiceInstance) {
      this.boardServiceInstance = new BoardService();
    }
    return this.boardServiceInstance;
  }

  static getTaskService(): TaskService {
    if (!this.taskServiceInstance) {
      this.taskServiceInstance = new TaskService();
    }
    return this.taskServiceInstance;
  }

  static getUserService(): UserService {
    if (!this.userServiceInstance) {
      this.userServiceInstance = new UserService();
    }
    return this.userServiceInstance;
  }

  // Reset all instances (useful for testing)
  static reset(): void {
    this.projectServiceInstance = null as any;
    this.boardServiceInstance = null as any;
    this.taskServiceInstance = null as any;
    this.userServiceInstance = null as any;
  }
}

// Default service instances for convenience
export const services = {
  project: projectService,
  board: boardService,
  task: taskService,
  user: userService
} as const;