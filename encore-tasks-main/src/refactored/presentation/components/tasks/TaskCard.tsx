import React, { useState, useContext } from 'react';
import { Task, UpdateTaskData, TaskStatus, TaskPriority } from '../../../data/types';
import { AuthContext } from '../../contexts/AuthContext';
import { Button, Badge, Avatar, Dropdown, ConfirmDialog } from '../../common';
import { EditTaskModal } from './EditTaskModal';
import { TaskDetailsModal } from './TaskDetailsModal';

interface TaskCardProps {
  task: Task;
  onUpdate: (id: string, data: UpdateTaskData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  showColumn?: boolean;
  showBoard?: boolean;
  showProject?: boolean;
  className?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdate,
  onDelete,
  onArchive,
  onRestore,
  showColumn = false,
  showBoard = false,
  showProject = false,
  className = ''
}) => {
  const { user } = useContext(AuthContext);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const canEdit = user && (
    user.id === task.createdBy ||
    user.role === 'admin' ||
    user.role === 'manager' ||
    task.assignees?.some(assignee => assignee.id === user.id)
  );

  const canDelete = user && (
    user.id === task.createdBy ||
    user.role === 'admin' ||
    user.role === 'manager'
  );

  const handleStatusChange = async (status: TaskStatus) => {
    if (!canEdit) return;
    
    setIsUpdating(true);
    try {
      await onUpdate(task.id, { status });
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    if (!canEdit) return;
    
    setIsUpdating(true);
    try {
      await onUpdate(task.id, { priority });
    } catch (error) {
      console.error('Failed to update task priority:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    try {
      await onDelete(task.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleArchive = async () => {
    try {
      if (task.isArchived) {
        await onRestore(task.id);
      } else {
        await onArchive(task.id);
      }
      setShowArchiveConfirm(false);
    } catch (error) {
      console.error('Failed to archive/restore task:', error);
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: TaskPriority): string => {
    switch (priority) {
      case 'low': return '⬇️';
      case 'medium': return '➡️';
      case 'high': return '⬆️';
      case 'urgent': return '🔥';
      default: return '➡️';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const isDueSoon = task.dueDate && 
    new Date(task.dueDate) > new Date() && 
    new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && 
    task.status !== 'done';

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' }
  ];

  const priorityOptions = [
    { value: 'low', label: '⬇️ Low' },
    { value: 'medium', label: '➡️ Medium' },
    { value: 'high', label: '⬆️ High' },
    { value: 'urgent', label: '🔥 Urgent' }
  ];

  const actionItems = [
    {
      label: 'View Details',
      onClick: () => setShowDetailsModal(true),
      icon: '👁️'
    },
    ...(canEdit ? [
      {
        label: 'Edit',
        onClick: handleEdit,
        icon: '✏️'
      }
    ] : []),
    ...(canDelete ? [
      {
        label: task.isArchived ? 'Restore' : 'Archive',
        onClick: () => setShowArchiveConfirm(true),
        icon: task.isArchived ? '📤' : '📥'
      },
      {
        label: 'Delete',
        onClick: () => setShowDeleteConfirm(true),
        icon: '🗑️',
        className: 'text-red-600 dark:text-red-400'
      }
    ] : [])
  ];

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200 ${task.isArchived ? 'opacity-75' : ''} ${className}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 
              className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => setShowDetailsModal(true)}
              title={task.title}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          
          {actionItems.length > 0 && (
            <Dropdown
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 p-1 h-6 w-6"
                >
                  ⋮
                </Button>
              }
              items={actionItems}
            />
          )}
        </div>

        {/* Status and Priority */}
        <div className="flex items-center gap-2 mb-3">
          {canEdit ? (
            <Dropdown
              trigger={
                <Badge className={`cursor-pointer ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </Badge>
              }
              items={statusOptions.map(option => ({
                label: option.label,
                onClick: () => handleStatusChange(option.value as TaskStatus),
                className: task.status === option.value ? 'bg-blue-50 dark:bg-blue-900' : ''
              }))}
              disabled={isUpdating}
            />
          ) : (
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
          )}
          
          {canEdit ? (
            <Dropdown
              trigger={
                <Badge className={`cursor-pointer ${getPriorityColor(task.priority)}`}>
                  {getPriorityIcon(task.priority)} {task.priority}
                </Badge>
              }
              items={priorityOptions.map(option => ({
                label: option.label,
                onClick: () => handlePriorityChange(option.value as TaskPriority),
                className: task.priority === option.value ? 'bg-blue-50 dark:bg-blue-900' : ''
              }))}
              disabled={isUpdating}
            />
          ) : (
            <Badge className={getPriorityColor(task.priority)}>
              {getPriorityIcon(task.priority)} {task.priority}
            </Badge>
          )}
        </div>

        {/* Context Information */}
        {(showProject || showBoard || showColumn) && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
            {showProject && task.project && (
              <div>📁 {task.project.name}</div>
            )}
            {showBoard && task.board && (
              <div>📋 {task.board.name}</div>
            )}
            {showColumn && task.column && (
              <div>📂 {task.column.name}</div>
            )}
          </div>
        )}

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Assigned:</span>
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 3).map((assignee) => (
                <Avatar
                  key={assignee.id}
                  user={assignee}
                  size="xs"
                  className="border-2 border-white dark:border-gray-800"
                />
              ))}
              {task.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    +{task.assignees.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Due:</span>
            <span className={`text-xs font-medium ${
              isOverdue 
                ? 'text-red-600 dark:text-red-400'
                : isDueSoon 
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-600 dark:text-gray-300'
            }`}>
              {new Date(task.dueDate).toLocaleDateString()}
              {isOverdue && ' (Overdue)'}
              {isDueSoon && ' (Due Soon)'}
            </span>
          </div>
        )}

        {/* Progress */}
        {task.progress !== undefined && task.progress > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>{task.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3">
            {task.statistics && (
              <>
                {task.statistics.totalComments > 0 && (
                  <span>💬 {task.statistics.totalComments}</span>
                )}
                {task.statistics.totalAttachments > 0 && (
                  <span>📎 {task.statistics.totalAttachments}</span>
                )}
                {task.statistics.totalSubtasks > 0 && (
                  <span>📋 {task.statistics.completedSubtasks}/{task.statistics.totalSubtasks}</span>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {task.isArchived && (
              <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                Archived
              </Badge>
            )}
            <span title={`Updated ${new Date(task.updatedAt).toLocaleString()}`}>
              {new Date(task.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditTaskModal
          task={task}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={(data) => onUpdate(task.id, data)}
        />
      )}

      {showDetailsModal && (
        <TaskDetailsModal
          task={task}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          onUpdate={onUpdate}
          canEdit={canEdit}
        />
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />

      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title={task.isArchived ? 'Restore Task' : 'Archive Task'}
        message={
          task.isArchived
            ? `Are you sure you want to restore "${task.title}"?`
            : `Are you sure you want to archive "${task.title}"? Archived tasks are hidden from normal views.`
        }
        confirmText={task.isArchived ? 'Restore' : 'Archive'}
        confirmVariant={task.isArchived ? 'primary' : 'warning'}
      />
    </>
  );
};

export default TaskCard;