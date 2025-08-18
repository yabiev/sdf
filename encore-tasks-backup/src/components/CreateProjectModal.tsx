"use client";

import React, { useState } from "react";
import { Project, User } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { X, Save, Users, MessageCircle } from "lucide-react";
import { ColorPicker } from "./ColorPicker";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, "id" | "createdAt">) => void;
}




export function CreateProjectModal({
  isOpen,
  onClose,
  onSave
}: CreateProjectModalProps) {
  const { state } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6366f1",
    memberIds: [] as string[],
    telegramChatId: "",
    telegramTopicId: ""
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.name.trim() || !state.currentUser || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const selectedMembers = state.users.filter(
        (user) =>
        formData.memberIds.includes(user.id) ||
        user.id === state.currentUser?.id
      );

      // Always include current user as member
      if (!selectedMembers.find((m) => m.id === state.currentUser?.id)) {
        selectedMembers.push(state.currentUser);
      }

      const newProject: Omit<Project, "id" | "createdAt"> = {
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color,
        members: selectedMembers,
        createdBy: state.currentUser.id,
        telegramChatId: formData.telegramChatId || undefined,
        telegramTopicId: formData.telegramTopicId || undefined
      };

      await onSave(newProject);

      // Reset form only on success
      setFormData({
        name: "",
        description: "",
        color: "#6366f1",
        memberIds: [],
        telegramChatId: "",
        telegramTopicId: ""
      });
      setError(null);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'Ошибка сервера. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(userId) ?
      prev.memberIds.filter((id) => id !== userId) :
      [...prev.memberIds, userId]
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      data-oid="_.:6v5f">

      <div
        className="w-full max-w-2xl max-h-screen bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden flex flex-col"
        data-oid="pecc:nv">

        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0"
          data-oid="gxd5574">

          <h2 className="text-xl font-semibold text-white" data-oid="90:scn_">
            Создать проект
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-oid="b9hx7vc">

            <X className="w-5 h-5 text-gray-400" data-oid="lw1amj-" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1" data-oid="u4l9zpa">
          {/* Name */}
          <div data-oid="b9mqchc">
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="416-wuh">

              Название проекта *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              placeholder="Введите название проекта"
              autoFocus
              data-oid="q-4h2qo" />

          </div>

          {/* Description */}
          <div data-oid="18vkhh9">
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="_wa:u0d">

              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
              placeholder="Добавьте описание проекта"
              data-oid="7bj9.uk" />

          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Цвет проекта
            </label>
            <ColorPicker
              selectedColor={formData.color}
              onColorSelect={(color) => setFormData({ ...formData, color })}
            />
          </div>

          {/* Members */}
          <div data-oid="yhaanv:">
            <label
              className="block text-sm font-medium text-gray-300 mb-2"
              data-oid="uklfg-o">

              <Users className="w-4 h-4 inline mr-1" data-oid="02tedyo" />
              Участники проекта
            </label>
            <div
              className="space-y-2 max-h-32 overflow-y-auto"
              data-oid="-3.9tsc">

              {state.users.
              filter((user) => user.id !== state.currentUser?.id).
              map((user) =>
              <label
                key={user.id}
                className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer"
                data-oid="n4c2:xw">

                    <input
                  type="checkbox"
                  checked={formData.memberIds.includes(user.id)}
                  onChange={() => toggleMember(user.id)}
                  className="w-4 h-4 text-primary-500 bg-white/5 border-white/20 rounded focus:ring-primary-500"
                  data-oid="o4k1x57" />


                    <div className="flex items-center gap-2" data-oid="b66n06e">
                      {state.settings?.showAvatars && (
                        user.avatar ?
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-6 h-6 rounded-full"
                          data-oid=":-_yxya" /> :


                        <div
                          className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs text-white"
                          data-oid="pvyjrt6">

                            {user.name.charAt(0)}
                          </div>
                      )}
                      <span className="text-white" data-oid="8jq04fu">
                        {user.name}
                      </span>
                      <span
                    className="text-xs text-gray-400"
                    data-oid="a_8nuiu">

                        ({user.role === 'admin' ? 'Администратор' : 'Пользователь'})
                      </span>
                    </div>
                  </label>
              )}
            </div>
          </div>

          {/* Telegram Integration */}
          <div
            className="space-y-4 p-4 bg-white/5 rounded-lg"
            data-oid="9j4gpnt">

            <h3
              className="text-sm font-medium text-gray-300 flex items-center gap-2"
              data-oid="pnm.ywv">

              <MessageCircle className="w-4 h-4" data-oid="ayb8q3w" />
              Интеграция с Telegram
            </h3>

            <div data-oid="u6lu2av">
              <label
                className="block text-xs text-gray-400 mb-1"
                data-oid="q4q7:t8">

                ID чата/группы (необязательно)
              </label>
              <input
                type="text"
                value={formData.telegramChatId}
                onChange={(e) =>
                setFormData({ ...formData, telegramChatId: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-sm"
                placeholder="-1001234567890"
                data-oid="_mxgof2" />

            </div>

            <div data-oid="-p:mvr6">
              <label
                className="block text-xs text-gray-400 mb-1"
                data-oid="u2jnepd">

                ID топика (для групп с топиками)
              </label>
              <input
                type="text"
                value={formData.telegramTopicId}
                onChange={(e) =>
                setFormData({ ...formData, telegramTopicId: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-sm"
                placeholder="123"
                data-oid="7gvv45b" />

            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div
          className="flex justify-end gap-3 p-6 border-t border-white/10 flex-shrink-0"
          data-oid="2_z-bg5">

          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            data-oid="c3wa42z">

            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name.trim() || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-oid="ny:l5cm">

            <Save className="w-4 h-4" data-oid="h9j_v5c" />
            {isSubmitting ? 'Создание...' : 'Создать проект'}
          </button>
        </div>
      </div>
    </div>);

}