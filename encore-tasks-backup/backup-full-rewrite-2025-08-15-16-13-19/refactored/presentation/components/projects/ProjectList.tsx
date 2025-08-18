// ProjectList Component
// Displays a list of projects with filtering, sorting, and actions

import React, { useState, useEffect, useCallback } from 'react';
import { Project, SearchFilters, SortOptions, PaginationOptions } from '../../../data/types';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';
import { ProjectCard } from './ProjectCard';
import { ProjectFilters } from './ProjectFilters';
import { CreateProjectModal } from './CreateProjectModal';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { EmptyState } from '../common/EmptyState';
import { Pagination } from '../common/Pagination';

interface ProjectListProps {
  userId?: string;
  showCreateButton?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  className?: string;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  userId,
  showCreateButton = true,
  showFilters = true,
  showPagination = true,
  pageSize = 12,
  className = ''
}) => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sort, setSort] = useState<SortOptions>({
    field: 'updatedAt',
    direction: 'desc'
  });
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    limit: pageSize
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    projects,
    loading,
    error,
    totalCount,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    restoreProject
  } = useProjects();

  // Fetch projects when filters, sort, or pagination change
  useEffect(() => {
    const targetUserId = userId || user?.id;
    if (targetUserId) {
      fetchProjects(targetUserId, filters, sort, pagination);
    }
  }, [userId, user?.id, filters, sort, pagination, fetchProjects]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setFilters(prev => ({ ...prev, search: searchQuery.trim() }));
      } else {
        setFilters(prev => {
          const { search, ...rest } = prev;
          return rest;
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleFilterChange = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handleSortChange = useCallback((newSort: SortOptions) => {
    setSort(newSort);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handleCreateProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createProject(projectData);
      setIsCreateModalOpen(false);
      // Refresh the list
      const targetUserId = userId || user?.id;
      if (targetUserId) {
        fetchProjects(targetUserId, filters, sort, pagination);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  }, [createProject, userId, user?.id, filters, sort, pagination, fetchProjects]);

  const handleProjectAction = useCallback(async (
    action: 'update' | 'delete' | 'archive' | 'restore',
    projectId: string,
    data?: any
  ) => {
    try {
      switch (action) {
        case 'update':
          await updateProject(projectId, data);
          break;
        case 'delete':
          await deleteProject(projectId);
          break;
        case 'archive':
          await archiveProject(projectId);
          break;
        case 'restore':
          await restoreProject(projectId);
          break;
      }
      
      // Refresh the list
      const targetUserId = userId || user?.id;
      if (targetUserId) {
        fetchProjects(targetUserId, filters, sort, pagination);
      }
    } catch (error) {
      console.error(`Failed to ${action} project:`, error);
    }
  }, [updateProject, deleteProject, archiveProject, restoreProject, userId, user?.id, filters, sort, pagination, fetchProjects]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const canCreateProject = user && showCreateButton;

  if (loading && projects.length === 0) {
    return (
      <div className={`flex justify-center items-center min-h-64 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorMessage 
          message="Failed to load projects" 
          details={error.message}
          onRetry={() => {
            const targetUserId = userId || user?.id;
            if (targetUserId) {
              fetchProjects(targetUserId, filters, sort, pagination);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {totalCount > 0 ? `${totalCount} project${totalCount === 1 ? '' : 's'}` : 'No projects found'}
          </p>
        </div>
        
        {canCreateProject && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        )}
      </div>

      {/* Search and Filters */}
      {showFilters && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Filters */}
          <ProjectFilters
            filters={filters}
            sort={sort}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
          />
        </div>
      )}

      {/* Project Grid */}
      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No projects found"
          description={searchQuery || Object.keys(filters).length > 0 
            ? "Try adjusting your search or filters"
            : "Create your first project to get started"
          }
          action={canCreateProject ? {
            label: "Create Project",
            onClick: () => setIsCreateModalOpen(true)
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={(updates) => handleProjectAction('update', project.id, updates)}
              onDelete={() => handleProjectAction('delete', project.id)}
              onArchive={() => handleProjectAction('archive', project.id)}
              onRestore={() => handleProjectAction('restore', project.id)}
              canEdit={user?.id === project.ownerId || user?.role === 'admin'}
              canDelete={user?.id === project.ownerId || user?.role === 'admin'}
            />
          ))}
        </div>
      )}

      {/* Loading overlay for subsequent loads */}
      {loading && projects.length > 0 && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            showPageNumbers={true}
            maxVisiblePages={5}
          />
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </div>
  );
};

export default ProjectList;