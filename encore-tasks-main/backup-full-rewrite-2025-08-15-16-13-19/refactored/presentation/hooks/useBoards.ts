import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Board, 
  CreateBoardData, 
  UpdateBoardData, 
  BoardFilters, 
  BoardSortField, 
  SortOrder,
  PaginationParams,
  PaginatedResponse
} from '../../data/types';
import { BoardService } from '../../business/services';
import { useDebounce } from './useDebounce';

interface UseBoardsOptions {
  projectId?: string;
  autoLoad?: boolean;
  pageSize?: number;
  initialFilters?: Partial<BoardFilters>;
}

interface UseBoardsReturn {
  // Data
  boards: Board[];
  totalBoards: number;
  currentPage: number;
  totalPages: number;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isDuplicating: boolean;
  
  // Error states
  error: string | null;
  
  // Filters and sorting
  filters: BoardFilters;
  sortField: BoardSortField;
  sortOrder: SortOrder;
  
  // Actions
  loadBoards: () => Promise<void>;
  createBoard: (data: CreateBoardData) => Promise<Board>;
  updateBoard: (id: string, data: UpdateBoardData) => Promise<Board>;
  deleteBoard: (id: string) => Promise<void>;
  archiveBoard: (id: string) => Promise<void>;
  restoreBoard: (id: string) => Promise<void>;
  duplicateBoard: (id: string, data: CreateBoardData & { duplicateOptions: any }) => Promise<Board>;
  
  // Filter and sort actions
  setFilters: (filters: Partial<BoardFilters>) => void;
  setSorting: (field: BoardSortField, order: SortOrder) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  
  // Utility actions
  refreshBoard: (id: string) => Promise<void>;
  clearError: () => void;
}

const DEFAULT_FILTERS: BoardFilters = {
  search: '',
  projectId: undefined,
  showArchived: false
};

const DEFAULT_PAGE_SIZE = 12;

export const useBoards = (options: UseBoardsOptions = {}): UseBoardsReturn => {
  const {
    projectId,
    autoLoad = false,
    pageSize = DEFAULT_PAGE_SIZE,
    initialFilters = {}
  } = options;

  // State
  const [boards, setBoards] = useState<Board[]>([]);
  const [totalBoards, setTotalBoards] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFiltersState] = useState<BoardFilters>({
    ...DEFAULT_FILTERS,
    projectId,
    ...initialFilters
  });
  const [sortField, setSortField] = useState<BoardSortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search, 300);
  
  // Memoized pagination params
  const paginationParams = useMemo((): PaginationParams => ({
    page: currentPage,
    pageSize,
    sortField,
    sortOrder
  }), [currentPage, pageSize, sortField, sortOrder]);
  
  // Memoized effective filters (with debounced search)
  const effectiveFilters = useMemo((): BoardFilters => ({
    ...filters,
    search: debouncedSearch
  }), [filters, debouncedSearch]);

  // Load boards
  const loadBoards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: PaginatedResponse<Board> = await BoardService.getBoards(
        effectiveFilters,
        paginationParams
      );
      
      setBoards(response.data);
      setTotalBoards(response.total);
      setTotalPages(response.totalPages);
      setCurrentPage(response.currentPage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load boards';
      setError(errorMessage);
      console.error('Error loading boards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveFilters, paginationParams]);

  // Create board
  const createBoard = useCallback(async (data: CreateBoardData): Promise<Board> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const newBoard = await BoardService.createBoard(data);
      
      // Add to current list if it matches filters
      if ((!effectiveFilters.projectId || newBoard.projectId === effectiveFilters.projectId) &&
          (!effectiveFilters.search || 
           newBoard.name.toLowerCase().includes(effectiveFilters.search.toLowerCase()) ||
           newBoard.description?.toLowerCase().includes(effectiveFilters.search.toLowerCase()))) {
        setBoards(prev => [newBoard, ...prev]);
        setTotalBoards(prev => prev + 1);
      }
      
      return newBoard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create board';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [effectiveFilters]);

  // Update board
  const updateBoard = useCallback(async (id: string, data: UpdateBoardData): Promise<Board> => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const updatedBoard = await BoardService.updateBoard(id, data);
      
      setBoards(prev => prev.map(board => 
        board.id === id ? updatedBoard : board
      ));
      
      return updatedBoard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update board';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Delete board
  const deleteBoard = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await BoardService.deleteBoard(id);
      
      setBoards(prev => prev.filter(board => board.id !== id));
      setTotalBoards(prev => prev - 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete board';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Archive board
  const archiveBoard = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    try {
      await BoardService.archiveBoard(id);
      
      if (effectiveFilters.showArchived) {
        // Update the board in place if showing archived
        setBoards(prev => prev.map(board => 
          board.id === id ? { ...board, isArchived: true } : board
        ));
      } else {
        // Remove from list if not showing archived
        setBoards(prev => prev.filter(board => board.id !== id));
        setTotalBoards(prev => prev - 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive board';
      setError(errorMessage);
      throw err;
    }
  }, [effectiveFilters.showArchived]);

  // Restore board
  const restoreBoard = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    try {
      await BoardService.restoreBoard(id);
      
      if (effectiveFilters.showArchived) {
        // Update the board in place if showing archived
        setBoards(prev => prev.map(board => 
          board.id === id ? { ...board, isArchived: false } : board
        ));
      } else {
        // Remove from archived list
        setBoards(prev => prev.filter(board => board.id !== id));
        setTotalBoards(prev => prev - 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore board';
      setError(errorMessage);
      throw err;
    }
  }, [effectiveFilters.showArchived]);

  // Duplicate board
  const duplicateBoard = useCallback(async (
    id: string, 
    data: CreateBoardData & { duplicateOptions: any }
  ): Promise<Board> => {
    setIsDuplicating(true);
    setError(null);
    
    try {
      const duplicatedBoard = await BoardService.duplicateBoard(id, data);
      
      // Add to current list if it matches filters
      if ((!effectiveFilters.projectId || duplicatedBoard.projectId === effectiveFilters.projectId) &&
          (!effectiveFilters.search || 
           duplicatedBoard.name.toLowerCase().includes(effectiveFilters.search.toLowerCase()) ||
           duplicatedBoard.description?.toLowerCase().includes(effectiveFilters.search.toLowerCase()))) {
        setBoards(prev => [duplicatedBoard, ...prev]);
        setTotalBoards(prev => prev + 1);
      }
      
      return duplicatedBoard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate board';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDuplicating(false);
    }
  }, [effectiveFilters]);

  // Refresh single board
  const refreshBoard = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    try {
      const updatedBoard = await BoardService.getBoardById(id);
      
      setBoards(prev => prev.map(board => 
        board.id === id ? updatedBoard : board
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh board';
      setError(errorMessage);
      console.error('Error refreshing board:', err);
    }
  }, []);

  // Filter and sort actions
  const setFilters = useCallback((newFilters: Partial<BoardFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);

  const setSorting = useCallback((field: BoardSortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
    setCurrentPage(1); // Reset to first page when sorting changes
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({
      ...DEFAULT_FILTERS,
      projectId // Keep projectId if provided in options
    });
    setSortField('updatedAt');
    setSortOrder('desc');
    setCurrentPage(1);
  }, [projectId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load effect
  useEffect(() => {
    if (autoLoad) {
      loadBoards();
    }
  }, [autoLoad, loadBoards]);

  // Reload when filters or pagination change
  useEffect(() => {
    if (!autoLoad) return;
    
    loadBoards();
  }, [effectiveFilters, paginationParams, loadBoards, autoLoad]);

  return {
    // Data
    boards,
    totalBoards,
    currentPage,
    totalPages,
    
    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isDuplicating,
    
    // Error states
    error,
    
    // Filters and sorting
    filters,
    sortField,
    sortOrder,
    
    // Actions
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    archiveBoard,
    restoreBoard,
    duplicateBoard,
    
    // Filter and sort actions
    setFilters,
    setSorting,
    setPage,
    resetFilters,
    
    // Utility actions
    refreshBoard,
    clearError
  };
};

export default useBoards;