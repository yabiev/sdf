"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { X, Save, Users, MessageCircle, AlertCircle, CheckCircle } from "lucide-react";
import { ColorPicker } from "../ColorPicker";
import { z } from "zod";

// Схема валидации
const createProjectSchema = z.object({
  name: z.string().min(1, "Название проекта обязательно").max(255, "Название слишком длинное"),
  description: z.string().max(1000, "Описание слишком длинное").optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Неверный формат цвета"),
  memberIds: z.array(z.string()).default([]),
  telegramChatId: z.string().optional(),
  telegramTopicId: z.string().optional()
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: any) => void;
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

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess
}: CreateProjectModalProps) {
  const { state } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [formData, setFormData] = useState<CreateProjectFormData>({
    name: "",
    description: "",
    color: "#6366f1",
    memberIds: [],
    telegramChatId: "",
    telegramTopicId: ""
  });

  // Сброс состояния при открытии/закрытии модального окна
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setValidationErrors({});
      setFormData({
        name: "",
        description: "",
        color: "#6366f1",
        memberIds: [],
        telegramChatId: "",
        telegramTopicId: ""
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Валидация формы
  const validateForm = (): boolean => {
    try {
      createProjectSchema.parse(formData);
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
      const projectData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        color: formData.color,
        memberIds: formData.memberIds,
        telegramChatId: formData.telegramChatId?.trim() || undefined,
        telegramTopicId: formData.telegramTopicId?.trim() || undefined
      };

      // Отправка запроса к новому API
      const response = await fetch('/api/v2/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(projectData)
      });

      const result: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP error! status: ${response.status}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Неизвестная ошибка');
      }

      // Успешное создание
      setSuccess(result.message || 'Проект успешно создан!');
      
      // Вызов callback функции
      if (onSuccess && result.data) {
        onSuccess(result.data);
      }

      // Закрытие модального окна через небольшую задержку
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Ошибка создания проекта:', error);
      setError(error instanceof Error ? error.message : 'Произошла ошибка при создании проекта');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработка изменения полей формы
  const handleInputChange = (field: keyof CreateProjectFormData, value: any) => {
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

  // Переключение участника
  const toggleMember = (userId: string) => {
    const newMemberIds = formData.memberIds.includes(userId)
      ? formData.memberIds.filter(id => id !== userId)
      : [...formData.memberIds, userId];
    
    handleInputChange('memberIds', newMemberIds);
  };

  // Обработка закрытия модального окна
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-screen bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            Создать проект
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
            
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Название проекта *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors ${
                  validationErrors.name ? 'border-red-500' : 'border-white/10'
                }`}
                placeholder="Введите название проекта"
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
                placeholder="Добавьте описание проекта (необязательно)"
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
                Цвет проекта
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

            {/* Members */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Участники проекта
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {state.users
                  .filter((user) => user.id !== state.currentUser?.id)
                  .map((user) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors ${
                        isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.memberIds.includes(user.id)}
                        onChange={() => toggleMember(user.id)}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-primary-500 bg-white/5 border-white/20 rounded focus:ring-primary-500"
                      />
                      <div className="flex items-center gap-2">
                        {state.settings?.showAvatars && (
                          user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs text-white">
                              {user.name.charAt(0)}
                            </div>
                          )
                        )}
                        <span className="text-white">{user.name}</span>
                        <span className="text-xs text-gray-400">
                          ({user.role === 'admin' ? 'Администратор' : 'Пользователь'})
                        </span>
                      </div>
                    </label>
                  ))
                }
              </div>
            </div>

            {/* Telegram Integration */}
            <div className="space-y-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Интеграция с Telegram
              </h3>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  ID чата/группы (необязательно)
                </label>
                <input
                  type="text"
                  value={formData.telegramChatId}
                  onChange={(e) => handleInputChange('telegramChatId', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-sm transition-colors"
                  placeholder="-1001234567890"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  ID топика (для групп с топиками)
                </label>
                <input
                  type="text"
                  value={formData.telegramTopicId}
                  onChange={(e) => handleInputChange('telegramTopicId', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-sm transition-colors"
                  placeholder="123"
                  disabled={isSubmitting}
                />
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
              disabled={!formData.name.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Создание...' : 'Создать проект'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}