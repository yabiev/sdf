import React, { useState, useEffect } from 'react';
import { Board, CreateBoardData, UpdateBoardData } from '../../../data/types';
import { Button, LoadingSpinner, ErrorMessage, EmptyState, Pagination } from '../../common';
import { useAuth } from '../../context/AuthContext';
import { useBoards } from '../../hooks/useBoards';
import BoardCard from './BoardCard';
import BoardFilters from './BoardFilters';
import CreateBoardModal from './CreateBoardModal';
import { useDebounce } from '../../hooks/useDebounce';

interface BoardListProps {
  projectId?: string;
  showProjectFilter?: boolean;
  className?: string;
}

const BoardList: React.FC<BoardListProps> = ({
  projectId,
  showProjectFilter = false,
  className = ''
}) => {
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const {
    boards,
    totalCount,
    currentPage,
    totalPages,
    isLoading,
    isCreating,
    error,
    filters,
    setFilters,
    resetFilters,
    goToPage,
    nextPage,
    previousPage,
    createBoard,
    updateBoard,
    deleteBoard,
    archiveBoard,
    restoreBoard,
    duplicateBoard,
    refreshBoards
  } = useBoards({ 
    projectId,
    autoLoad: true,
    pageSize: 12 
  });
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(filters.search || '', 300);
  
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch, filters.search, setFilters]);
  
  const handleCreateBoard = async (data: CreateBoardData) => {
    try {
      await createBoard(data);
      setIsCreateModalOpen(false);
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to create board:', error);
    }
  };
  
  const handleUpdateBoard = async (id: string, data: UpdateBoardData) => {
    try {
      await updateBoard(id, data);
    } catch (error) {
      console.error('Failed to update board:', error);
    }
  };
  
  const handleDeleteBoard = async (id: string) => {
    try {
      await deleteBoard(id);
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };
  
  const handleArchiveBoard = async (id: string) => {
    try {
      await archiveBoard(id);
    } catch (error) {
      console.error('Failed to archive board:', error);
    }
  };
  
  const handleRestoreBoard = async (id: string) => {
    try {
      await restoreBoard(id);
    } catch (error) {
      console.error('Failed to restore board:', error);
    }
  };
  
  const handleDuplicateBoard = async (id: string, name: string) => {
    try {
      await duplicateBoard(id, name);
    } catch (error) {
      console.error('Failed to duplicate board:', error);
    }
  };
  
  const canCreateBoard = user && (!projectId || user.permissions?.canCreateBoards);
  
  if (error) {
    return (
      <div className={className}>
        <ErrorMessage 
          message={error}
          onRetry={refreshBoards}
        />
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {projectId ? 'Project Boards' : 'All Boards'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {totalCount > 0 
              ? `${totalCount} board${totalCount === 1 ? '' : 's'} found`
              : 'No boards found'
            }
          </p>
        </div>
        
        {canCreateBoard && (
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            disabled={isLoading}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Create Board
          </Button>
        )}
      </div>
      
      {/* Filters */}
      <BoardFilters
        filters={filters}
        onFiltersChange={setFilters}
        onReset={resetFilters}
        showProjectFilter={showProjectFilter}
      />
      
      {/* Loading State */}
      {isLoading && boards.length === 0 && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && boards.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          }
          title="No boards found"
          description={
            filters.search || filters.status || filters.showArchived
              ? "No boards match your current filters. Try adjusting your search criteria."
              : projectId
              ? "This project doesn't have any boards yet. Create your first board to get started."
              : "You don't have any boards yet. Create your first board to start organizing your tasks."
          }
          action={
            canCreateBoard ? (
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Create Board
              </Button>
            ) : undefined
          }
        />
      )}
      
      {/* Boards Grid */}
      {boards.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onUpdate={handleUpdateBoard}
                onDelete={handleDeleteBoard}
                onArchive={handleArchiveBoard}
                onRestore={handleRestoreBoard}
                onDuplicate={handleDuplicateBoard}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                onPrevious={previousPage}
                onNext={nextPage}
                showPageNumbers
                maxVisiblePages={5}
              />
            </div>
          )}
        </>
      )}
      
      {/* Loading Overlay for Actions */}
      {(isLoading && boards.length > 0) && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400 mt-4 text-center">
              Loading boards...
            </p>
          </div>
        </div>
      )}
      
      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateBoard}
        projectId={projectId}
        isSubmitting={isCreating}
      />
    </div>
  );
};

export default BoardList;