// Board Repository Implementation
// Handles all database operations for boards

import { IBoardRepository } from '../../business/interfaces';
import {
  Board,
  SearchFilters,
  SortOptions,
  PaginationOptions
} from '../types';
import { databaseAdapter } from '../adapters/database-adapter';
import { generateId } from '../../../lib/utils';

export class BoardRepository implements IBoardRepository {
  private readonly tableName = 'boards';
  private readonly columnsTableName = 'columns';

  async findById(id: string): Promise<Board | null> {
    try {
      const sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.title,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        WHERE b.id = ?
        GROUP BY b.id
      `;
      
      const row = await databaseAdapter.queryOne(sql, [id]);
      if (!row) return null;

      return this.transformToBoard(row);
    } catch (error) {
      throw new Error(`Failed to find board by id: ${error}`);
    }
  }

  async findByProjectId(projectId: string, filters?: SearchFilters): Promise<Board[]> {
    try {
      let sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.title,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        WHERE b.project_id = ?
      `;
      
      const params: any[] = [projectId];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND b.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (b.name LIKE ? OR b.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY b.id ORDER BY b.position ASC, b.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToBoard(row));
    } catch (error) {
      throw new Error(`Failed to find boards by project id: ${error}`);
    }
  }

  async findAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Board[]> {
    try {
      let sql = `
        SELECT b.*, 
               json_group_array(
                 json_object(
                   'id', c.id,
                   'title', c.title,
                   'position', c.position,
                   'color', c.color,
                   'isCollapsed', c.is_collapsed,
                   'taskLimit', c.task_limit,
                   'wipLimit', c.wip_limit,
                   'settings', c.settings,
                   'createdAt', c.created_at,
                   'updatedAt', c.updated_at
                 )
               ) as columns
        FROM boards b
        LEFT JOIN columns c ON b.id = c.board_id AND c.is_archived = 0
        WHERE 1=1
      `;
      
      const params: any[] = [];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND b.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (b.name LIKE ? OR b.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY b.id';

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'name':
            sql += ` ORDER BY b.name ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY b.created_at ${direction}`;
            break;
          case 'updatedAt':
            sql += ` ORDER BY b.updated_at ${direction}`;
            break;
          case 'position':
            sql += ` ORDER BY b.position ${direction}`;
            break;
          default:
            sql += ' ORDER BY b.position ASC, b.created_at DESC';
        }
      } else {
        sql += ' ORDER BY b.position ASC, b.created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToBoard(row));
    } catch (error) {
      throw new Error(`Failed to find all boards: ${error}`);
    }
  }

  async create(board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): Promise<Board> {
    try {
      await databaseAdapter.beginTransaction();

      const id = generateId();
      const now = new Date();
      
      const boardData = {
        id,
        name: board.name,
        description: board.description || null,
        project_id: board.projectId,
        type: board.type || 'kanban',
        position: board.position || 0,
        is_archived: board.isArchived ? 1 : 0,
        settings: JSON.stringify(board.settings || {}),
        view_settings: JSON.stringify(board.viewSettings || {}),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, boardData);

      // Create default columns if provided
      if (board.columns && board.columns.length > 0) {
        for (const column of board.columns) {
          const columnData = {
            id: generateId(),
            board_id: id,
            title: column.title,
            position: column.position,
            color: column.color || '#6B7280',
            is_collapsed: column.isCollapsed ? 1 : 0,
            task_limit: column.taskLimit || null,
            wip_limit: column.wipLimit || null,
            settings: JSON.stringify(column.settings || {}),
            is_archived: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          };
          await databaseAdapter.insert(this.columnsTableName, columnData);
        }
      } else {
        // Create default columns for new board
        const defaultColumns = [
          { title: 'To Do', position: 0, color: '#EF4444' },
          { title: 'In Progress', position: 1, color: '#F59E0B' },
          { title: 'Done', position: 2, color: '#10B981' }
        ];

        for (const column of defaultColumns) {
          const columnData = {
            id: generateId(),
            board_id: id,
            title: column.title,
            position: column.position,
            color: column.color,
            is_collapsed: 0,
            task_limit: null,
            wip_limit: null,
            settings: JSON.stringify({}),
            is_archived: 0,
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          };
          await databaseAdapter.insert(this.columnsTableName, columnData);
        }
      }

      await databaseAdapter.commitTransaction();
      return await this.findById(id) as Board;
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to create board: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Board>): Promise<Board> {
    try {
      const updateData: Record<string, any> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived ? 1 : 0;
      if (updates.settings !== undefined) updateData.settings = JSON.stringify(updates.settings);
      if (updates.viewSettings !== undefined) updateData.view_settings = JSON.stringify(updates.viewSettings);

      updateData.updated_at = new Date().toISOString();

      await databaseAdapter.update(this.tableName, id, updateData);
      return await this.findById(id) as Board;
    } catch (error) {
      throw new Error(`Failed to update board: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      // Delete all columns in this board
      await databaseAdapter.query('DELETE FROM columns WHERE board_id = ?', [id]);
      
      // Delete the board
      await databaseAdapter.delete(this.tableName, id);
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to delete board: ${error}`);
    }
  }

  async archive(id: string): Promise<Board> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 1,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Board;
    } catch (error) {
      throw new Error(`Failed to archive board: ${error}`);
    }
  }

  async restore(id: string): Promise<Board> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        is_archived: 0,
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as Board;
    } catch (error) {
      throw new Error(`Failed to restore board: ${error}`);
    }
  }

  async updatePosition(id: string, position: number): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, { 
        position,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update board position: ${error}`);
    }
  }

  async duplicate(id: string, newName: string): Promise<Board> {
    try {
      await databaseAdapter.beginTransaction();
      
      const originalBoard = await this.findById(id);
      if (!originalBoard) {
        throw new Error('Board not found');
      }

      const newBoardId = generateId();
      const now = new Date();
      
      const boardData = {
        id: newBoardId,
        name: newName,
        description: originalBoard.description,
        project_id: originalBoard.projectId,
        type: originalBoard.type,
        position: originalBoard.position + 1,
        is_archived: 0,
        settings: JSON.stringify(originalBoard.settings),
        view_settings: JSON.stringify(originalBoard.viewSettings),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, boardData);

      // Duplicate columns
      for (const column of originalBoard.columns) {
        const columnData = {
          id: generateId(),
          board_id: newBoardId,
          title: column.title,
          position: column.position,
          color: column.color,
          is_collapsed: column.isCollapsed ? 1 : 0,
          task_limit: column.taskLimit,
          wip_limit: column.wipLimit,
          settings: JSON.stringify(column.settings),
          is_archived: 0,
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        };
        await databaseAdapter.insert(this.columnsTableName, columnData);
      }

      await databaseAdapter.commitTransaction();
      return await this.findById(newBoardId) as Board;
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to duplicate board: ${error}`);
    }
  }

  async getStatistics(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    tasksPerColumn: Record<string, number>;
  }> {
    try {
      const sql = `
        SELECT 
          (SELECT COUNT(*) FROM tasks WHERE board_id = ? AND is_archived = 0) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE board_id = ? AND status = 'done' AND is_archived = 0) as completed_tasks,
          (SELECT COUNT(*) FROM tasks WHERE board_id = ? AND due_date < datetime('now') AND status != 'done' AND is_archived = 0) as overdue_tasks
      `;
      
      const result = await databaseAdapter.queryOne(sql, [id, id, id]);
      
      // Get tasks per column
      const columnSql = `
        SELECT c.id, c.title, COUNT(t.id) as task_count
        FROM columns c
        LEFT JOIN tasks t ON c.id = t.column_id AND t.is_archived = 0
        WHERE c.board_id = ? AND c.is_archived = 0
        GROUP BY c.id, c.title
      `;
      
      const columnResults = await databaseAdapter.query(columnSql, [id]);
      const tasksPerColumn: Record<string, number> = {};
      
      columnResults.forEach(row => {
        tasksPerColumn[row.title] = row.task_count || 0;
      });
      
      return {
        totalTasks: result?.total_tasks || 0,
        completedTasks: result?.completed_tasks || 0,
        overdueTasks: result?.overdue_tasks || 0,
        tasksPerColumn
      };
    } catch (error) {
      throw new Error(`Failed to get board statistics: ${error}`);
    }
  }

  private transformToBoard(row: any): Board {
    const columns = row.columns ? JSON.parse(row.columns) : [];
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      projectId: row.project_id,
      type: row.type || 'kanban',
      position: row.position || 0,
      isArchived: Boolean(row.is_archived),
      settings: JSON.parse(row.settings || '{}'),
      viewSettings: JSON.parse(row.view_settings || '{}'),
      columns: columns.filter((c: any) => c.id).map((c: any) => ({
        id: c.id,
        title: c.title,
        position: c.position,
        color: c.color,
        isCollapsed: Boolean(c.isCollapsed),
        taskLimit: c.taskLimit,
        wipLimit: c.wipLimit,
        settings: JSON.parse(c.settings || '{}'),
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt)
      })),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// Export singleton instance
export const boardRepository = new BoardRepository();