"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Board } from "@/types";
import { generateId } from "@/lib/utils";
import { Plus, Edit2, Trash2, Settings } from "lucide-react";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { CreateBoardModal } from "./CreateBoardModal";
import { api } from "@/lib/api";

interface BoardManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BoardManager({ isOpen, onClose }: BoardManagerProps) {
  const { state, dispatch, createBoard } = useApp();
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  if (!isOpen || !state.selectedProject) return null;

  const projectBoards = state.boards.filter(
    (board) => board.projectId === state.selectedProject!.id
  );

  const handleCreateBoard = async (boardData: Omit<Board, "id" | "createdAt">) => {
    try {
      const success = await createBoard({
        name: boardData.name,
        description: boardData.description,
        projectId: boardData.projectId
      });
      
      if (success) {
        setShowCreateModal(false);
      } else {
        console.error('Failed to create board');
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('Error creating board:', error);
      // TODO: Show error notification
    }
  };

  const handleUpdateBoard = (board: Board, newName: string) => {
    if (!newName.trim()) return;

    const updatedBoard = { ...board, name: newName };
    dispatch({ type: "UPDATE_BOARD", payload: updatedBoard });
    setEditingBoard(null);
  };

  const handleDeleteBoard = (board: Board) => {
    setBoardToDelete(board);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (boardToDelete) {
      try {
        await api.deleteBoard(boardToDelete.id.toString());
        dispatch({ type: "DELETE_BOARD", payload: boardToDelete.id });
        setBoardToDelete(null);
        setShowDeleteModal(false);
      } catch (error) {
        console.error('Ошибка удаления доски:', error);
        // TODO: Показать уведомление об ошибке
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      data-oid="haojl0:">

      <div
        className="w-full max-w-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden"
        data-oid="xq-8zo.">

        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b border-white/10"
          data-oid="18n_i5-">

          <h2 className="text-xl font-semibold text-white" data-oid="bkl6lem">
            Управление досками
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-oid="rxiwhs:">

            ×
          </button>
        </div>

        <div className="p-6" data-oid="snu0pk_">
          {/* Create new board */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Создать новую доску
            </button>
          </div>

          {/* Boards list */}
          <div className="space-y-3" data-oid="5gos4k6">
            <h3
              className="text-lg font-medium text-white mb-4"
              data-oid="hxnaas6">

              Доски проекта "{state.selectedProject.name}"
            </h3>

            {projectBoards.length === 0 ?
            <p className="text-gray-400 text-center py-8" data-oid="a2c6tbg">
                Нет созданных досок
              </p> :

            projectBoards.map((board) =>
            <div
              key={board.id}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg"
              data-oid="8h_un8p">

                  <div className="flex items-center gap-3" data-oid="2m2rgf1">
                    <div
                  className={`w-3 h-3 rounded-full ${
                  state.selectedBoard?.id === board.id ?
                  "bg-primary-500" :
                  "bg-gray-500"}`
                  }
                  data-oid="tvdevm0" />


                    {editingBoard?.id === board.id ?
                <input
                  type="text"
                  defaultValue={board.name}
                  className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-primary-500"
                  autoFocus
                  onBlur={(e) => handleUpdateBoard(board, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleUpdateBoard(board, e.currentTarget.value);
                    }
                  }}
                  data-oid="v3mqoe4" /> :


                <span
                  className="text-white font-medium"
                  data-oid="xpzgrx9">

                        {board.name}
                      </span>
                }
                    {state.selectedBoard?.id === board.id &&
                <span
                  className="text-xs text-primary-400 bg-primary-500/20 px-2 py-1 rounded-full"
                  data-oid="wi43-60">

                        Активная
                      </span>
                }
                  </div>

                  <div className="flex items-center gap-2" data-oid="fflk60m">
                    <button
                  onClick={() =>
                  dispatch({ type: "SELECT_BOARD", payload: board })
                  }
                  className="px-3 py-1 text-sm bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 rounded transition-colors"
                  data-oid="rngra12">

                      Выбрать
                    </button>
                    <button
                  onClick={() => setEditingBoard(board)}
                  className="p-2 hover:bg-white/10 rounded transition-colors"
                  title="Переименовать"
                  data-oid="h7m1py_">

                      <Edit2
                    className="w-4 h-4 text-gray-400"
                    data-oid="0c97e1b" />

                    </button>
                    {projectBoards.length > 1 &&
                <button
                  onClick={() => handleDeleteBoard(board)}
                  className="p-2 hover:bg-primary-700/20 rounded transition-colors"
                  title="Удалить"
                  data-oid="umvxy6d">

                        <Trash2
                    className="w-4 h-4 text-red-400"
                    data-oid="scazk_g" />

                      </button>
                }
                  </div>
                </div>
            )
            }
          </div>
        </div>
      </div>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Удалить доску"
        message={`Вы уверены, что хотите удалить доску "${boardToDelete?.name}"? Все задачи будут удалены.`}
      />
      
      <CreateBoardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateBoard}
        projectId={state.selectedProject!.id}
      />
    </div>);

}