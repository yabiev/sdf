"use client";

import React, { useState } from "react";
import { Task } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { cn, getInitials } from "@/lib/utils";
import {
  Plus,
  Filter,
  SortAsc,
  MoreHorizontal,
  Users,
  Calendar,
  Bell,
  Menu,
  X,
  Settings,
  LogOut,
  Activity } from
"lucide-react";
import { useConfirmation } from "@/hooks/useConfirmation";
import { CreateTaskModal } from "./CreateTaskModal";
import BoardManager from "./BoardManager";
import { CustomSelect } from "./CustomSelect";
import { TaskActionsModal } from "./TaskActionsModal";
import { UserProfile } from "./UserProfile";
import { logTaskCreated } from "@/utils/taskLogger";

interface TopBarProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export function TopBar({
  onToggleSidebar,
  sidebarCollapsed,
  onNavigate,
  currentPage = "boards"
}: TopBarProps) {
  const { state, dispatch, createTask, logout } = useApp();
  const { ConfirmationComponent, confirm } = useConfirmation();
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
  const [isTaskActionsModalOpen, setIsTaskActionsModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  const handleCreateTask = async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newTask = {
        ...taskData,
        boardId: state.selectedBoard!.id,
        projectId: state.selectedProject!.id,
        reporter: state.currentUser!,
        assignees: taskData.assignees || (taskData.assignee ? [taskData.assignee] : []), // Handle both assignees and assignee
        position: state.tasks.filter(
          (t) =>
          t.status === taskData.status && t.boardId === state.selectedBoard!.id
        ).length
      };
      
      const success = await createTask(newTask);
      
      // Логирование создания задачи
      if (state.currentUser && success) {
        // Find the newly created task in the state
        const createdTask = state.tasks.find(task => 
          task.title === newTask.title && 
          task.projectId === newTask.projectId &&
          task.boardId === newTask.boardId
        );
        
        if (createdTask) {
          logTaskCreated(
            dispatch,
            createdTask.id,
            state.selectedBoard?.id || '',
            state.selectedProject?.id || '',
            createdTask.title,
            state.currentUser.id,
            state.currentUser.name
          );
        }
      }
      
      setIsCreateTaskModalOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleSort = () => {
    const newOrder = state.sortOrder === "asc" ? "desc" : "asc";
    dispatch({
      type: "SET_SORT",
      payload: { sortBy: state.sortBy, sortOrder: newOrder }
    });
  };

  const handleFilterChange = (filterType: string, value: string) => {
    dispatch({
      type: "SET_FILTERS",
      payload: { [filterType]: value }
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Выход из аккаунта',
      message: 'Вы уверены, что хотите выйти из аккаунта?',
      confirmText: 'Выйти',
      cancelText: 'Отмена',
      type: 'warning'
    });

    if (confirmed) {
      logout();
    }
  };

  // Count unread notifications from the new notification system
  const getUnreadNotificationsCount = () => {
    if (!state.currentUser) return 0;
    
    // Count user-specific notifications
    const userNotifications = state.notifications
      .filter(notification => state.currentUser && notification.userId === state.currentUser.id && !notification.isRead)
      .length;
    
    // Count pending user notifications for admins
    const pendingUserNotifications = state.currentUser.role === 'admin' ? 
      (state.pendingUserNotifications?.length || 0) : 0;
    
    return userNotifications + pendingUserNotifications;
  };
  
  const unreadNotifications = getUnreadNotificationsCount();

  return (
    <>
      <div
        className="relative h-16 bg-gray-900/50 backdrop-blur-xl border-b border-white/10 px-4 lg:px-6 flex items-center justify-between"
        data-oid="a9tf:m3">

        {/* Left section */}
        <div className="flex items-center gap-2 lg:gap-4" data-oid="9g7jnfn">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
            data-oid="muj-i9-">

            <Menu className="w-5 h-5 text-gray-400" data-oid="9wujrs6" />
          </button>

          <div className="flex items-center gap-2 min-w-0" data-oid="9d_5n4q">
            {currentPage === "boards" ? (
              <>
                <h1 className="text-lg lg:text-xl font-semibold text-white truncate" data-oid="ys5n69y">
                  {state.selectedBoard?.name || "Выберите доску"}
                </h1>
                {state.selectedProject &&
                <div
                  className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full flex-shrink-0"
                  data-oid="4tht53h">

                    <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: state.selectedProject.color }}
                    data-oid="rfi5lh." />

                    <span className="text-sm text-gray-300" data-oid="fmtdcgr">
                      {state.selectedProject.name}
                    </span>
                  </div>
                }

                {/* Board management button - only for admins and managers */}
                {(state.currentUser?.role === 'admin' || state.currentUser?.role === 'manager') && (
                  <button
                    onClick={() => setIsBoardManagerOpen(true)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Управление досками"
                    data-oid="p-g-_z_">

                    <Settings className="w-4 h-4 text-gray-400" data-oid="_asezpr" />
                  </button>
                )}
              </>
            ) : (
              <h1 className="text-lg lg:text-xl font-semibold text-white truncate" data-oid="ys5n69y">
                {currentPage === "home" && "Главная"}
                {currentPage === "calendar" && "Календарь"}
                {currentPage === "team" && "Команда"}
                {currentPage === "notifications" && "Уведомления"}
                {currentPage === "settings" && "Настройки"}
                {currentPage === "admin" && "Администрирование"}
              </h1>
            )}
          </div>
        </div>

        {/* Center section - Filters (only on boards page) */}
        {currentPage === "boards" && (
          <div className="hidden md:flex items-center gap-2" data-oid="thb3i:p">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors glass hover-lift",
                showFilters ?
                "bg-primary-500/20 text-primary-300" :
                "text-gray-400 hover:text-white"
              )}
              data-oid="adwyo8.">

              <Filter className="w-4 h-4" data-oid="48n0x64" />
              <span className="text-sm" data-oid="1-ph:mq">
                Фильтры
              </span>
            </button>

            <button
              onClick={handleSort}
              className="hover-lift glass flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              data-oid="tz0xdvx">

              <SortAsc className="w-4 h-4" data-oid="rj7cq3d" />
              <span className="text-sm" data-oid="t3b-ifa">
                {state.sortOrder === "asc" ? "↑" : "↓"} {state.sortBy}
              </span>
            </button>

            <button
              onClick={() => onNavigate?.("team")}
              className="hover-lift glass flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              data-oid="oqoonsc">

              <Users className="w-4 h-4" data-oid="0n.wuwq" />
              <span className="text-sm" data-oid="..yd9jl">
                Команда ({state.selectedProject?.members.length || 0})
              </span>
            </button>

            <button
              onClick={() => setIsTaskActionsModalOpen(true)}
              className="hover-lift glass flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="История действий">

              <Activity className="w-4 h-4" />
              <span className="text-sm">
                Действия
              </span>
            </button>
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2" data-oid="7:-nh66">
          <button
            onClick={() => onNavigate?.("notifications")}
            className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300 hover-lift"
            title="Уведомления"
            data-oid="bbc4jzh">

            <Bell className="w-5 h-5 transition-transform duration-200" data-oid="dp.gfmc" />
            {unreadNotifications > 0 &&
            <div
              className="absolute -top-1 -right-1 w-5 h-5 bg-primary-700 rounded-full flex items-center justify-center text-xs text-white badge animate-pulse"
              data-oid="-xgw:5n">

                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </div>
            }
          </button>

          <button
            onClick={() => onNavigate?.("calendar")}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300 hover-lift"
            title="Календарь"
            data-oid="rseo0ey">

            <Calendar className="w-5 h-5 transition-transform duration-200" data-oid="xscfnf6" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-2" data-oid="mmpjrmi"></div>



          <div className="flex items-center gap-2">
            {state.settings?.showAvatars && (
              state.currentUser?.avatar ?
              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="hover-scale hover:ring-2 hover:ring-primary-500/50 rounded-full transition-all"
                title={`Профиль: ${state.currentUser.name}`}>
                <img
                  src={state.currentUser.avatar}
                  alt={state.currentUser.name}
                  className="w-8 h-8 rounded-full" />
              </button> :
              <button
                onClick={() => setIsUserProfileOpen(true)}
                className="hover-scale w-8 h-8 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center text-sm text-white transition-all hover:ring-2 hover:ring-primary-500/50"
                title={`Профиль: ${state.currentUser?.name || "Пользователь"}`}>
                {state.currentUser ? getInitials(state.currentUser.name) : "?"}
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className="hover-lift p-2 hover:bg-white/10 rounded-lg transition-all duration-300"
              title="Выйти"
              data-oid="logout-btn">
              <LogOut className="w-5 h-5 text-gray-400 transition-transform duration-200" data-oid="logout-icon" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters dropdown - positioned relative to the page, not the topbar */}
      {showFilters &&
      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowFilters(false)}
        data-oid="qkr3p:v">

          <div
          className="glass-dark absolute top-20 left-1/2 transform -translate-x-1/2 w-96 rounded-xl p-6 z-50 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          data-oid="588vpr8">

            <h3
            className="text-lg font-medium text-white mb-4"
            data-oid="in80zla">

              Фильтры
            </h3>
            <div className="space-y-4" data-oid="83h2ouv">
              {/* Assignee filter */}
              <div data-oid="wo69a3b">
                <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="a3pki7n">

                  Исполнитель
                </label>
                <CustomSelect
                  options={[
                    { value: "", label: "Все исполнители" },
                    ...(state.selectedProject?.members.map((member) => ({
                      value: member.id,
                      label: member.name
                    })) || [])
                  ]}
                  value={state.filters.assignee}
                  onChange={(value) => handleFilterChange("assignee", value)}
                  placeholder="Все исполнители"
                />
              </div>

              {/* Priority filter */}
              <div data-oid="x.1l520">
                <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="tohyw69">

                  Приоритет
                </label>
                <CustomSelect
                  options={[
                    { value: "", label: "Все приоритеты" },
                    { value: "low", label: "Низкий", color: "#a5b4fc" },
        { value: "medium", label: "Средний", color: "#818cf8" },
        { value: "high", label: "Высокий", color: "#6366f1" },
        { value: "urgent", label: "Срочный", color: "#4f46e5" }
                  ]}
                  value={state.filters.priority}
                  onChange={(value) => handleFilterChange("priority", value)}
                  placeholder="Все приоритеты"
                />
              </div>

              {/* Status filter */}
              <div data-oid="wdtu74m">
                <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="wb848cu">

                  Статус
                </label>
                <CustomSelect
                  options={[
                    { value: "", label: "Все статусы" },
                    { value: "todo", label: "К выполнению", color: "#a5b4fc" },
        { value: "in-progress", label: "В работе", color: "#6366f1" },
        { value: "review", label: "На проверке", color: "#818cf8" },
        { value: "done", label: "Выполнено", color: "#4f46e5" }
                  ]}
                  value={state.filters.status}
                  onChange={(value) => handleFilterChange("status", value)}
                  placeholder="Все статусы"
                />
              </div>

              {/* Deadline filter */}
              <div data-oid="mpcnwkk">
                <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid=":uvcq5x">

                  Дедлайн
                </label>
                <CustomSelect
                  options={[
                    { value: "", label: "Все задачи" },
                    { value: "overdue", label: "Просроченные", color: "#4f46e5" },
        { value: "today", label: "Сегодня", color: "#818cf8" },
        { value: "week", label: "На этой неделе", color: "#6366f1" },
        { value: "month", label: "В этом месяце", color: "#a5b4fc" }
                  ]}
                  value={state.filters.deadline}
                  onChange={(value) => handleFilterChange("deadline", value)}
                  placeholder="Все задачи"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6" data-oid="02f8bqy">
              <button
              onClick={() => setShowFilters(false)}
              className="glass hover-lift px-4 py-2 text-gray-400 hover:text-white transition-colors rounded-lg"
              data-oid="faw5fu1">

                Закрыть
              </button>
              <button
              onClick={() => {
                dispatch({
                  type: "SET_FILTERS",
                  payload: {
                    assignee: "",
                    priority: "",
                    status: "",
                    deadline: ""
                  }
                });
              }}
              className="glass hover-lift px-4 py-2 bg-red-500/80 hover:bg-red-600/90 text-white rounded-lg transition-colors"
              data-oid="-0wxgbq">

                Сбросить
              </button>
            </div>
          </div>
        </div>
      }

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSave={handleCreateTask}
        data-oid="93q-20r" />


      {/* Board Manager Modal */}
      <BoardManager
        isOpen={isBoardManagerOpen}
        onClose={() => setIsBoardManagerOpen(false)}
        data-oid="mtiij.f" />

      {/* Task Actions Modal */}
      <TaskActionsModal
        isOpen={isTaskActionsModalOpen}
        onClose={() => setIsTaskActionsModalOpen(false)} />

      {/* User Profile Modal */}
      <UserProfile
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)} />

      {/* Confirmation Modal */}
      {ConfirmationComponent()}

    </>);

}