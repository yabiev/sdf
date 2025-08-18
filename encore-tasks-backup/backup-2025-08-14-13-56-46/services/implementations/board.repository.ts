/**
 * Реализация репозитория для досок
 * Отвечает только за операции с данными (Single Responsibility)
 */

import {
  Board,
  BoardId,
  ProjectId,
  UserId,
  CreateBoardDto,
  UpdateBoardDto,
  BoardFilters,
  SortOptions,
  PaginationOptions,
  PaginatedResponse,
  BoardSettings,
  BoardVisibility
} from '../../types/board.types';

import { IBoardRepository } from '../interfaces/board.service.interface';

/**
 * Реализация репозитория досок для работы с базой данных
 */
export class BoardRepository implements IBoardRepository {
  constructor(private readonly databaseAdapter: any) {}

  async findById(id: BoardId): Promise<Board | null> {
    try {
      const query = `
        SELECT 
          id,
          name,
          description,
          project_id as projectId,
          visibility,
          settings,
          icon,
          color,
          position,
          created_by as createdBy,
          updated_by as updatedBy,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM boards 
        WHERE id = ? AND is_archived = 0
      `;
      
      const result = await this.databaseAdapter.query(query, [id]);
      
      if (!result || result.length === 0) {
        return null;
      }
      
      return this.mapRowToBoard(result[0]);
    } catch (error) {
      console.error('Error finding board by id:', error);
      throw new Error(`Failed to find board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByProjectId(projectId: ProjectId, filters?: BoardFilters): Promise<Board[]> {
    try {
      let query = `
        SELECT 
          id,
          name,
          description,
          project_id as projectId,
          visibility,
          settings,
          icon,
          color,
          position,
          created_by as createdBy,
          updated_by as updatedBy,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM boards 
        WHERE project_id = ?
      `;
      
      const params: any[] = [projectId];
      
      // Применяем фильтры
      if (filters) {
        if (filters.visibility) {
          query += ' AND visibility = ?';
          params.push(filters.visibility);
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
          query += ' AND (name LIKE ? OR description LIKE ?)';
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }
      } else {
        query += ' AND is_archived = 0';
      }
      
      query += ' ORDER BY position ASC, created_at DESC';
      
      const results = await this.databaseAdapter.query(query, params);
      
      return results.map((row: any) => this.mapRowToBoard(row));
    } catch (error) {
      console.error('Error finding boards by project:', error);
      throw new Error(`Failed to find boards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters?: BoardFilters, sort?: SortOptions, pagination?: PaginationOptions): Promise<PaginatedResponse<Board>> {
    try {
      let query = `
        SELECT 
          id,
          name,
          description,
          project_id as projectId,
          visibility,
          settings,
          icon,
          color,
          position,
          created_by as createdBy,
          updated_by as updatedBy,
          created_at as createdAt,
          updated_at as updatedAt,
          is_archived as isArchived,
          archived_at as archivedAt
        FROM boards 
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      // Применяем фильтры
      if (filters) {
        if (filters.projectId) {
          query += ' AND project_id = ?';
          params.push(filters.projectId);
        }
        
        if (filters.visibility) {
          query += ' AND visibility = ?';
          params.push(filters.visibility);
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
          query += ' AND (name LIKE ? OR description LIKE ?)';
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
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
      const boards = results.map((row: any) => this.mapRowToBoard(row));
      
      const totalPages = pagination ? Math.ceil(total / pagination.limit) : 1;
      const currentPage = pagination?.page || 1;
      
      return {
        data: boards,
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
      console.error('Error finding all boards:', error);
      throw new Error(`Failed to find boards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async create(boardData: CreateBoardDto & { createdBy: UserId }): Promise<Board> {
    try {
      const id = this.generateId();
      const now = new Date();
      const position = await this.getMaxPosition(boardData.projectId) + 1;
      
      const defaultSettings: BoardSettings = {
        allowTaskCreation: true,
        allowColumnReordering: true,
        enableTaskLimits: false,
        defaultTaskPriority: 'medium',
        autoArchiveCompletedTasks: false,
        ...boardData.settings
      };
      
      const query = `
        INSERT INTO boards (
          id, name, description, project_id, visibility, settings, 
          icon, color, position, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        id,
        boardData.name,
        boardData.description || null,
        boardData.projectId,
        boardData.visibility || 'team',
        JSON.stringify(defaultSettings),
        boardData.icon || null,
        boardData.color || '#3B82F6',
        position,
        boardData.createdBy,
        now,
        now
      ];
      
      await this.databaseAdapter.query(query, params);
      
      // Создаем колонки по умолчанию
      await this.createDefaultColumns(id, boardData.createdBy);
      
      const createdBoard = await this.findById(id);
      if (!createdBoard) {
        throw new Error('Failed to retrieve created board');
      }
      
      return createdBoard;
    } catch (error) {
      console.error('Error creating board:', error);
      throw new Error(`Failed to create board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: BoardId, boardData: UpdateBoardDto, updatedBy: UserId): Promise<Board | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      
      if (boardData.name !== undefined) {
        updateFields.push('name = ?');
        params.push(boardData.name);
      }
      
      if (boardData.description !== undefined) {
        updateFields.push('description = ?');
        params.push(boardData.description);
      }
      
      if (boardData.visibility !== undefined) {
        updateFields.push('visibility = ?');
        params.push(boardData.visibility);
      }
      
      if (boardData.settings !== undefined) {
        // Получаем текущие настройки и объединяем с новыми
        const currentBoard = await this.findById(id);
        if (currentBoard) {
          const updatedSettings = { ...currentBoard.settings, ...boardData.settings };
          updateFields.push('settings = ?');
          params.push(JSON.stringify(updatedSettings));
        }
      }
      
      if (boardData.icon !== undefined) {
        updateFields.push('icon = ?');
        params.push(boardData.icon);
      }
      
      if (boardData.color !== undefined) {
        updateFields.push('color = ?');
        params.push(boardData.color);
      }
      
      if (boardData.position !== undefined) {
        updateFields.push('position = ?');
        params.push(boardData.position);
      }
      
      if (updateFields.length === 0) {
        return await this.findById(id);
      }
      
      updateFields.push('updated_by = ?', 'updated_at = ?');
      params.push(updatedBy, new Date());
      params.push(id);
      
      const query = `UPDATE boards SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await this.databaseAdapter.query(query, params);
      
      return await this.findById(id);
    } catch (error) {
      console.error('Error updating board:', error);
      throw new Error(`Failed to update board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: BoardId): Promise<boolean> {
    try {
      // Сначала удаляем все связанные данные (задачи, колонки)
      await this.databaseAdapter.query('DELETE FROM tasks WHERE board_id = ?', [id]);
      await this.databaseAdapter.query('DELETE FROM columns WHERE board_id = ?', [id]);
      
      // Затем удаляем саму доску
      const query = 'DELETE FROM boards WHERE id = ?';
      const result = await this.databaseAdapter.query(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting board:', error);
      throw new Error(`Failed to delete board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async archive(id: BoardId, archivedBy: UserId): Promise<boolean> {
    try {
      const query = `
        UPDATE boards 
        SET is_archived = 1, archived_at = ?, updated_by = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const now = new Date();
      const result = await this.databaseAdapter.query(query, [now, archivedBy, now, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error archiving board:', error);
      throw new Error(`Failed to archive board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async restore(id: BoardId, restoredBy: UserId): Promise<boolean> {
    try {
      const query = `
        UPDATE boards 
        SET is_archived = 0, archived_at = NULL, updated_by = ?, updated_at = ?
        WHERE id = ?
      `;
      
      const now = new Date();
      const result = await this.databaseAdapter.query(query, [restoredBy, now, id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error restoring board:', error);
      throw new Error(`Failed to restore board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updatePosition(id: BoardId, newPosition: number): Promise<boolean> {
    try {
      const query = 'UPDATE boards SET position = ?, updated_at = ? WHERE id = ?';
      const result = await this.databaseAdapter.query(query, [newPosition, new Date(), id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating board position:', error);
      throw new Error(`Failed to update board position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMaxPosition(projectId: ProjectId): Promise<number> {
    try {
      const query = 'SELECT MAX(position) as maxPosition FROM boards WHERE project_id = ? AND is_archived = 0';
      const result = await this.databaseAdapter.query(query, [projectId]);
      
      return result[0]?.maxPosition || 0;
    } catch (error) {
      console.error('Error getting max position:', error);
      return 0;
    }
  }

  async existsByName(name: string, projectId: ProjectId, excludeId?: BoardId): Promise<boolean> {
    try {
      let query = 'SELECT COUNT(*) as count FROM boards WHERE name = ? AND project_id = ? AND is_archived = 0';
      const params: any[] = [name, projectId];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const result = await this.databaseAdapter.query(query, params);
      
      return result[0]?.count > 0;
    } catch (error) {
      console.error('Error checking board name existence:', error);
      return false;
    }
  }

  async countByProject(projectId: ProjectId): Promise<number> {
    try {
      const query = 'SELECT COUNT(*) as count FROM boards WHERE project_id = ? AND is_archived = 0';
      const result = await this.databaseAdapter.query(query, [projectId]);
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error counting boards by project:', error);
      return 0;
    }
  }

  private async createDefaultColumns(boardId: BoardId, createdBy: UserId): Promise<void> {
    const defaultColumns = [
      { name: 'To Do', color: '#EF4444', position: 1 },
      { name: 'In Progress', color: '#F59E0B', position: 2 },
      { name: 'Review', color: '#3B82F6', position: 3 },
      { name: 'Done', color: '#10B981', position: 4 }
    ];
    
    const now = new Date();
    
    for (const column of defaultColumns) {
      const columnId = this.generateId();
      const query = `
        INSERT INTO columns (
          id, name, board_id, position, color, settings, 
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const defaultColumnSettings = {
        allowTaskCreation: true,
        autoMoveRules: []
      };
      
      await this.databaseAdapter.query(query, [
        columnId,
        column.name,
        boardId,
        column.position,
        column.color,
        JSON.stringify(defaultColumnSettings),
        createdBy,
        now,
        now
      ]);
    }
  }

  private mapRowToBoard(row: any): Board {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      projectId: row.projectId,
      visibility: row.visibility as BoardVisibility,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      icon: row.icon,
      color: row.color,
      position: row.position,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
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
      'priority': 'position',
      'deadline': 'created_at',
      'position': 'position',
      'title': 'name'
    };
    
    return fieldMap[field] || 'created_at';
  }

  private generateId(): string {
    return `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}