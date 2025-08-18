/**
 * Реализация репозитория для задач
 * Отвечает только за операции с данными (Single Responsibility)
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
  TaskStatus,
  TaskPriority
} from '../../types/board.types';

import { ITaskRepository } from '../interfaces/task.service.interface';

/**
 * Реализация репозитория задач для работы с базой данных
 */
export class TaskRepository implements ITaskRepository {
  constructor(private readonly databaseAdapter: any) {}

  async findById(id: TaskId): Promise<Task | null> {
    try {
      const query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE id = ? AND is_archived = FALSE
      `;
      
      const result = await this.databaseAdapter.query(query, [id]);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return this.mapRowToTask(result[0]);
    } catch (error) {
      console.error('Error finding task by id:', error);
      throw new Error(`Failed to find task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByBoardId(boardId: BoardId, filters?: TaskFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE board_id = ?
      `;
      
      const params: any[] = [boardId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.columnId) {
          query += ' AND column_id = ?';
          params.push(filters.columnId);
        }
        
        if (filters.status) {
          query += ' AND status = ?';
          params.push(filters.status);
        }
        
        if (filters.priority) {
          query += ' AND priority = ?';
          params.push(filters.priority);
        }
        
        if (filters.assigneeId) {
          query += ' AND assigned_to = ?';
          params.push(filters.assigneeId);
        }
        
        if (filters.createdBy) {
          query += ' AND created_by = ?';
          params.push(filters.createdBy);
        }
        
        if (filters.isArchived !== undefined) {
          query += ` AND is_archived = $${paramIndex}`;
          params.push(filters.isArchived);
        } else {
          query += ' AND is_archived = FALSE';
        }
        
        if (filters.search) {
          query += ' AND (title LIKE ? OR description LIKE ?)';
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }
        
        if (filters.tags && filters.tags.length > 0) {
          const tagConditions = filters.tags.map(() => 'JSON_CONTAINS(tags, ?)');
          query += ` AND (${tagConditions.join(' OR ')})`;
          filters.tags.forEach(tag => params.push(JSON.stringify(tag)));
        }
        
        if (filters.deadlineBefore) {
          query += ' AND deadline <= ?';
          params.push(filters.deadlineBefore);
        }
        
        if (filters.deadlineAfter) {
          query += ' AND deadline >= ?';
          params.push(filters.deadlineAfter);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: any) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by board:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByColumnId(columnId: ColumnId, filters?: TaskFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE column_id = ?
      `;
      
      const params: any[] = [columnId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.status) {
          query += ' AND status = ?';
          params.push(filters.status);
        }
        
        if (filters.priority) {
          query += ' AND priority = ?';
          params.push(filters.priority);
        }
        
        if (filters.assigneeId) {
          query += ' AND assigned_to = ?';
          params.push(filters.assigneeId);
        }
        
        if (filters.isArchived !== undefined) {
          query += ' AND is_archived = ?';
          params.push(filters.isArchived ? 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
        
        if (filters.search) {
          query += ' AND (title LIKE ? OR description LIKE ?)';
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: any) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by column:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByProjectId(projectId: ProjectId, filters?: TaskFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE project_id = ?
      `;
      
      const params: any[] = [projectId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.boardId) {
          query += ' AND board_id = ?';
          params.push(filters.boardId);
        }
        
        if (filters.columnId) {
          query += ' AND column_id = ?';
          params.push(filters.columnId);
        }
        
        if (filters.status) {
          query += ' AND status = ?';
          params.push(filters.status);
        }
        
        if (filters.priority) {
          query += ' AND priority = ?';
          params.push(filters.priority);
        }
        
        if (filters.assigneeId) {
          query += ' AND assigned_to = ?';
          params.push(filters.assigneeId);
        }
        
        if (filters.isArchived !== undefined) {
          query += ' AND is_archived = ?';
          params.push(filters.isArchived ? 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
        
        if (filters.search) {
          query += ' AND (title LIKE ? OR description LIKE ?)';
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: any) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by project:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByAssigneeId(assigneeId: UserId, filters?: TaskFilters): Promise<Task[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE assigned_to = ?
      `;
      
      const params: any[] = [assigneeId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.projectId) {
          query += ' AND project_id = ?';
          params.push(filters.projectId);
        }
        
        if (filters.boardId) {
          query += ' AND board_id = ?';
          params.push(filters.boardId);
        }
        
        if (filters.status) {
          query += ' AND status = ?';
          params.push(filters.status);
        }
        
        if (filters.priority) {
          query += ' AND priority = ?';
          params.push(filters.priority);
        }
        
        if (filters.isArchived !== undefined) {
          query += ' AND is_archived = ?';
          params.push(filters.isArchived ? 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY priority DESC, deadline ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: any) => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by assignee:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters?: TaskFilters, sort?: SortOptions, pagination?: PaginationOptions): Promise<PaginatedResponse<Task>> {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          board_id as boardId,
          column_id as columnId,
          project_id as projectId,
          status,
          priority,
          tags,
          position,
          estimated_hours as estimatedHours,
          actual_hours as actualHours,
          deadline,
          completed_at as completedAt,
          created_by as createdBy,
          updated_by as updatedBy,
          assigned_to as assignedTo,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM tasks 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      // Применяем фильтры
      if (filters) {
        if (filters.projectId) {
          query += ' AND project_id = ?';
          params.push(filters.projectId);
        }
        
        if (filters.boardId) {
          query += ' AND board_id = ?';
          params.push(filters.boardId);
        }
        
        if (filters.columnId) {
          query += ' AND column_id = ?';
          params.push(filters.columnId);
        }
        
        if (filters.status) {
          query += ' AND status = ?';
          params.push(filters.status);
        }
        
        if (filters.priority) {
          query += ' AND priority = ?';
          params.push(filters.priority);
        }
        
        if (filters.assigneeId) {
          query += ' AND assigned_to = ?';
          params.push(filters.assigneeId);
        }
        
        if (filters.createdBy) {
          query += ' AND created_by = ?';
          params.push(filters.createdBy);
        }
        
        if (filters.isArchived !== undefined) {
          query += ' AND is_archived = ?';
          params.push(filters.isArchived ? 1 : 0);
        } else {
          query += ' AND is_archived = 0';
        }
        
        if (filters.search) {
          query += ' AND (title LIKE ? OR description LIKE ?)';
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }
        
        if (filters.tags && filters.tags.length > 0) {
          const tagConditions = filters.tags.map(() => 'JSON_CONTAINS(tags, ?)');
          query += ` AND (${tagConditions.join(' OR ')})`;
          filters.tags.forEach(tag => params.push(JSON.stringify(tag)));
        }
        
        if (filters.deadlineBefore) {
          query += ' AND deadline <= ?';
          params.push(filters.deadlineBefore);
        }
        
        if (filters.deadlineAfter) {
          query += ' AND deadline >= ?';
          params.push(filters.deadlineAfter);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      // Применяем сортировку
      if (sort) {
        const sortField = this.mapSortField(sort.field);
        query += ` ORDER BY ${sortField} ${sort.direction.toUpperCase()}`;
      } else {
        query += ' ORDER BY position ASC, created_at DESC';
      }
      
      // Подсчитываем общее количество
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await this.databaseAdapter.query(countQuery, params);
      const total = countResult[0]?.total || 0;
      
      // Применяем пагинацию
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit, offset);
      }
      
      const results = await this.databaseAdapter.query(query, params);
      const tasks = results.map((row: any) => this.mapRowToTask(row));
      
      const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
      const currentPage = pagination?.page || 1;
      
      return {
        data: tasks,
        pagination: {
          page: currentPage,
          limit: pagination?.limit || total,
          total,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1
        }
      };
    } catch (error) {
      console.error('Error finding all tasks:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(taskData: CreateTaskDto & { createdBy: UserId }): Promise<Task> {
    try {
      const id = this.generateId();
      const now = new Date();
      const position = await this.getMaxPosition(taskData.columnId) + 1;
      
      const query = `
        INSERT INTO tasks (
          id, title, description, board_id, column_id, project_id, 
          status, priority, tags, position, estimated_hours, deadline,
          created_by, assigned_to, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        taskData.title,
        taskData.description || null,
        taskData.boardId,
        taskData.columnId,
        taskData.projectId,
        taskData.status || 'todo',
        taskData.priority || 'medium',
        taskData.tags ? JSON.stringify(taskData.tags) : null,
        position,
        taskData.estimatedHours || null,
        taskData.deadline || null,
        taskData.createdBy,
        taskData.assigneeIds && taskData.assigneeIds.length > 0 ? taskData.assigneeIds[0] : null,
        now,
        now
      ];
      
      await this.databaseAdapter.query(query, params);
      
      const createdTask = await this.findById(id);
      if (!createdTask) {
        throw new Error('Failed to retrieve created task');
      }
      
      return createdTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: TaskId, taskData: UpdateTaskDto, updatedBy: UserId): Promise<Task | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      
      if (taskData.title !== undefined) {
        updateFields.push('title = ?');
        params.push(taskData.title);
      }
      
      if (taskData.description !== undefined) {
        updateFields.push('description = ?');
        params.push(taskData.description);
      }
      
      if (taskData.columnId !== undefined) {
        updateFields.push('column_id = ?');
        params.push(taskData.columnId);
      }
      
      if (taskData.status !== undefined) {
        updateFields.push('status = ?');
        params.push(taskData.status);
        
        // Если статус изменился на completed, устанавливаем время завершения
        if (taskData.status === 'completed') {
          updateFields.push('completed_at = ?');
          params.push(new Date());
        } else {
          updateFields.push('completed_at = NULL');
        }
      }
      
      if (taskData.priority !== undefined) {
        updateFields.push('priority = ?');
        params.push(taskData.priority);
      }
      
      if (taskData.tags !== undefined) {
        updateFields.push('tags = ?');
        params.push(taskData.tags ? JSON.stringify(taskData.tags) : null);
      }
      
      if (taskData.position !== undefined) {
        updateFields.push('position = ?');
        params.push(taskData.position);
      }
      
      if (taskData.estimatedHours !== undefined) {
        updateFields.push('estimated_hours = ?');
        params.push(taskData.estimatedHours);
      }
      
      if (taskData.actualHours !== undefined) {
        updateFields.push('actual_hours = ?');
        params.push(taskData.actualHours);
      }
      
      if (taskData.deadline !== undefined) {
        updateFields.push('deadline = ?');
        params.push(taskData.deadline);
      }
      
      if (taskData.assigneeIds !== undefined) {
        // Для простоты берем первого назначенного пользователя
        const assigneeId = taskData.assigneeIds.length > 0 ? taskData.assigneeIds[0] : null;
        updateFields.push('assigned_to = ?');
        params.push(assigneeId);
      }
      
      if (updateFields.length === 0) {
        return await this.findById(id);
      }
      
      updateFields.push('updated_by = ?', 'updated_at = ?');
      params.push(updatedBy, new Date());
      params.push(id);
      
      const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await this.databaseAdapter.query(query, params);
      
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: TaskId): Promise<boolean> {
    try {
      const query = 'DELETE FROM tasks WHERE id = ?';
      const result = await this.databaseAdapter.query(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async archive(id: TaskId, archivedBy: UserId): Promise<boolean> {
    try {
      const query = `
        UPDATE tasks 
        SET is_archived = TRUE, archived_at = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const now = new Date();
      const result = await this.databaseAdapter.query(query, [now, archivedBy, now, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error archiving task:', error);
      throw new Error(`Failed to archive task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async restore(id: TaskId, restoredBy: UserId): Promise<boolean> {
    try {
      const query = `
        UPDATE tasks 
        SET is_archived = FALSE, archived_at = NULL, updated_by = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const now = new Date();
      const result = await this.databaseAdapter.query(query, [restoredBy, now, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error restoring task:', error);
      throw new Error(`Failed to restore task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePosition(id: TaskId, newPosition: number): Promise<boolean> {
    try {
      const query = 'UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?';
      const result = await this.databaseAdapter.query(query, [newPosition, new Date(), id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating task position:', error);
      throw new Error(`Failed to update task position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMaxPosition(columnId: ColumnId): Promise<number> {
    try {
      const query = 'SELECT MAX(position) as maxPosition FROM tasks WHERE column_id = ? AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [columnId]);
      
      return result[0]?.maxPosition || 0;
    } catch (error) {
      console.error('Error getting max position:', error);
      return 0;
    }
  }

  async existsByTitle(title: string, boardId: BoardId, excludeId?: TaskId): Promise<boolean> {
    try {
      let query = 'SELECT COUNT(*) as count FROM tasks WHERE title = ? AND board_id = ? AND is_archived = FALSE';
      const params: any[] = [title, boardId];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const result = await this.databaseAdapter.query(query, params);
      
      return result[0]?.count > 0;
    } catch (error) {
      console.error('Error checking task title existence:', error);
      return false;
    }
  }

  async countByBoard(boardId: BoardId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE board_id = ? AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [boardId]);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting tasks by board:', error);
      return 0;
    }
  }

  async countByColumn(columnId: ColumnId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE column_id = ? AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [columnId]);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting tasks by column:', error);
      return 0;
    }
  }

  async countByStatus(boardId: BoardId, status: TaskStatus): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE board_id = ? AND status = ? AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [boardId, status]);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting tasks by status:', error);
      return 0;
    }
  }

  async countByPriority(boardId: BoardId, priority: TaskPriority): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE board_id = ? AND priority = ? AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [boardId, priority]);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting tasks by priority:', error);
      return 0;
    }
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      boardId: row.boardId,
      columnId: row.columnId,
      projectId: row.projectId,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      tags: row.tags ? JSON.parse(row.tags) : [],
      position: row.position,
      estimatedHours: row.estimatedHours,
      actualHours: row.actualHours,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
      assignedTo: row.assignedTo,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      isArchived: Boolean(row.isArchived),
      archivedAt: row.archivedAt ? new Date(row.archivedAt) : undefined
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'priority': 'priority',
      'deadline': 'deadline',
      'position': 'position',
      'title': 'title',
      'status': 'status'
    };
    
    return fieldMap[field] || 'created_at';
  }

  private generateId(): string {
    // Import crypto for UUID generation
    const crypto = require('crypto');
    return crypto.randomUUID();
  }
}