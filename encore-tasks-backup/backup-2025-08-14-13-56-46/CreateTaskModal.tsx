"use client";

import React, { useState } from "react";
import { Task, TaskPriority, User } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { X, Calendar, User as UserIcon, Flag, Plus, Save } from "lucide-react";
import { CustomSelect } from "./CustomSelect";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
  initialStatus?: string;
}

const priorityOptions: {value: TaskPriority;label: string;color: string;}[] =
[
{ value: "low", label: "Низкий", color: "text-green-500" },
{ value: "medium", label: "Средний", color: "text-yellow-500" },
{ value: "high", label: "Высокий", color: "text-orange-500" },
{ value: "urgent", label: "Срочный", color: "text-red-500" }];


const statusMapping: Record<string, string> = {
  "1": "todo",
  "2": "in-progress",
  "3": "review",
  "4": "done"
};

export function CreateTaskModal({
  isOpen,
  onClose,
  onSave,
  initialStatus = "todo"
}: CreateTaskModalProps) {
  const { state, createTask } = useApp();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assigneeId: "",
    deadline: "",
    tags: ""
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.title.trim() || !state.currentUser || !state.selectedProject || !state.selectedBoard)
      return;

    try {
      const assignee = state.selectedProject.members.find(
        (m) => m.id === formData.assigneeId
      );
      const tags = formData.tags.
      split(",").
      map((tag) => tag.trim()).
      filter(Boolean);

      // Find the first column that matches the initial status
      const targetColumn = state.selectedBoard.columns.find(col => {
        const colName = col.name.toLowerCase();
        if (initialStatus === 'todo') {
          return !colName.includes('работе') && !colName.includes('progress') && 
                 !colName.includes('проверк') && !colName.includes('review') && 
                 !colName.includes('выполнено') && !colName.includes('done');
        } else if (initialStatus === 'in-progress') {
          return colName.includes('работе') || colName.includes('progress') || colName.includes('процессе');
        } else if (initialStatus === 'review') {
          return colName.includes('проверк') || colName.includes('review') || colName.includes('тест');
        } else if (initialStatus === 'done') {
          return colName.includes('выполнено') || colName.includes('done') || colName.includes('завершено');
        }
        return false;
      }) || state.selectedBoard.columns[0]; // Fallback to first column

      const newTaskData = {
        title: formData.title,
        description: formData.description || undefined,
        status: initialStatus,
        priority: formData.priority,
        assigneeId: assignee?.id,
        columnId: targetColumn.id,
        position: 0,
        dueDate: formData.deadline ? (() => {
          const date = new Date(formData.deadline);
          return isNaN(date.getTime()) ? undefined : date;
        })() : undefined,
        tags
      };

      const success = await createTask(newTaskData);
      
      if (success) {
        // Call onSave callback if provided
        const newTask: Omit<Task, "id" | "createdAt" | "updatedAt"> = {
          title: formData.title,
          description: formData.description || undefined,
          status: initialStatus as Task['status'],
          priority: formData.priority,
          assignee,
          assignees: assignee ? [assignee] : [],
          reporter: state.currentUser,
          projectId: state.selectedProject.id,
          boardId: state.selectedBoard.id,
          subtasks: [],
          deadline: formData.deadline ? (() => {
            const date = new Date(formData.deadline);
            return isNaN(date.getTime()) ? undefined : date;
          })() : undefined,
          attachments: [],
          comments: [],
          tags,
          position: state.tasks.filter((t) => t.status === initialStatus && t.boardId === state.selectedBoard?.id).length
        };
        onSave(newTask);
      }
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        assigneeId: "",
        deadline: "",
        tags: ""
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const availableUsers = state.selectedProject?.members || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm modal-overlay animate-fade-in"
      data-oid="4en7xi2">

      <div
        className="glass-dark w-full max-w-2xl overflow-hidden modal-content animate-scale-in"
        data-oid="1i-ckcl">

        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b border-white/10"
          data-oid="aoobp88">

          <h2 className="text-xl font-semibold text-white" data-oid="ome44qz">
            Создать задачу
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-oid="dbgonsd">

            <X className="w-5 h-5 text-gray-400" data-oid="_-bq:bm" />
          </button>
        </div>

        <div className="p-6 space-y-6" data-oid=":e4tpbe">
          {/* Title */}
          <div data-oid="13hqpzp">
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="_xhcukl">

              Название задачи *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              placeholder="Введите название задачи"
              autoFocus
              data-oid="0l3z8cr" />

          </div>

          {/* Description */}
          <div data-oid="sfwlkr6">
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="urhqeuh">

              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
              placeholder="Добавьте описание задачи"
              data-oid="hq.w3b3" />

          </div>

          {/* Properties */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            data-oid="vogp5.i">

            {/* Assignee */}
            <div data-oid="21lqz4m">
              <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="-lpf07_">

                Исполнитель
              </label>
              <CustomSelect
                options={[
                  { value: "", label: "Не назначено" },
                  ...availableUsers.map((user) => ({
                    value: user.id,
                    label: user.name
                  }))
                ]}
                value={formData.assigneeId}
                onChange={(value) => setFormData({ ...formData, assigneeId: value })}
                placeholder="Не назначено"
              />
            </div>

            {/* Priority */}
            <div data-oid="-kxu37j">
              <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="mhmrz-7">

                Приоритет
              </label>
              <CustomSelect
                options={[
                  { value: "low", label: "Низкий", color: "#a5b4fc" },
  { value: "medium", label: "Средний", color: "#818cf8" },
  { value: "high", label: "Высокий", color: "#6366f1" },
  { value: "urgent", label: "Срочный", color: "#4f46e5" }
                ]}
                value={formData.priority}
                onChange={(value) => setFormData({ ...formData, priority: value as TaskPriority })}
                placeholder="Выберите приоритет"
              />
            </div>

            {/* Deadline */}
            <div data-oid="apjz-q4">
              <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="894btil">

                Дедлайн
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) =>
                setFormData({ ...formData, deadline: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                data-oid="arvzg:l" />

            </div>

            {/* Tags */}
            <div data-oid="pizy__v">
              <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="dublgfb">

                Теги
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                placeholder="Введите теги через запятую"
                data-oid="pkx2rv2" />

            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-3 p-6 border-t border-white/10"
          data-oid="3c6o.e.">

          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            data-oid="j.3:8l8">

            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.title.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-oid="t5:9jzt">

            <Save className="w-4 h-4" data-oid="2yq8j9s" />
            Создать задачу
          </button>
        </div>
      </div>
    </div>);

}