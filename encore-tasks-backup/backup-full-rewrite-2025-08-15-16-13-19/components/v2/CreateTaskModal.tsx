"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { X, Save, User, Calendar, Flag, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { z } from "zod";

// Схема валидации
const createTaskSchema = z.object({
  title: z.string().min(1, "Название задачи обязательно").max(255, "Название слишком длинное"),
  description: z.string().max(2000, "Описание слишком длинное").optional(),
  columnId: z.string().min(1, "Колонка должна быть выбрана"),
  assigneeId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  estimatedHours: z.number().min(0, "Время не может быть отрицательным").max(1000, "Слишком большое значение").optional(),
  tags: z.array(z.string()).default([])
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (task: any) => void;
  preselectedColumnId?: string;
  preselectedBoardId?: string;
  preselectedProjectId?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Низкий", color: "text-gray-400", bgColor: "bg-gray-500/20" },
  { value: "medium", label: "Средний", color: "text-blue-400", bgColor: "bg-blue-500/20" },
  { value: "high", label: "Высокий", color: "text-orange-400", bgColor: "bg-orange-500/20" },
  { value: "urgent", label: "Срочный", color: "text-red-400", bgColor: "bg-red-500/20" }
];

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedColumnId,
  preselectedBoardId,
  preselectedProjectId
}: CreateTaskModalProps) {
  const { state } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [selectedProjectId, setSelectedProjectId] = useState(preselectedProjectId || "");
  const [selectedBoardId, setSelectedBoardId] = useState(preselectedBoardId || "");
  const [newTag, setNewTag] = useState("");
  const [formData, setFormData] = useState<CreateTaskFormData>({
    title: "",
    description: "",
    columnId: preselectedColumnId || "",
    assigneeId: "",
    priority: "medium",
    dueDate: "",
    estimatedHours: undefined,
    tags: []
  });

  // Обновление выбранных значений при изменении props
  useEffect(() => {
    if (preselectedProjectId) setSelectedProjectId(preselectedProjectId);
    if (preselectedBoardId) setSelectedBoardId(preselectedBoardId);
    if (preselectedColumnId) {
      setFormData(prev => ({ ...prev, columnId: preselectedColumnId }));
    }
  }, [preselectedProjectId, preselectedBoardId, preselectedColumnId]);

  // Сброс состояния при открытии/закрытии модального окна
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setValidationErrors({});
      setNewTag("");
      setFormData({
        title: "",
        description: "",
        columnId: preselectedColumnId || "",
        assigneeId: "",
        priority: "medium",
        dueDate: "",
        estimatedHours: undefined,
        tags: []
      });
    }
  }, [isOpen, preselectedColumnId]);

  if (!isOpen) return null;

  // Получение доступных проектов
  const availableProjects = state.projects.filter(project => {
    if (!state.currentUser) return false;
    if (state.currentUser.role === 'admin') return true;
    return project.ownerId === state.currentUser.id || 
           project.memberIds?.includes(state.currentUser.id);
  });

  // Получение досок для выбранного проекта
  const availableBoards = selectedProjectId 
    ? state.boards.filter(board => board.projectId === selectedProjectId)
    : [];

  // Получение колонок для выбранной доски
  const availableColumns = selectedBoardId 
    ? state.columns.filter(column => column.boardId === selectedBoardId)
    : [];

  // Получение участников проекта
  const availableAssignees = selectedProjectId 
    ? (() => {
        const project = state.projects.find(p => p.id === selectedProjectId);
        if (!project) return [];
        
        const memberIds = [project.ownerId, ...(project.memberIds || [])];
        return state.users.filter(user => memberIds.includes(user.id));
      })()
    : [];

  // Валидация формы
  const validateForm = (): boolean => {
    try {
      createTaskSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationErrors = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.currentUser || isSubmitting) return;

    // Валидация
    if (!validateForm()) {
      setError("Пожалуйста, исправьте ошибки в форме");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Подготовка данных для отправки
      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        columnId: formData.columnId,
        assigneeId: formData.assigneeId || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        estimatedHours: formData.estimatedHours,
        tags: formData.tags.filter(tag => tag.trim().length > 0)
      };

      // Отправка запроса к новому API
      const response = await fetch('/api/v2/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(taskData)
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Неизвестная ошибка');
      }

      // Успешное создание
      setSuccess(result.message || 'Задача успешно создана!');
      
      // Вызов callback функции
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }

      // Закрытие модального окна через небольшую задержку
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Ошибка создания задачи:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при создании задачи');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработка изменения полей формы
  const handleInputChange = (field: keyof CreateTaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очистка ошибки валидации для конкретного поля
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Обработка изменения проекта
  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedBoardId("");
    setFormData(prev => ({ ...prev, columnId: "", assigneeId: "" }));
  };

  // Обработка изменения доски
  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    setFormData(prev => ({ ...prev, columnId: "" }));
  };

  // Добавление тега
  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      handleInputChange('tags', [...formData.tags, tag]);
      setNewTag("");
    }
  };

  // Удаление тега
  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Обработка закрытия модального окна
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Получение текущего приоритета
  const currentPriority = PRIORITY_OPTIONS.find(p => p.value === formData.priority);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-screen bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            Создать задачу
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Project, Board, Column Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Проект *
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors text-sm"
                  disabled={isSubmitting || !!preselectedProjectId}
                >
                  <option value="" className="bg-gray-800">Выберите проект</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id} className="bg-gray-800">
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Board */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Доска *
                </label>
                <select
                  value={selectedBoardId}
                  onChange={(e) => handleBoardChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors text-sm"
                  disabled={isSubmitting || !selectedProjectId || !!preselectedBoardId}
                >
                  <option value="" className="bg-gray-800">Выберите доску</option>
                  {availableBoards.map((board) => (
                    <option key={board.id} value={board.id} className="bg-gray-800">
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Column */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Колонка *
                </label>
                <select
                  value={formData.columnId}
                  onChange={(e) => handleInputChange('columnId', e.target.value)}
                  className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors text-sm ${
                    validationErrors.columnId ? 'border-red-500' : 'border-white/10'
                  }`}
                  disabled={isSubmitting || !selectedBoardId || !!preselectedColumnId}
                >
                  <option value="" className="bg-gray-800">Выберите колонку</option>
                  {availableColumns.map((column) => (
                    <option key={column.id} value={column.id} className="bg-gray-800">
                      {column.name}
                    </option>
                  ))}
                </select>
                {validationErrors.columnId && (
                  <p className="mt-1 text-xs text-red-400">{validationErrors.columnId}</p>
                )}
              </div>
            </div>

            {/* Task Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название задачи *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors ${
                  validationErrors.title ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Введите название задачи"
                disabled={isSubmitting}
                autoFocus
              />
              {validationErrors.title && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none transition-colors ${
                  validationErrors.description ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Добавьте описание задачи (необязательно)"
                disabled={isSubmitting}
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.description}
                </p>
              )}
            </div>

            {/* Assignee, Priority, Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Assignee */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Исполнитель
                </label>
                <select
                  value={formData.assigneeId}
                  onChange={(e) => handleInputChange('assigneeId', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors text-sm"
                  disabled={isSubmitting || !selectedProjectId}
                >
                  <option value="" className="bg-gray-800">Не назначен</option>
                  {availableAssignees.map((user) => (
                    <option key={user.id} value={user.id} className="bg-gray-800">
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Flag className="w-4 h-4 inline mr-1" />
                  Приоритет
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value as any)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors text-sm"
                  disabled={isSubmitting}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-gray-800">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Срок выполнения
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Оценка времени (часы)
              </label>
              <input
                type="number"
                min="0"
                max="1000"
                step="0.5"
                value={formData.estimatedHours || ""}
                onChange={(e) => handleInputChange('estimatedHours', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors ${
                  validationErrors.estimatedHours ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Например: 2.5"
                disabled={isSubmitting}
              />
              {validationErrors.estimatedHours && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.estimatedHours}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Теги
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors text-sm"
                    placeholder="Добавить тег"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    disabled={!newTag.trim() || isSubmitting}
                    className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    Добавить
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-300 rounded text-xs"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          disabled={isSubmitting}
                          className="hover:text-primary-100 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mx-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 p-6 border-t border-white/10 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!formData.title.trim() || !formData.columnId || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}