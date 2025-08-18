// Task Repository Implementation
// Handles all database operations for tasks

import { ITaskRepository } from '../../business/interfaces';
import {
  Task,
  SearchFilters,
  SortOptions,
  PaginationOptions,
  TaskStatus,
  TaskPriority
} from '../types';
import { databaseAdapter } from '../adapters/database-adapter';
import { generateId } from '../../../lib/utils';

export class TaskRepository implements ITaskRepository {
  private readonly tableName = 'tasks';
  private readonly commentsTableName = 'comments';
  private readonly attachmentsTableName = 'attachments';
  private readonly timeEntriesTableName = 'time_entries';
  private readonly taskActionsTableName = 'task_actions';

  async findById(id: string): Promise<Task | null> {
    try {
      const sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.id = ?
        GROUP BY t.id
      `;
      
      const row = await databaseAdapter.queryOne(sql, [id]);
      if (!row) return null;

      return this.transformToTask(row);
    } catch (error) {
      throw new Error(`Failed to find task by id: ${error}`);
    }
  }

  async findByColumnId(columnId: string, filters?: SearchFilters): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.column_id = ?
      `;
      
      const params: any[] = [columnId];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND t.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by column id: ${error}`);
    }
  }

  async findByBoardId(boardId: string, filters?: SearchFilters): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.board_id = ?
      `;
      
      const params: any[] = [boardId];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND t.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by board id: ${error}`);
    }
  }

  async findByProjectId(projectId: string, filters?: SearchFilters): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE t.project_id = ?
      `;
      
      const params: any[] = [projectId];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND t.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY t.id ORDER BY t.position ASC, t.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find tasks by project id: ${error}`);
    }
  }

  async findAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Task[]> {
    try {
      let sql = `
        SELECT t.*,
               json_group_array(
                 DISTINCT json_object(
                   'id', c.id,
                   'content', c.content,
                   'authorId', c.author_id,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as comments,
               json_group_array(
                 DISTINCT json_object(
                   'id', a.id,
                   'filename', a.filename,
                   'originalName', a.original_name,
                   'mimeType', a.mime_type,
                   'size', a.size,
                   'url', a.url,
                   'uploadedBy', a.uploaded_by,
                   'createdAt', a.created_at
                 )
               ) as attachments
        FROM tasks t
        LEFT JOIN comments c ON t.id = c.task_id
        LEFT JOIN attachments a ON t.id = a.task_id
        WHERE 1=1
      `;
      
      const params: any[] = [];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND t.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY t.id';

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'title':
            sql += ` ORDER BY t.title ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY t.created_at ${direction}`;
            break;
          case 'updatedAt':
            sql += ` ORDER BY t.updated_at ${direction}`;
            break;
          case 'dueDate':
            sql += ` ORDER BY t.due_date ${direction}`;
            break;
          case 'priority':
            sql += ` ORDER BY t.priority ${direction}`;
            break;
          case 'position':
            sql += ` ORDER BY t.position ${direction}`;
            break;
          default:
            sql += ' ORDER BY t.position ASC, t.created_at DESC';
        }
      } else {
        sql += ' ORDER BY t.position ASC, t.created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToTask(row));
    } catch (error) {
      throw new Error(`Failed to find all tasks: ${error}`);
    }
  }

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      const id = generateId();
      const now = new Date();
      
      const taskData = {
        id,
        title: task.title,
        description: task.description || null,
        project_id: task.projectId,
        board_id: task.boardId,
        column_id: task.columnId,
        assigned_to: task.assignedTo || null,
        created_by: task.createdBy,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        position: task.position || 0,
        due_date: task.dueDate ? task.dueDate.toISOString() : null,
        estimated_hours: task.estimatedHours || null,
        actual_hours: task.actualHours || null,
        tags: JSON.stringify(task.tags || []),
        metadata: JSON.stringify(task.metadata || {}),
        is_archived: task.isArchived ? 1 : 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, taskData);
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to create task: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const updateData: Record<string, any> = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.columnId !== undefined) updateData.column_id = updates.columnId;
      if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate ? updates.dueDate.toISOString() : null;
      if (updates.estimatedHours !== undefined) updateData.estimated_hours = updates.estimatedHours;
      if (updates.actualHours !== undefined) updateData.actual_hours = updates.actualHours;
      if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
      if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived ? 1 : 0;

      updateData.updated_at = new Date().toISOString();

      await databaseAdapter.update(this.tableName, id, updateData);
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to update task: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      // Delete related data
      await databaseAdapter.query('DELETE FROM comments WHERE task_id = ?', [id]);
      await databaseAdapter.query('DELETE FROM attachments WHERE task_id = ?', [id]);
      await databaseAdapter.query('DELETE FROM time_entries WHERE task_id = ?', [id]);
      await databaseAdapter.query('DELETE FROM task_actions WHERE task_id = ?', [id]);
      
      // Delete the task
      await databaseAdapter.delete(this.tableName, id);
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to delete task: ${error}`);
    }
  }

  async archive(id: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 1,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to archive task: ${error}`);
    }
  }

  async restore(id: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 0,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to restore task: ${error}`);
    }
  }

  async updatePosition(id: string, position: number): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        position,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update task position: ${error}`);
    }
  }

  async moveToColumn(id: string, columnId: string, position: number): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        column_id: columnId,
        position,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to move task to column: ${error}`);
    }
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        status,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to update task status: ${error}`);
    }
  }

  async updatePriority(id: string, priority: TaskPriority): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        priority,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to update task priority: ${error}`);
    }
  }

  async assignTask(id: string, userId: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        assigned_to: userId,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to assign task: ${error}`);
    }
  }

  async unassignTask(id: string): Promise<Task> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        assigned_to: null,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Task;
    } catch (error) {
      throw new Error(`Failed to unassign task: ${error}`);
    }
  }

  async addComment(taskId: string, comment: {
    content: string;
    authorId: string;
  }): Promise<void> {
    try {
      const commentData = {
        id: generateId(),
        task_id: taskId,
        content: comment.content,
        author_id: comment.authorId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.commentsTableName, commentData);
    } catch (error) {
      throw new Error(`Failed to add comment: ${error}`);
    }
  }

  async addAttachment(taskId: string, attachment: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    uploadedBy: string;
  }): Promise<void> {
    try {
      const attachmentData = {
        id: generateId(),
        task_id: taskId,
        filename: attachment.filename,
        original_name: attachment.originalName,
        mime_type: attachment.mimeType,
        size: attachment.size,
        url: attachment.url,
        uploaded_by: attachment.uploadedBy,
        created_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.attachmentsTableName, attachmentData);
    } catch (error) {
      throw new Error(`Failed to add attachment: ${error}`);
    }
  }

  async logTimeEntry(taskId: string, timeEntry: {
    userId: string;
    hours: number;
    description?: string;
    date: Date;
  }): Promise<void> {
    try {
      const timeEntryData = {
        id: generateId(),
        task_id: taskId,
        user_id: timeEntry.userId,
        hours: timeEntry.hours,
        description: timeEntry.description || null,
        date: timeEntry.date.toISOString().split('T')[0], // Date only
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.timeEntriesTableName, timeEntryData);
    } catch (error) {
      throw new Error(`Failed to log time entry: ${error}`);
    }
  }

  async logAction(taskId: string, action: {
    type: string;
    userId: string;
    details: Record<string, any>;
  }): Promise<void> {
    try {
      const actionData = {
        id: generateId(),
        task_id: taskId,
        action_type: action.type,
        user_id: action.userId,
        details: JSON.stringify(action.details),
        created_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.taskActionsTableName, actionData);
    } catch (error) {
      throw new Error(`Failed to log action: ${error}`);
    }
  }

  private transformToTask(row: any): Task {
    const comments = row.comments ? JSON.parse(row.comments) : [];
    const attachments = row.attachments ? JSON.parse(row.attachments) : [];
    
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      projectId: row.project_id,
      boardId: row.board_id,
      columnId: row.column_id,
      assignedTo: row.assigned_to,
      createdBy: row.created_by,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      position: row.position || 0,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      estimatedHours: row.estimated_hours,
      actualHours: row.actual_hours,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
      isArchived: Boolean(row.is_archived),
      comments: comments.filter((c: any) => c.id).map((c: any) => ({
        id: c.id,
        content: c.content,
        authorId: c.authorId,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      })),
      attachments: attachments.filter((a: any) => a.id).map((a: any) => ({
        id: a.id,
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
        url: a.url,
        uploadedBy: a.uploadedBy,
        createdAt: new Date(a.createdAt)
      })),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();