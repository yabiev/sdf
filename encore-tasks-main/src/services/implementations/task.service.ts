/**
 * Реализация сервиса управления задачами
 * Координирует работу всех компонентов системы задач (Facade pattern)
 */

import {
  Task,
  TaskId,
  BoardId,
  ColumnId,
  ProjectId,
  UserId,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  SortOptions,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse,
  TaskEvent,
  TaskAssignment,
  TaskDependency,
  TimeEntry,
  TaskStatus,
  TaskPriority
} from '../../types/board.types';

import {
  ITaskService,
  ITaskRepository,
  ITaskValidator,
  ITaskAssignmentService,
  ITaskDependencyService,
  ITaskTimeTrackingService,
  ITaskEventService,
  ITaskNotificationService,
  ITaskCacheService
} from '../interfaces/task.service.interface';

/**
 * Основной сервис для управления задачами
 */
export class TaskService implements ITaskService {
  constructor(
    private readonly repository: ITaskRepository,
    private readonly validator: ITaskValidator,
    private readonly assignmentService: ITaskAssignmentService,
    private readonly dependencyService: ITaskDependencyService,
    private readonly timeTrackingService: ITaskTimeTrackingService,
    private readonly eventService: ITaskEventService,
    private readonly notificationService: ITaskNotificationService,
    private readonly cacheService?: ITaskCacheService
  ) {}

  async getTask(id: TaskId, userId: UserId): Promise<ServiceResponse<Task>> {
    try {
      // Проверяем кэш
      if (this.cacheService) {
        const cached = await this.cacheService.get(id);
        if (cached) {
          return { success: true, data: cached };
        }
      }

      const task = await this.repository.findById(id);
      if (!task) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Задача не найдена'
          }
        };
      }

      // Кэшируем результат
      if (this.cacheService) {
        await this.cacheService.set(id, task);
      }

      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTasks(
    filters?: TaskFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions,
    userId?: UserId
  ): Promise<ServiceResponse<PaginatedResponse<Task>>> {
    try {
      const result = await this.repository.findAll(filters, sort, pagination);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTasksByBoard(boardId: BoardId, userId: UserId): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks = await this.repository.findByBoardId(boardId);
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTasksByColumn(columnId: ColumnId, userId: UserId): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks = await this.repository.findByColumnId(columnId);
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTasksByAssignee(assigneeId: UserId, userId: UserId): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks = await this.repository.findByAssigneeId(assigneeId);
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async createTask(taskData: CreateTaskDto, createdBy: UserId): Promise<ServiceResponse<Task>> {
    try {
      // Валидация данных
      const validation = await this.validator.validateCreate(taskData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации данных',
            details: validation.errors
          }
        };
      }

      // Создаем задачу
      const task = await this.repository.create({ ...taskData, createdBy });

      // Обрабатываем назначения
      if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
        for (const assigneeId of taskData.assigneeIds) {
          await this.assignmentService.assignTask(task.id, assigneeId, createdBy);
        }
      }

      // Обрабатываем зависимости
      if (taskData.dependsOn && taskData.dependsOn.length > 0) {
        for (const dependencyId of taskData.dependsOn) {
          await this.dependencyService.addDependency(task.id, dependencyId, createdBy);
        }
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateByBoard(task.boardId);
        await this.cacheService.invalidateByColumn(task.columnId);
      }

      // Отправляем событие
      const event: TaskEvent = {
        id: this.generateEventId(),
        type: 'task_created',
        taskId: task.id,
        userId: createdBy,
        timestamp: new Date(),
        data: { task }
      };
      await this.eventService.emit(event);

      // Отправляем уведомления
      if (taskData.assigneeIds) {
        await this.notificationService.notifyTaskCreated(task, taskData.assigneeIds);
      }

      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async updateTask(id: TaskId, taskData: UpdateTaskDto, updatedBy: UserId): Promise<ServiceResponse<Task>> {
    try {
      // Валидация данных
      const validation = await this.validator.validateUpdate(id, taskData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации данных',
            details: validation.errors
          }
        };
      }

      // Получаем текущую задачу
      const currentTask = await this.repository.findById(id);
      if (!currentTask) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Задача не найдена'
          }
        };
      }

      // Обновляем задачу
      const updatedTask = await this.repository.update(id, taskData, updatedBy);
      if (!updatedTask) {
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Не удалось обновить задачу'
          }
        };
      }

      // Обрабатываем изменения в назначениях
      if (taskData.assigneeIds !== undefined) {
        const currentAssignees = await this.assignmentService.getTaskAssignments(id);
        const currentAssigneeIds = currentAssignees.map(a => a.assigneeId);
        
        // Удаляем старые назначения
        for (const assigneeId of currentAssigneeIds) {
          if (!taskData.assigneeIds.includes(assigneeId)) {
            await this.assignmentService.unassignTask(id, assigneeId, updatedBy);
          }
        }
        
        // Добавляем новые назначения
        for (const assigneeId of taskData.assigneeIds) {
          if (!currentAssigneeIds.includes(assigneeId)) {
            await this.assignmentService.assignTask(id, assigneeId, updatedBy);
          }
        }
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidate(id);
        await this.cacheService.invalidateByBoard(updatedTask.boardId);
        await this.cacheService.invalidateByColumn(updatedTask.columnId);
        
        if (currentTask.columnId !== updatedTask.columnId) {
          await this.cacheService.invalidateByColumn(currentTask.columnId);
        }
      }

      // Отправляем событие
      const event: TaskEvent = {
        id: this.generateEventId(),
        type: 'task_updated',
        taskId: id,
        userId: updatedBy,
        timestamp: new Date(),
        data: { 
          previousTask: currentTask,
          updatedTask,
          changes: taskData
        }
      };
      await this.eventService.emit(event);

      // Отправляем уведомления об изменениях
      const assignments = await this.assignmentService.getTaskAssignments(id);
      const assigneeIds = assignments.map(a => a.assigneeId);
      if (assigneeIds.length > 0) {
        await this.notificationService.notifyTaskUpdated(updatedTask, assigneeIds, taskData);
      }

      return { success: true, data: updatedTask };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async deleteTask(id: TaskId, deletedBy: UserId): Promise<ServiceResponse<boolean>> {
    try {
      // Валидация
      const validation = await this.validator.validateDelete(id);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации данных',
            details: validation.errors
          }
        };
      }

      // Получаем задачу перед удалением
      const task = await this.repository.findById(id);
      if (!task) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Задача не найдена'
          }
        };
      }

      // Удаляем все связанные данные
      await this.assignmentService.removeAllAssignments(id);
      await this.dependencyService.removeAllDependencies(id);
      await this.timeTrackingService.deleteAllEntries(id);

      // Удаляем задачу
      const deleted = await this.repository.delete(id);
      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Не удалось удалить задачу'
          }
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidate(id);
        await this.cacheService.invalidateByBoard(task.boardId);
        await this.cacheService.invalidateByColumn(task.columnId);
      }

      // Отправляем событие
      const event: TaskEvent = {
        id: this.generateEventId(),
        type: 'task_deleted',
        taskId: id,
        userId: deletedBy,
        timestamp: new Date(),
        data: { deletedTask: task }
      };
      await this.eventService.emit(event);

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async moveTask(id: TaskId, newColumnId: ColumnId, newPosition: number, movedBy: UserId): Promise<ServiceResponse<Task>> {
    try {
      const task = await this.repository.findById(id);
      if (!task) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Задача не найдена'
          }
        };
      }

      const oldColumnId = task.columnId;
      
      // Обновляем позицию задачи
      const updatedTask = await this.repository.update(id, {
        columnId: newColumnId,
        position: newPosition
      }, movedBy);

      if (!updatedTask) {
        return {
          success: false,
          error: {
            code: 'MOVE_FAILED',
            message: 'Не удалось переместить задачу'
          }
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidate(id);
        await this.cacheService.invalidateByColumn(oldColumnId);
        await this.cacheService.invalidateByColumn(newColumnId);
      }

      // Отправляем событие
      const event: TaskEvent = {
        id: this.generateEventId(),
        type: 'task_moved',
        taskId: id,
        userId: movedBy,
        timestamp: new Date(),
        data: {
          fromColumnId: oldColumnId,
          toColumnId: newColumnId,
          newPosition
        }
      };
      await this.eventService.emit(event);

      return { success: true, data: updatedTask };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async archiveTask(id: TaskId, archivedBy: UserId): Promise<ServiceResponse<boolean>> {
    try {
      const validation = await this.validator.validateArchive(id);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации данных',
            details: validation.errors
          }
        };
      }

      const archived = await this.repository.archive(id, archivedBy);
      if (!archived) {
        return {
          success: false,
          error: {
            code: 'ARCHIVE_FAILED',
            message: 'Не удалось архивировать задачу'
          }
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidate(id);
      }

      // Отправляем событие
      const event: TaskEvent = {
        id: this.generateEventId(),
        type: 'task_archived',
        taskId: id,
        userId: archivedBy,
        timestamp: new Date(),
        data: {}
      };
      await this.eventService.emit(event);

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async restoreTask(id: TaskId, restoredBy: UserId): Promise<ServiceResponse<boolean>> {
    try {
      const validation = await this.validator.validateRestore(id);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации данных',
            details: validation.errors
          }
        };
      }

      const restored = await this.repository.restore(id, restoredBy);
      if (!restored) {
        return {
          success: false,
          error: {
            code: 'RESTORE_FAILED',
            message: 'Не удалось восстановить задачу'
          }
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidate(id);
      }

      // Отправляем событие
      const event: TaskEvent = {
        id: this.generateEventId(),
        type: 'task_restored',
        taskId: id,
        userId: restoredBy,
        timestamp: new Date(),
        data: {}
      };
      await this.eventService.emit(event);

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async duplicateTask(id: TaskId, duplicatedBy: UserId, newTitle?: string): Promise<ServiceResponse<Task>> {
    try {
      const validation = await this.validator.validateDuplicate(id, newTitle);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Ошибка валидации данных',
            details: validation.errors
          }
        };
      }

      const originalTask = await this.repository.findById(id);
      if (!originalTask) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Исходная задача не найдена'
          }
        };
      }

      // Создаем дубликат
      const duplicateData: CreateTaskDto = {
        title: newTitle || `${originalTask.title} (копия)`,
        description: originalTask.description,
        boardId: originalTask.boardId,
        columnId: originalTask.columnId,
        priority: originalTask.priority,
        tags: originalTask.tags,
        estimatedHours: originalTask.estimatedHours,
        deadline: originalTask.deadline
      };

      const duplicatedTask = await this.repository.create({ ...duplicateData, createdBy: duplicatedBy });

      // Копируем назначения
      const assignments = await this.assignmentService.getTaskAssignments(id);
      for (const assignment of assignments) {
        await this.assignmentService.assignTask(duplicatedTask.id, assignment.assigneeId, duplicatedBy);
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateByBoard(duplicatedTask.boardId);
        await this.cacheService.invalidateByColumn(duplicatedTask.columnId);
      }

      // Отправляем событие
      const event: TaskEvent = {
        id: this.generateEventId(),
        type: 'task_duplicated',
        taskId: duplicatedTask.id,
        userId: duplicatedBy,
        timestamp: new Date(),
        data: {
          originalTaskId: id,
          duplicatedTask
        }
      };
      await this.eventService.emit(event);

      return { success: true, data: duplicatedTask };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTaskAssignments(id: TaskId): Promise<ServiceResponse<TaskAssignment[]>> {
    try {
      const assignments = await this.assignmentService.getTaskAssignments(id);
      return { success: true, data: assignments };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTaskDependencies(id: TaskId): Promise<ServiceResponse<TaskDependency[]>> {
    try {
      const dependencies = await this.dependencyService.getTaskDependencies(id);
      return { success: true, data: dependencies };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTaskTimeEntries(id: TaskId): Promise<ServiceResponse<TimeEntry[]>> {
    try {
      const entries = await this.timeTrackingService.getTaskTimeEntries(id);
      return { success: true, data: entries };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  async getTaskEvents(id: TaskId): Promise<ServiceResponse<TaskEvent[]>> {
    try {
      const events = await this.eventService.getTaskEvents(id);
      return { success: true, data: events };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
        }
      };
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}