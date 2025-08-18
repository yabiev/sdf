// Task Service Implementation
// Handles business logic for task management

import { ITaskService, ITaskRepository, ITaskValidator } from '../interfaces';
import {
  Task,
  SearchFilters,
  SortOptions,
  PaginationOptions,
  ValidationResult
} from '../../data/types';
import { taskRepository } from '../../data/repositories';
import { TaskValidator } from '../validators';

export class TaskService implements ITaskService {
  private repository: ITaskRepository;
  private validator: ITaskValidator;

  constructor(
    repository: ITaskRepository = taskRepository,
    validator: ITaskValidator = new TaskValidator()
  ) {
    this.repository = repository;
    this.validator = validator;
  }

  async getById(id: string): Promise<Task | null> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findById(id);
  }

  async getByColumnId(
    columnId: string,
    filters?: SearchFilters
  ): Promise<Task[]> {
    const validation = this.validator.validateId(columnId);
    if (!validation.isValid) {
      throw new Error(`Invalid column ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByColumnId(columnId, filters);
  }

  async getByBoardId(
    boardId: string,
    filters?: SearchFilters
  ): Promise<Task[]> {
    const validation = this.validator.validateId(boardId);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByBoardId(boardId, filters);
  }

  async getByProjectId(
    projectId: string,
    filters?: SearchFilters
  ): Promise<Task[]> {
    const validation = this.validator.validateId(projectId);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByProjectId(projectId, filters);
  }

  async getByAssigneeId(
    assigneeId: string,
    filters?: SearchFilters
  ): Promise<Task[]> {
    const validation = this.validator.validateId(assigneeId);
    if (!validation.isValid) {
      throw new Error(`Invalid assignee ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByAssigneeId(assigneeId, filters);
  }

  async getAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Task[]> {
    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    if (sort) {
      const validation = this.validator.validateSortOptions(sort);
      if (!validation.isValid) {
        throw new Error(`Invalid sort options: ${validation.errors.join(', ')}`);
      }
    }

    if (pagination) {
      const validation = this.validator.validatePaginationOptions(pagination);
      if (!pagination.isValid) {
        throw new Error(`Invalid pagination options: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.findAll(filters, sort, pagination);
  }

  async create(
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Task> {
    const validation = this.validator.validateCreate(taskData);
    if (!validation.isValid) {
      throw new Error(`Invalid task data: ${validation.errors.join(', ')}`);
    }

    // Business logic: Set default values
    const taskWithDefaults = {
      ...taskData,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      isArchived: taskData.isArchived || false,
      labels: taskData.labels || [],
      assignees: taskData.assignees || [],
      comments: taskData.comments || [],
      attachments: taskData.attachments || [],
      timeEntries: taskData.timeEntries || [],
      actions: taskData.actions || [],
      dependencies: taskData.dependencies || [],
      subtasks: taskData.subtasks || [],
      estimatedHours: taskData.estimatedHours || null,
      actualHours: taskData.actualHours || 0,
      completionPercentage: taskData.completionPercentage || 0
    };

    // Business logic: Validate due date
    if (taskWithDefaults.dueDate && taskWithDefaults.dueDate < new Date()) {
      console.warn('Task created with due date in the past');
    }

    return await this.repository.create(taskWithDefaults);
  }

  async update(
    id: string,
    updates: Partial<Task>
  ): Promise<Task> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Prevent certain updates on archived tasks
    if (existingTask.isArchived && (updates.title || updates.description || updates.status)) {
      throw new Error('Cannot update title, description, or status of archived task');
    }

    // Business logic: Auto-complete task if completion percentage is 100%
    if (updates.completionPercentage === 100 && existingTask.status !== 'done') {
      updates.status = 'done';
      updates.completedAt = new Date();
    }

    // Business logic: Reset completion date if status changes from done
    if (updates.status && updates.status !== 'done' && existingTask.status === 'done') {
      updates.completedAt = null;
    }

    return await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Check for dependencies
    if (existingTask.subtasks && existingTask.subtasks.length > 0) {
      throw new Error('Cannot delete task with subtasks. Delete subtasks first.');
    }

    await this.repository.delete(id);
  }

  async archive(id: string): Promise<Task> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    if (existingTask.isArchived) {
      throw new Error('Task is already archived');
    }

    return await this.repository.archive(id);
  }

  async restore(id: string): Promise<Task> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    if (!existingTask.isArchived) {
      throw new Error('Task is not archived');
    }

    return await this.repository.restore(id);
  }

  async updatePosition(
    id: string,
    newColumnId: string,
    position: number
  ): Promise<void> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const columnValidation = this.validator.validateId(newColumnId);
    if (!columnValidation.isValid) {
      throw new Error(`Invalid column ID: ${columnValidation.errors.join(', ')}`);
    }

    if (position < 0) {
      throw new Error('Position must be non-negative');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot move archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot move archived task');
    }

    await this.repository.updatePosition(id, newColumnId, position);
  }

  async updateStatus(id: string, status: Task['status']): Promise<Task> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!['todo', 'in_progress', 'review', 'done'].includes(status)) {
      throw new Error('Invalid status');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot change status of archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot change status of archived task');
    }

    const updates: Partial<Task> = { status };

    // Business logic: Set completion date when marking as done
    if (status === 'done' && existingTask.status !== 'done') {
      updates.completedAt = new Date();
      updates.completionPercentage = 100;
    }

    // Business logic: Clear completion date when moving from done
    if (status !== 'done' && existingTask.status === 'done') {
      updates.completedAt = null;
    }

    return await this.repository.updateStatus(id, status);
  }

  async updatePriority(id: string, priority: Task['priority']): Promise<Task> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      throw new Error('Invalid priority');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot change priority of archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot change priority of archived task');
    }

    return await this.repository.updatePriority(id, priority);
  }

  async assignUser(taskId: string, userId: string): Promise<void> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot assign users to archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot assign users to archived task');
    }

    // Business logic: Check if user is already assigned
    const isAlreadyAssigned = existingTask.assignees?.some(a => a.userId === userId);
    if (isAlreadyAssigned) {
      throw new Error('User is already assigned to this task');
    }

    await this.repository.assignUser(taskId, userId);
  }

  async unassignUser(taskId: string, userId: string): Promise<void> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot unassign users from archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot unassign users from archived task');
    }

    await this.repository.unassignUser(taskId, userId);
  }

  async addComment(
    taskId: string,
    comment: Omit<Task['comments'][0], 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Task['comments'][0]> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!comment.content || comment.content.trim().length === 0) {
      throw new Error('Comment content is required');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot add comments to archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot add comments to archived task');
    }

    return await this.repository.addComment(taskId, comment);
  }

  async updateComment(
    taskId: string,
    commentId: string,
    updates: Partial<Task['comments'][0]>
  ): Promise<Task['comments'][0]> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const commentIdValidation = this.validator.validateId(commentId);
    if (!commentIdValidation.isValid) {
      throw new Error(`Invalid comment ID: ${commentIdValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot update comments on archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot update comments on archived task');
    }

    return await this.repository.updateComment(taskId, commentId, updates);
  }

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const commentIdValidation = this.validator.validateId(commentId);
    if (!commentIdValidation.isValid) {
      throw new Error(`Invalid comment ID: ${commentIdValidation.errors.join(', ')}`);
    }

    await this.repository.deleteComment(taskId, commentId);
  }

  async addAttachment(
    taskId: string,
    attachment: Omit<Task['attachments'][0], 'id' | 'createdAt'>
  ): Promise<Task['attachments'][0]> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!attachment.filename || !attachment.url) {
      throw new Error('Attachment filename and URL are required');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot add attachments to archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot add attachments to archived task');
    }

    return await this.repository.addAttachment(taskId, attachment);
  }

  async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const attachmentIdValidation = this.validator.validateId(attachmentId);
    if (!attachmentIdValidation.isValid) {
      throw new Error(`Invalid attachment ID: ${attachmentIdValidation.errors.join(', ')}`);
    }

    await this.repository.deleteAttachment(taskId, attachmentId);
  }

  async addTimeEntry(
    taskId: string,
    timeEntry: Omit<Task['timeEntries'][0], 'id' | 'createdAt'>
  ): Promise<Task['timeEntries'][0]> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!timeEntry.hours || timeEntry.hours <= 0) {
      throw new Error('Time entry hours must be positive');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    return await this.repository.addTimeEntry(taskId, timeEntry);
  }

  async updateTimeEntry(
    taskId: string,
    timeEntryId: string,
    updates: Partial<Task['timeEntries'][0]>
  ): Promise<Task['timeEntries'][0]> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const timeEntryIdValidation = this.validator.validateId(timeEntryId);
    if (!timeEntryIdValidation.isValid) {
      throw new Error(`Invalid time entry ID: ${timeEntryIdValidation.errors.join(', ')}`);
    }

    if (updates.hours !== undefined && updates.hours <= 0) {
      throw new Error('Time entry hours must be positive');
    }

    return await this.repository.updateTimeEntry(taskId, timeEntryId, updates);
  }

  async deleteTimeEntry(taskId: string, timeEntryId: string): Promise<void> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const timeEntryIdValidation = this.validator.validateId(timeEntryId);
    if (!timeEntryIdValidation.isValid) {
      throw new Error(`Invalid time entry ID: ${timeEntryIdValidation.errors.join(', ')}`);
    }

    await this.repository.deleteTimeEntry(taskId, timeEntryId);
  }

  async logAction(
    taskId: string,
    action: Omit<Task['actions'][0], 'id' | 'createdAt'>
  ): Promise<Task['actions'][0]> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!action.type || !action.userId) {
      throw new Error('Action type and user ID are required');
    }

    return await this.repository.logAction(taskId, action);
  }

  async search(
    query: string,
    projectId?: string,
    boardId?: string,
    filters?: SearchFilters
  ): Promise<Task[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    if (projectId) {
      const validation = this.validator.validateId(projectId);
      if (!validation.isValid) {
        throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
      }
    }

    if (boardId) {
      const validation = this.validator.validateId(boardId);
      if (!validation.isValid) {
        throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
      }
    }

    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.search(query, projectId, boardId, filters);
  }

  async getOverdueTasks(userId?: string): Promise<Task[]> {
    if (userId) {
      const validation = this.validator.validateId(userId);
      if (!validation.isValid) {
        throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.getOverdueTasks(userId);
  }

  async getUpcomingTasks(
    userId?: string,
    days: number = 7
  ): Promise<Task[]> {
    if (userId) {
      const validation = this.validator.validateId(userId);
      if (!validation.isValid) {
        throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
      }
    }

    if (days <= 0 || days > 365) {
      throw new Error('Days must be between 1 and 365');
    }

    return await this.repository.getUpcomingTasks(userId, days);
  }

  async canUserAccess(taskId: string, userId: string): Promise<boolean> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      return false;
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      return false;
    }

    try {
      const task = await this.repository.findById(taskId);
      if (!task) {
        return false;
      }

      // Check board/project access through respective services
      // This would typically be injected as dependencies
      // For now, we'll assume access if task exists
      return true;
    } catch {
      return false;
    }
  }

  async canUserEdit(taskId: string, userId: string): Promise<boolean> {
    const hasAccess = await this.canUserAccess(taskId, userId);
    if (!hasAccess) {
      return false;
    }

    try {
      const task = await this.repository.findById(taskId);
      if (!task) {
        return false;
      }

      // Business logic: Cannot edit archived tasks
      if (task.isArchived) {
        return false;
      }

      // Check board/project permissions through respective services
      // This would typically be injected as dependencies
      // For now, we'll assume edit access if task exists and is not archived
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();