// Board Service Implementation
// Handles business logic for board management

import { IBoardService, IBoardRepository, IBoardValidator } from '../interfaces';
import {
  Board,
  SearchFilters,
  SortOptions,
  PaginationOptions,
  ValidationResult
} from '../../data/types';
import { boardRepository } from '../../data/repositories';
import { BoardValidator } from '../validators';

export class BoardService implements IBoardService {
  private repository: IBoardRepository;
  private validator: IBoardValidator;

  constructor(
    repository: IBoardRepository = boardRepository,
    validator: IBoardValidator = new BoardValidator()
  ) {
    this.repository = repository;
    this.validator = validator;
  }

  async getById(id: string): Promise<Board | null> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findById(id);
  }

  async getByProjectId(
    projectId: string,
    filters?: SearchFilters
  ): Promise<Board[]> {
    const validation = this.validator.validateId(projectId);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByProjectId(projectId, filters);
  }

  async getAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Board[]> {
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
      if (!validation.isValid) {
        throw new Error(`Invalid pagination options: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.findAll(filters, sort, pagination);
  }

  async create(
    boardData: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Board> {
    const validation = this.validator.validateCreate(boardData);
    if (!validation.isValid) {
      throw new Error(`Invalid board data: ${validation.errors.join(', ')}`);
    }

    // Business logic: Set default values
    const boardWithDefaults = {
      ...boardData,
      color: boardData.color || '#3B82F6',
      isArchived: boardData.isArchived || false,
      settings: boardData.settings || {
        allowComments: true,
        allowAttachments: true,
        requireDueDates: false,
        autoArchiveCards: false,
        cardAging: false,
        votingEnabled: false,
        selfJoin: false,
        permissionLevel: 'private'
      },
      statistics: boardData.statistics || {
        totalColumns: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        lastActivity: new Date()
      }
    };

    return await this.repository.create(boardWithDefaults);
  }

  async update(
    id: string,
    updates: Partial<Board>
  ): Promise<Board> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid board ID: ${idValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Prevent certain updates on archived boards
    if (existingBoard.isArchived && (updates.name || updates.description)) {
      throw new Error('Cannot update name or description of archived board');
    }

    return await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Archive instead of delete if board has tasks
    const stats = await this.repository.getStatistics(id);
    if (stats.totalTasks > 0) {
      throw new Error('Cannot delete board with existing tasks. Archive it instead.');
    }

    await this.repository.delete(id);
  }

  async archive(id: string): Promise<Board> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    if (existingBoard.isArchived) {
      throw new Error('Board is already archived');
    }

    return await this.repository.archive(id);
  }

  async restore(id: string): Promise<Board> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    if (!existingBoard.isArchived) {
      throw new Error('Board is not archived');
    }

    return await this.repository.restore(id);
  }

  async duplicate(
    id: string,
    newName?: string,
    includeCards?: boolean
  ): Promise<Board> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Generate default name if not provided
    const duplicateName = newName || `${existingBoard.name} (Copy)`;
    
    return await this.repository.duplicate(id, duplicateName, includeCards || false);
  }

  async updatePosition(id: string, position: number): Promise<void> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid board ID: ${idValidation.errors.join(', ')}`);
    }

    if (position < 0) {
      throw new Error('Position must be non-negative');
    }

    await this.repository.updatePosition(id, position);
  }

  async getStatistics(id: string): Promise<Board['statistics']> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.getStatistics(id);
  }

  async getColumns(id: string): Promise<Board['columns']> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.getColumns(id);
  }

  async addColumn(
    boardId: string,
    columnData: Omit<Board['columns'][0], 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Board['columns'][0]> {
    const idValidation = this.validator.validateId(boardId);
    if (!idValidation.isValid) {
      throw new Error(`Invalid board ID: ${idValidation.errors.join(', ')}`);
    }

    const columnValidation = this.validator.validateColumn(columnData);
    if (!columnValidation.isValid) {
      throw new Error(`Invalid column data: ${columnValidation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(boardId);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Cannot add columns to archived board
    if (existingBoard.isArchived) {
      throw new Error('Cannot add columns to archived board');
    }

    // Set default values
    const columnWithDefaults = {
      ...columnData,
      color: columnData.color || '#6B7280',
      isArchived: columnData.isArchived || false,
      settings: columnData.settings || {
        wipLimit: null,
        autoMoveCards: false,
        cardTemplate: null
      }
    };

    return await this.repository.addColumn(boardId, columnWithDefaults);
  }

  async removeColumn(boardId: string, columnId: string): Promise<void> {
    const boardIdValidation = this.validator.validateId(boardId);
    if (!boardIdValidation.isValid) {
      throw new Error(`Invalid board ID: ${boardIdValidation.errors.join(', ')}`);
    }

    const columnIdValidation = this.validator.validateId(columnId);
    if (!columnIdValidation.isValid) {
      throw new Error(`Invalid column ID: ${columnIdValidation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(boardId);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Cannot remove columns from archived board
    if (existingBoard.isArchived) {
      throw new Error('Cannot remove columns from archived board');
    }

    // Business logic: Check if column has tasks
    const columns = await this.repository.getColumns(boardId);
    const column = columns.find(c => c.id === columnId);
    if (!column) {
      throw new Error('Column not found');
    }

    if (column.taskCount && column.taskCount > 0) {
      throw new Error('Cannot remove column with existing tasks');
    }

    await this.repository.removeColumn(boardId, columnId);
  }

  async reorderColumns(
    boardId: string,
    columnIds: string[]
  ): Promise<void> {
    const idValidation = this.validator.validateId(boardId);
    if (!idValidation.isValid) {
      throw new Error(`Invalid board ID: ${idValidation.errors.join(', ')}`);
    }

    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      throw new Error('Column IDs array is required');
    }

    // Validate all column IDs
    for (const columnId of columnIds) {
      const validation = this.validator.validateId(columnId);
      if (!validation.isValid) {
        throw new Error(`Invalid column ID: ${columnId}`);
      }
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(boardId);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Cannot reorder columns in archived board
    if (existingBoard.isArchived) {
      throw new Error('Cannot reorder columns in archived board');
    }

    // Verify all columns belong to the board
    const existingColumns = await this.repository.getColumns(boardId);
    const existingColumnIds = existingColumns.map(c => c.id);
    
    for (const columnId of columnIds) {
      if (!existingColumnIds.includes(columnId)) {
        throw new Error(`Column ${columnId} does not belong to this board`);
      }
    }

    // Check if all columns are included
    if (columnIds.length !== existingColumnIds.length) {
      throw new Error('All columns must be included in reorder operation');
    }

    await this.repository.reorderColumns(boardId, columnIds);
  }

  async canUserAccess(boardId: string, userId: string): Promise<boolean> {
    const boardIdValidation = this.validator.validateId(boardId);
    if (!boardIdValidation.isValid) {
      return false;
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      return false;
    }

    try {
      const board = await this.repository.findById(boardId);
      if (!board) {
        return false;
      }

      // Check project access through project service
      // This would typically be injected as a dependency
      // For now, we'll assume access if board exists
      return true;
    } catch {
      return false;
    }
  }

  async canUserEdit(boardId: string, userId: string): Promise<boolean> {
    const hasAccess = await this.canUserAccess(boardId, userId);
    if (!hasAccess) {
      return false;
    }

    try {
      const board = await this.repository.findById(boardId);
      if (!board) {
        return false;
      }

      // Business logic: Cannot edit archived boards
      if (board.isArchived) {
        return false;
      }

      // Check project permissions through project service
      // This would typically be injected as a dependency
      // For now, we'll assume edit access if board exists and is not archived
      return true;
    } catch {
      return false;
    }
  }

  async search(
    query: string,
    projectId?: string,
    filters?: SearchFilters
  ): Promise<Board[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    if (projectId) {
      const validation = this.validator.validateId(projectId);
      if (!validation.isValid) {
        throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
      }
    }

    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.search(query, projectId, filters);
  }

  async getRecentlyViewed(
    userId: string,
    limit: number = 10
  ): Promise<Board[]> {
    const validation = this.validator.validateId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    if (limit <= 0 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    return await this.repository.getRecentlyViewed(userId, limit);
  }

  async markAsViewed(boardId: string, userId: string): Promise<void> {
    const boardIdValidation = this.validator.validateId(boardId);
    if (!boardIdValidation.isValid) {
      throw new Error(`Invalid board ID: ${boardIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    // Check if board exists and user has access
    const hasAccess = await this.canUserAccess(boardId, userId);
    if (!hasAccess) {
      throw new Error('User does not have access to this board');
    }

    await this.repository.markAsViewed(boardId, userId);
  }
}

// Export singleton instance
export const boardService = new BoardService();