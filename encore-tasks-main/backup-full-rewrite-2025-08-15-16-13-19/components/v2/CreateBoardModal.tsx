"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { X, Save, Columns, AlertCircle, CheckCircle } from "lucide-react";
import { ColorPicker } from "../ColorPicker";
import { z } from "zod";

// Схема валидации
const createBoardSchema = z.object({
  name: z.string().min(1, "Название доски обязательно").max(255, "Название слишком длинное"),
  description: z.string().max(1000, "Описание слишком длинное").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Неверный формат цвета"),
  projectId: z.string().min(1, "Проект должен быть выбран"),
  createDefaultColumns: z.boolean().default(true)
});

type CreateBoardFormData = z.infer<typeof createBoardSchema>;

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (board: any) => void;
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

export function CreateBoardModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedProjectId
}: CreateBoardModalProps) {
  const { state } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<CreateBoardFormData>({
    name: "",
    description: "",
    color: "#10b981",
    projectId: preselectedProjectId || "",
    createDefaultColumns: true
  });

  // Обновление projectId при изменении preselectedProjectId
  useEffect(() => {
    if (preselectedProjectId) {
      setFormData(prev => ({ ...prev, projectId: preselectedProjectId }));
    }
  }, [preselectedProjectId]);

  // Сброс состояния при открытии/закрытии модального окна
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setValidationErrors({});
      setFormData({
        name: "",
        description: "",
        color: "#10b981",
        projectId: preselectedProjectId || "",
        createDefaultColumns: true
      });
    }
  }, [isOpen, preselectedProjectId]);

  if (!isOpen) return null;

  // Получение доступных проектов для текущего пользователя
  const availableProjects = state.projects.filter(project => {
    if (!state.currentUser) return false;
    
    // Администраторы видят все проекты
    if (state.currentUser.role === 'admin') return true;
    
    // Обычные пользователи видят только свои проекты и проекты, где они участники
    return project.ownerId === state.currentUser.id || 
           project.memberIds?.includes(state.currentUser.id);
  });

  // Валидация формы
  const validateForm = (): boolean => {
    try {
      createBoardSchema.parse(formData);
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
      const boardData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        color: formData.color,
        projectId: formData.projectId,
        createDefaultColumns: formData.createDefaultColumns
      };

      // Отправка запроса к новому API
      const response = await fetch('/api/v2/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(boardData)
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Неизвестная ошибка');
      }

      // Успешное создание
      setSuccess(result.message || 'Доска успешно создана!');
      
      // Вызов callback функции
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }

      // Закрытие модального окна через небольшую задержку
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Ошибка создания доски:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при создании доски');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработка изменения полей формы
  const handleInputChange = (field: keyof CreateBoardFormData, value: any) => {
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

  // Обработка закрытия модального окна
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-screen bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            Создать доску
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
            
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Проект *
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => handleInputChange('projectId', e.target.value)}
                className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white focus:outline-none focus:border-primary-500 transition-colors ${
                  validationErrors.projectId ? 'border-red-500' : 'border-white/10'
                }`}
                disabled={isSubmitting || !!preselectedProjectId}
              >
                <option value="" className="bg-gray-800">
                  Выберите проект
                </option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-gray-800">
                    {project.name}
                  </option>
                ))}
              </select>
              {validationErrors.projectId && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.projectId}
                </p>
              )}
              {preselectedProjectId && (
                <p className="mt-1 text-xs text-gray-400">
                  Проект предварительно выбран
                </p>
              )}
            </div>

            {/* Board Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название доски *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors ${
                  validationErrors.name ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Введите название доски"
                disabled={isSubmitting}
                autoFocus
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.name}
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
                rows={3}
                className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none transition-colors ${
                  validationErrors.description ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Добавьте описание доски (необязательно)"
                disabled={isSubmitting}
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.description}
                </p>
              )}
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Цвет доски
              </label>
              <ColorPicker
                selectedColor={formData.color}
                onColorSelect={(color) => handleInputChange('color', color)}
                disabled={isSubmitting}
              />
              {validationErrors.color && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.color}
                </p>
              )}
            </div>

            {/* Default Columns */}
            <div className="p-4 bg-white/5 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.createDefaultColumns}
                  onChange={(e) => handleInputChange('createDefaultColumns', e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-primary-500 bg-white/5 border-white/20 rounded focus:ring-primary-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Columns className="w-4 h-4" />
                    Создать колонки по умолчанию
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Будут созданы стандартные колонки: "К выполнению", "В работе", "На проверке", "Выполнено"
                  </div>
                </div>
              </label>
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
              disabled={!formData.name.trim() || !formData.projectId || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Создание...' : 'Создать доску'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}