/**
 * Реализация репозитория для колонок
 * Отвечает только за операции с данными (Single Responsibility)
 */

import {
  Column,
  ColumnId,
  BoardId,
  UserId,
  CreateColumnDto,
  UpdateColumnDto,
  ColumnFilters,
  SortOptions,
  PaginationOptions,
  PaginatedResponse
} from '../../types/board.types';

import { IColumnRepository } from '../interfaces/column.service.interface';
import { DatabaseAdapter } from '../../lib/database-adapter';

/**
 * Реализация репозитория колонок для работы с базой данных
 */
export class ColumnRepository implements IColumnRepository {
  constructor(private readonly databaseAdapter: DatabaseAdapter) {}

  async findById(id: ColumnId): Promise<Column | null> {
    try {
      const query = `
        SELECT 
          id,
          title,
          board_id as boardId,
          color,
          position,
          wip_limit as wipLimit,
          is_collapsed as isCollapsed,
          settings,
          created_by as createdBy,
          updated_by as updatedBy,
          created_at as createdAt,
          updated_at as updatedAt
        FROM columns 
        WHERE id = ?
      `;
      
      const result = await this.databaseAdapter.query(query, [id]);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return this.mapRowToColumn(result[0]);
    } catch (error) {
      console.error('Error finding column by id:', error);
      throw new Error(`Failed to find column: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByBoardId(boardId: BoardId, filters?: ColumnFilters): Promise<Column[]> {
    try {
      let query = `
        SELECT 
          id,
          title,
          board_id as boardId,
          color,
          position,
          wip_limit as wipLimit,
          is_collapsed as isCollapsed,
          settings,
          created_at as createdAt,
          updated_at as updatedAt
        FROM columns 
        WHERE board_id = ?
      `;
      
      const params: unknown[] = [boardId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.search) {
          query += ' AND title LIKE ?';
          params.push(`%${filters.search}%`);
        }
        
        if (filters.color) {
          query += ' AND color = ?';
          params.push(filters.color);
        }
        
        if (filters.isCollapsed !== undefined) {
          query += ' AND is_collapsed = ?';
          params.push(filters.isCollapsed ? 1 : 0);
        }
        
        if (filters.hasWipLimit !== undefined) {
          if (filters.hasWipLimit) {
            query += ' AND wip_limit IS NOT NULL AND wip_limit > 0';
          } else {
            query += ' AND (wip_limit IS NULL OR wip_limit = 0)';
          }
        }
      }
      
      query += ' ORDER BY position ASC, created_at ASC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: Record<string, unknown>) => this.mapRowToColumn(row));
    } catch (error) {
      console.error('Error finding columns by board:', error);
      throw new Error(`Failed to find columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters?: ColumnFilters, sort?: SortOptions, pagination?: PaginationOptions): Promise<PaginatedResponse<Column>> {
    try {
      let query = `
        SELECT 
          id,
          title,
          board_id as boardId,
          color,
          position,
          wip_limit as wipLimit,
          is_collapsed as isCollapsed,
          settings,
          created_at as createdAt,
          updated_at as updatedAt
        FROM columns 
        WHERE 1=1
      `;
      
      const params: unknown[] = [];
      
      // Применяем фильтры
      if (filters) {
        if (filters.boardId) {
          query += ' AND board_id = ?';
          params.push(filters.boardId);
        }
        
        if (filters.search) {
          query += ' AND title LIKE ?';
          params.push(`%${filters.search}%`);
        }
        
        if (filters.color) {
          query += ' AND color = ?';
          params.push(filters.color);
        }
        
        if (filters.isCollapsed !== undefined) {
          query += ' AND is_collapsed = ?';
          params.push(filters.isCollapsed ? 1 : 0);
        }
        
        if (filters.hasWipLimit !== undefined) {
          if (filters.hasWipLimit) {
            query += ' AND wip_limit IS NOT NULL AND wip_limit > 0';
          } else {
            query += ' AND (wip_limit IS NULL OR wip_limit = 0)';
          }
        }
      }
      
      // Применяем сортировку
      if (sort) {
        const sortField = this.mapSortField(sort.field);
        query += ` ORDER BY ${sortField} ${sort.direction.toUpperCase()}`;
      } else {
        query += ' ORDER BY position ASC, created_at ASC';
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
      const columns = results.map((row: Record<string, unknown>) => this.mapRowToColumn(row));
      
      const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
      const currentPage = pagination?.page || 1;
      
      return {
        data: columns,
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
      console.error('Error finding all columns:', error);
      throw new Error(`Failed to find columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(columnData: CreateColumnDto & { createdBy: UserId }): Promise<Column> {
    try {
      const id = this.generateId();
      const now = new Date();
      const position = await this.getMaxPosition(columnData.boardId) + 1;
      
      const query = `
        INSERT INTO columns (
          id, title, board_id, color, position, 
          is_collapsed, settings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        columnData.title,
        columnData.boardId,
        columnData.color || '#6B7280',
        position,
        columnData.isCollapsed ? 1 : 0,
        columnData.settings ? JSON.stringify(columnData.settings) : null,
        now,
        now
      ];
      
      await this.databaseAdapter.query(query, params);
      
      const createdColumn = await this.findById(id);
      if (!createdColumn) {
        throw new Error('Failed to retrieve created column');
      }
      
      return createdColumn;
    } catch (error) {
      console.error('Error creating column:', error);
      throw new Error(`Failed to create column: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: ColumnId, data: UpdateColumnDto): Promise<Column | null> {
    try {
      const updateFields: string[] = [];
      const params: unknown[] = [];
      
      if (data.title !== undefined) {
        updateFields.push('title = ?');
        params.push(data.title);
      }
      
      if (data.color !== undefined) {
        updateFields.push('color = ?');
        params.push(data.color);
      }
      
      if (data.position !== undefined) {
        updateFields.push('position = ?');
        params.push(data.position);
      }
      
      if (data.wipLimit !== undefined) {
        updateFields.push('wip_limit = ?');
        params.push(data.wipLimit);
      }
      
      if (data.isCollapsed !== undefined) {
        updateFields.push('is_collapsed = ?');
        params.push(data.isCollapsed ? 1 : 0);
      }
      
      if (data.settings !== undefined) {
        updateFields.push('settings = ?');
        params.push(data.settings ? JSON.stringify(data.settings) : null);
      }
      
      if (updateFields.length === 0) {
        return await this.findById(id);
      }
      
      updateFields.push('updated_at = ?');
      params.push(new Date());
      params.push(id);
      
      const query = `UPDATE columns SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await this.databaseAdapter.query(query, params);
      
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating column:', error);
      throw new Error(`Failed to update column: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: ColumnId): Promise<boolean> {
    try {
      const query = 'DELETE FROM columns WHERE id = ?';
      const result = await this.databaseAdapter.query(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting column:', error);
      throw new Error(`Failed to delete column: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePosition(id: ColumnId, newPosition: number): Promise<boolean> {
    try {
      const query = 'UPDATE columns SET position = ?, updated_at = ? WHERE id = ?';
      const result = await this.databaseAdapter.query(query, [newPosition, new Date(), id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating column position:', error);
      throw new Error(`Failed to update column position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePositions(columnOrders: Array<{ id: ColumnId; position: number }>): Promise<boolean> {
    try {
      const now = new Date();
      
      // Используем транзакцию для атомарного обновления позиций
      await this.databaseAdapter.beginTransaction();
      
      try {
        for (const order of columnOrders) {
          const query = 'UPDATE columns SET position = ?, updated_at = ? WHERE id = ?';
          await this.databaseAdapter.query(query, [order.position, now, order.id]);
        }
        
        await this.databaseAdapter.commit();
        return true;
      } catch (error) {
        await this.databaseAdapter.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating column positions:', error);
      throw new Error(`Failed to update column positions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMaxPosition(boardId: BoardId): Promise<number> {
    try {
      const query = 'SELECT MAX(position) as maxPosition FROM columns WHERE board_id = ?';
      const result = await this.databaseAdapter.query(query, [boardId]);
      
      return result[0]?.maxPosition || 0;
    } catch (error) {
      console.error('Error getting max position:', error);
      return 0;
    }
  }

  async existsByTitle(title: string, boardId: BoardId, excludeId?: ColumnId): Promise<boolean> {
    try {
      let query = 'SELECT COUNT(*) as count FROM columns WHERE title = ? AND board_id = ?';
      const params: unknown[] = [title, boardId];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const result = await this.databaseAdapter.query(query, params);
      
      return result[0]?.count > 0;
    } catch (error) {
      console.error('Error checking column title existence:', error);
      return false;
    }
  }

  async countByBoard(boardId: BoardId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM columns WHERE board_id = ?';
      const result = await this.databaseAdapter.query(query, [boardId]);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting columns by board:', error);
      return 0;
    }
  }

  async countTasks(columnId: ColumnId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM tasks WHERE column_id = ? AND is_archived = FALSE';
      const result = await this.databaseAdapter.query(query, [columnId]);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting tasks in column:', error);
      return 0;
    }
  }

  async getTasksByStatus(columnId: ColumnId): Promise<Record<string, number>> {
    try {
      const query = `
        SELECT status, COUNT(*) as count 
        FROM tasks 
        WHERE column_id = ? AND is_archived = FALSE 
        GROUP BY status
      `;
      
      const results = await this.databaseAdapter.query(query, [columnId]);
      
      const statusCounts: Record<string, number> = {};
      for (const row of results) {
        statusCounts[row.status] = row.count;
      }
      
      return statusCounts;
    } catch (error) {
      console.error('Error getting tasks by status:', error);
      return {};
    }
  }

  async getTasksByPriority(columnId: ColumnId): Promise<Record<string, number>> {
    try {
      const query = `
        SELECT priority, COUNT(*) as count 
        FROM tasks 
        WHERE column_id = ? AND is_archived = 0 
        GROUP BY priority
      `;
      
      const results = await this.databaseAdapter.query(query, [columnId]);
      
      const priorityCounts: Record<string, number> = {};
      for (const row of results) {
        priorityCounts[row.priority] = row.count;
      }
      
      return priorityCounts;
    } catch (error) {
      console.error('Error getting tasks by priority:', error);
      return {};
    }
  }

  async getAverageTaskCompletionTime(columnId: ColumnId): Promise<number | null> {
    try {
      const query = `
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, completed_at)) as avgHours
        FROM tasks 
        WHERE column_id = ? AND completed_at IS NOT NULL AND is_archived = FALSE
      `;
      
      const result = await this.databaseAdapter.query(query, [columnId]);
      
      return result[0]?.avgHours || null;
    } catch (error) {
      console.error('Error getting average task completion time:', error);
      return null;
    }
  }

  private mapRowToColumn(row: Record<string, unknown>): Column {
    return {
      id: row.id,
      title: row.title,
      boardId: row.boardId,
      color: row.color,
      position: row.position,
      wipLimit: row.wipLimit,
      isCollapsed: Boolean(row.isCollapsed),
      settings: row.settings ? JSON.parse(row.settings) : {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
      'position': 'position',
      'title': 'title',
      'color': 'color'
    };
    
    return fieldMap[field] || 'position';
  }

  private generateId(): string {
    return `column_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}