import React, { useState, useEffect } from 'react';
import { TaskFilters as TaskFiltersType, TaskStatus, TaskPriority, TaskSortField, SortOrder } from '../../../data/types';
import { Button, Select, Checkbox, Badge } from '../../common';
import { useProjects } from '../../hooks/useProjects';
import { useBoards } from '../../hooks/useBoards';
import { useColumns } from '../../hooks/useColumns';
import { useUsers } from '../../hooks/useUsers';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  sortField: TaskSortField;
  sortOrder: SortOrder;
  onFiltersChange: (filters: Partial<TaskFiltersType>) => void;
  onSortChange: (field: TaskSortField, order: SortOrder) => void;
  onReset: () => void;
  columnId?: string;
  boardId?: string;
  projectId?: string;
  className?: string;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  sortField,
  sortOrder,
  onFiltersChange,
  onSortChange,
  onReset,
  columnId,
  boardId,
  projectId,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Load data for filter options
  const { projects } = useProjects({ autoLoad: true, pageSize: 100 });
  const { boards } = useBoards({ 
    projectId: filters.projectId || projectId,
    autoLoad: !columnId && !boardId,
    pageSize: 100
  });
  const { columns } = useColumns({ 
    boardId: filters.boardId || boardId,
    autoLoad: !columnId,
    pageSize: 100
  });
  const { users } = useUsers({ autoLoad: true, pageSize: 100 });

  // Status options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' }
  ];

  // Priority options
  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: '⬇️ Low' },
    { value: 'medium', label: '➡️ Medium' },
    { value: 'high', label: '⬆️ High' },
    { value: 'urgent', label: '🔥 Urgent' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'position', label: 'Position' }
  ];

  // Project options
  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...projects.map(project => ({
      value: project.id,
      label: project.name
    }))
  ];

  // Board options
  const boardOptions = [
    { value: '', label: 'All Boards' },
    ...boards.map(board => ({
      value: board.id,
      label: board.name
    }))
  ];

  // Column options
  const columnOptions = [
    { value: '', label: 'All Columns' },
    ...columns.map(column => ({
      value: column.id,
      label: column.name
    }))
  ];

  // Assignee options
  const assigneeOptions = [
    { value: '', label: 'All Assignees' },
    { value: 'unassigned', label: 'Unassigned' },
    ...users.map(user => ({
      value: user.id,
      label: user.name || user.email
    }))
  ];

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value && value.trim() !== '';
    if (key === 'showArchived') return value === true;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const handleFilterChange = (key: keyof TaskFiltersType, value: any) => {
    onFiltersChange({ [key]: value === '' ? undefined : value });
  };

  const handleSortFieldChange = (field: string) => {
    onSortChange(field as TaskSortField, sortOrder);
  };

  const handleSortOrderChange = (order: string) => {
    onSortChange(sortField, order as SortOrder);
  };

  const getActiveFilters = () => {
    const active = [];
    
    if (filters.status) {
      const statusLabel = statusOptions.find(opt => opt.value === filters.status)?.label;
      active.push({ key: 'status', label: `Status: ${statusLabel}` });
    }
    
    if (filters.priority) {
      const priorityLabel = priorityOptions.find(opt => opt.value === filters.priority)?.label;
      active.push({ key: 'priority', label: `Priority: ${priorityLabel}` });
    }
    
    if (filters.projectId && !projectId) {
      const projectLabel = projects.find(p => p.id === filters.projectId)?.name;
      active.push({ key: 'projectId', label: `Project: ${projectLabel}` });
    }
    
    if (filters.boardId && !boardId) {
      const boardLabel = boards.find(b => b.id === filters.boardId)?.name;
      active.push({ key: 'boardId', label: `Board: ${boardLabel}` });
    }
    
    if (filters.columnId && !columnId) {
      const columnLabel = columns.find(c => c.id === filters.columnId)?.name;
      active.push({ key: 'columnId', label: `Column: ${columnLabel}` });
    }
    
    if (filters.assigneeId) {
      if (filters.assigneeId === 'unassigned') {
        active.push({ key: 'assigneeId', label: 'Assignee: Unassigned' });
      } else {
        const assigneeLabel = users.find(u => u.id === filters.assigneeId)?.name || 
                             users.find(u => u.id === filters.assigneeId)?.email;
        active.push({ key: 'assigneeId', label: `Assignee: ${assigneeLabel}` });
      }
    }
    
    if (filters.showArchived) {
      active.push({ key: 'showArchived', label: 'Show Archived' });
    }
    
    if (filters.isOverdue) {
      active.push({ key: 'isOverdue', label: 'Overdue Only' });
    }
    
    if (filters.hasDueDate !== undefined) {
      active.push({ 
        key: 'hasDueDate', 
        label: filters.hasDueDate ? 'Has Due Date' : 'No Due Date' 
      });
    }
    
    return active;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Filters
          </h3>
          {activeFiltersCount > 0 && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              Reset
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▲' : '▼'}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
              onClick={() => handleFilterChange(filter.key as keyof TaskFiltersType, undefined)}
            >
              {filter.label} ✕
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Controls */}
      {isExpanded && (
        <div className="space-y-4">
          {/* First Row - Status, Priority, Sort */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <Select
                value={filters.status || ''}
                onChange={(value) => handleFilterChange('status', value)}
                options={statusOptions}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <Select
                value={filters.priority || ''}
                onChange={(value) => handleFilterChange('priority', value)}
                options={priorityOptions}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <Select
                  value={sortField}
                  onChange={handleSortFieldChange}
                  options={sortOptions}
                  className="flex-1"
                />
                <Select
                  value={sortOrder}
                  onChange={handleSortOrderChange}
                  options={[
                    { value: 'asc', label: '↑' },
                    { value: 'desc', label: '↓' }
                  ]}
                  className="w-16"
                />
              </div>
            </div>
          </div>

          {/* Second Row - Project, Board, Column */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!projectId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project
                </label>
                <Select
                  value={filters.projectId || ''}
                  onChange={(value) => {
                    handleFilterChange('projectId', value);
                    // Reset board and column when project changes
                    if (value !== filters.projectId) {
                      handleFilterChange('boardId', undefined);
                      handleFilterChange('columnId', undefined);
                    }
                  }}
                  options={projectOptions}
                />
              </div>
            )}
            
            {!boardId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Board
                </label>
                <Select
                  value={filters.boardId || ''}
                  onChange={(value) => {
                    handleFilterChange('boardId', value);
                    // Reset column when board changes
                    if (value !== filters.boardId) {
                      handleFilterChange('columnId', undefined);
                    }
                  }}
                  options={boardOptions}
                  disabled={!filters.projectId && !projectId}
                />
              </div>
            )}
            
            {!columnId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Column
                </label>
                <Select
                  value={filters.columnId || ''}
                  onChange={(value) => handleFilterChange('columnId', value)}
                  options={columnOptions}
                  disabled={!filters.boardId && !boardId}
                />
              </div>
            )}
          </div>

          {/* Third Row - Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignee
              </label>
              <Select
                value={filters.assigneeId || ''}
                onChange={(value) => handleFilterChange('assigneeId', value)}
                options={assigneeOptions}
              />
            </div>
          </div>

          {/* Fourth Row - Checkboxes */}
          <div className="flex flex-wrap gap-4">
            <Checkbox
              id="show-archived"
              checked={filters.showArchived || false}
              onChange={(checked) => handleFilterChange('showArchived', checked)}
              label="Show archived tasks"
            />
            
            <Checkbox
              id="overdue-only"
              checked={filters.isOverdue || false}
              onChange={(checked) => handleFilterChange('isOverdue', checked)}
              label="Overdue tasks only"
            />
            
            <Checkbox
              id="has-due-date"
              checked={filters.hasDueDate === true}
              onChange={(checked) => handleFilterChange('hasDueDate', checked ? true : undefined)}
              label="Has due date"
            />
            
            <Checkbox
              id="no-due-date"
              checked={filters.hasDueDate === false}
              onChange={(checked) => handleFilterChange('hasDueDate', checked ? false : undefined)}
              label="No due date"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;