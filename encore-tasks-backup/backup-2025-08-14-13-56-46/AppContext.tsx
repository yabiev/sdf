"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from "react";
import { Task, Project, User, Board, Column, TaskStatus, TaskAction } from "@/types";
import { generateId } from "@/lib/utils";
import { api, type User as ApiUser, type Project as ApiProject, type Board as ApiBoard, type Task as ApiTask } from "@/lib/api";

// Helper function to create notifications
function createNotification(
  type: Notification["type"],
  title: string,
  message: string,
  userId: string,
  projectId: string,
  taskId?: string
): Notification {
  return {
    id: generateId(),
    type,
    title,
    message,
    taskId,
    projectId,
    userId,
    isRead: false,
    createdAt: new Date()
  };
}

interface Notification {
  id: string;
  type: "task_assigned" | "task_completed" | "task_updated" | "task_created" | "deadline_reminder";
  title: string;
  message: string;
  taskId?: string;
  projectId: string;
  userId: string;
  isRead: boolean;
  createdAt: Date;
}

interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  projects: Project[];
  boards: Board[];
  tasks: Task[];
  archivedTasks: Task[];
  filteredTasks: Task[] | null;
  users: User[];
  selectedProject: Project | null;
  taskActions: TaskAction[];
  selectedBoard: Board | null;
  readNotifications: string[];
  notifications: Notification[];
  pendingUserNotifications: User[];
  filters: {
    assignee: string;
    priority: string;
    status: string;
    deadline: string;
  };
  sortBy: "priority" | "deadline" | "created" | "updated";
  sortOrder: "asc" | "desc";
  settings: {
    theme: "dark" | "light" | "auto";
    language: "ru" | "en";
    compactMode: boolean;
    showAvatars: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    taskReminders: boolean;
    telegramNotifications: boolean;
    taskAssigned: boolean;
    taskCompleted: boolean;
    deadlineReminder: boolean;
    projectUpdates: boolean;
  };
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CURRENT_USER"; payload: User }
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_USERS"; payload: User[] }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "APPROVE_USER"; payload: string }
  | { type: "REJECT_USER"; payload: string }
  | { type: "ADD_PENDING_USER_NOTIFICATION"; payload: User }
  | { type: "SET_PROJECTS"; payload: Project[] }
  | { type: "ADD_PROJECT"; payload: Project }
  | { type: "UPDATE_PROJECT"; payload: Project }
  | { type: "DELETE_PROJECT"; payload: string }
  | { type: "SELECT_PROJECT"; payload: Project | null }
  | { type: "SET_BOARDS"; payload: Board[] }
  | { type: "ADD_BOARD"; payload: Board }
  | { type: "UPDATE_BOARD"; payload: Board }
  | { type: "DELETE_BOARD"; payload: string }
  | { type: "SELECT_BOARD"; payload: Board | null }
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: Task }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "ARCHIVE_TASK"; payload: string }
  | { type: "UNARCHIVE_TASK"; payload: string }
  | { type: "SET_ARCHIVED_TASKS"; payload: Task[] }
  | {
      type: "MOVE_TASK";
      payload: { taskId: string; newStatus: TaskStatus; newPosition: number };
    }
  | { type: "ADD_COLUMN"; payload: { boardId: string; column: Column } }
  | { type: "UPDATE_COLUMN"; payload: { boardId: string; column: Column } }
  | { type: "DELETE_COLUMN"; payload: { boardId: string; columnId: string } }
  | { type: "SET_FILTERS"; payload: Partial<AppState["filters"]> }
  | {
      type: "SET_SORT";
      payload: { sortBy: AppState["sortBy"]; sortOrder: AppState["sortOrder"] };
    }
  | { type: "SET_FILTERED_TASKS"; payload: Task[] }
  | { type: "CLEAR_FILTERED_TASKS" }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppState["settings"]> }
  | { type: "ADD_TASK_ACTION"; payload: TaskAction };

const initialState: AppState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  projects: [],
  boards: [],
  tasks: [],
  archivedTasks: [],
  filteredTasks: null,
  users: [],
  selectedProject: null,
  taskActions: [],
  selectedBoard: null,
  readNotifications: [],
  notifications: [],
  pendingUserNotifications: [],
  filters: {
    assignee: "",
    priority: "",
    status: "",
    deadline: ""
  },
  sortBy: "created",
  sortOrder: "desc",
  settings: {
    theme: "dark",
    language: "ru",
    compactMode: false,
    showAvatars: true,
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    telegramNotifications: true,
    taskAssigned: true,
    taskCompleted: true,
    deadlineReminder: true,
    projectUpdates: true
  }
};

// Load settings from localStorage
const loadSettings = (): AppState["settings"] => {
  if (typeof window === "undefined") return initialState.settings;
  
  try {
    const saved = localStorage.getItem("encore-tasks-settings");
    if (saved) {
      return { ...initialState.settings, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return initialState.settings;
};

// Save settings to localStorage
const saveSettings = (settings: AppState["settings"]) => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem("encore-tasks-settings", JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
};

// Convert API types to app types
const convertApiUserToUser = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  role: apiUser.role,
  isApproved: apiUser.status === 'active',
  createdAt: new Date(apiUser.createdAt),
  avatar: apiUser.avatar
});

const convertApiProjectToProject = (apiProject: ApiProject): Project => ({
  id: apiProject.id,
  name: apiProject.name,
  description: apiProject.description || '',
  color: apiProject.color,
  members: [], // Will be loaded separately
  createdBy: apiProject.createdBy,
  createdAt: new Date(apiProject.createdAt),
  telegramChatId: undefined // Will be added later if needed
});

const convertApiBoardToBoard = (apiBoard: ApiBoard): Board => ({
  id: apiBoard.id,
  name: apiBoard.name,
  projectId: apiBoard.projectId,
  columns: [], // Will be loaded separately
  createdAt: new Date(apiBoard.createdAt)
});

const convertApiTaskToTask = (apiTask: ApiTask): Task => ({
  id: apiTask.id,
  title: apiTask.title,
  description: apiTask.description || '',
  status: apiTask.status as TaskStatus,
  priority: apiTask.priority,
  assignee: apiTask.assignees?.[0] ? convertApiUserToUser(apiTask.assignees[0]) : undefined,
  assignees: apiTask.assignees?.map(convertApiUserToUser) || [],
  reporter: {
    id: apiTask.reporterId,
    name: apiTask.reporterName,
    email: '',
    role: 'user',
    isApproved: true,
    createdAt: new Date()
  },
  projectId: apiTask.projectId,
  boardId: apiTask.boardId,
  subtasks: [], // Will be loaded separately if needed
  deadline: apiTask.deadline ? new Date(apiTask.deadline) : undefined,
  attachments: [], // Will be loaded separately if needed
  comments: [], // Will be loaded separately if needed
  tags: apiTask.tags?.map(tag => tag.name) || [],
  createdAt: new Date(apiTask.createdAt),
  updatedAt: new Date(apiTask.updatedAt),
  position: apiTask.position
});

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_CURRENT_USER":
    case "LOGIN":
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: true
      };

    case "LOGOUT":
      return {
        ...state,
        currentUser: null,
        isAuthenticated: false,
        projects: [],
        boards: [],
        tasks: [],
        users: [],
        selectedProject: null,
        selectedBoard: null
      };

    case "SET_USERS":
      return { ...state, users: action.payload };

    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };

    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id ? action.payload : user
        ),
        currentUser:
          state.currentUser?.id === action.payload.id
            ? action.payload
            : state.currentUser
      };

    case "SET_PROJECTS":
      return { ...state, projects: action.payload };

    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.payload] };

    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
        selectedProject:
          state.selectedProject?.id === action.payload.id
            ? action.payload
            : state.selectedProject
      };

    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
        selectedProject:
          state.selectedProject?.id === action.payload ? null : state.selectedProject
      };

    case "SELECT_PROJECT":
      return { ...state, selectedProject: action.payload };

    case "SET_BOARDS":
      return { ...state, boards: action.payload };

    case "ADD_BOARD":
      return { ...state, boards: [...state.boards, action.payload] };

    case "UPDATE_BOARD":
      return {
        ...state,
        boards: state.boards.map(board =>
          board.id === action.payload.id ? action.payload : board
        ),
        selectedBoard:
          state.selectedBoard?.id === action.payload.id
            ? action.payload
            : state.selectedBoard
      };

    case "DELETE_BOARD":
      return {
        ...state,
        boards: state.boards.filter(board => board.id !== action.payload),
        selectedBoard:
          state.selectedBoard?.id === action.payload ? null : state.selectedBoard
      };

    case "SELECT_BOARD":
      return { ...state, selectedBoard: action.payload };

    case "SET_TASKS":
      return { ...state, tasks: action.payload };

    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.payload] };

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        )
      };

    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case "SET_SORT":
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder
      };

    case "SET_FILTERED_TASKS":
      return { ...state, filteredTasks: action.payload };

    case "CLEAR_FILTERED_TASKS":
      return { ...state, filteredTasks: null };

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      };

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, isRead: true }
            : notification
        )
      };

    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      };

    case "UPDATE_SETTINGS":
      const newSettings = { ...state.settings, ...action.payload };
      saveSettings(newSettings);
      return { ...state, settings: newSettings };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // API methods
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadBoards: (projectId?: string) => Promise<void>;
  loadTasks: (params?: { projectId?: string; boardId?: string }) => Promise<void>;
  loadUsers: () => Promise<void>;
  createProject: (projectData: { name: string; description?: string; color?: string }) => Promise<boolean>;
  createBoard: (boardData: { name: string; description?: string; projectId: string }) => Promise<boolean>;
  createTask: (taskData: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    columnId: string;
    position?: number;
    dueDate?: Date;
    estimatedHours?: number;
    tags?: string[];
  }) => Promise<boolean>;
  updateTask: (taskId: string, updateData: any) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  updateUser: (userId: string, updateData: { role?: string; status?: string }) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    settings: loadSettings()
  });

  // Initialize authentication on app load
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      
      try {
        // Check if user is already authenticated
        const response = await api.getCurrentUser();
        
        if (response.data?.user && !response.error) {
          const user = convertApiUserToUser(response.data.user);
          dispatch({ type: "LOGIN", payload: user });
          
          // Load initial data
          // await Promise.all([
          //   loadProjects(),
          //   loadUsers()
          // ]);
        }
      } catch (error) {
        console.log('No existing session found');
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };
    
    initializeAuth();
  }, []);

  // API methods
  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      const response = await api.login(email, password);
      
      if (response.error) {
        return false;
      }
      
      if (response.data?.user) {
        const user = convertApiUserToUser(response.data.user);
        dispatch({ type: "LOGIN", payload: user });
        
        // Load initial data
        // await Promise.all([
        //   loadProjects(),
        //   loadUsers()
        // ]);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  };

  const loadProjects = useCallback(async (): Promise<void> => {
    try {
      const response = await api.getProjects();
      
      if (response.error) {
        console.error('Load projects error:', response.error);
        return;
      }
      
      if (response.data?.projects) {
        const projects = response.data.projects.map(convertApiProjectToProject);
        dispatch({ type: "SET_PROJECTS", payload: projects });
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, [dispatch]);

  const loadBoards = useCallback(async (projectId?: string): Promise<void> => {
    try {
      const response = await api.getBoards(projectId);
      
      if (response.error) {
        console.error('Load boards error:', response.error);
        return;
      }
      
      if (response.data?.boards) {
        const boards = response.data.boards.map(convertApiBoardToBoard);
        
        // Загружаем колонки для каждой доски
        for (const board of boards) {
          try {
            const columnsResponse = await api.getColumns(board.id.toString());
            if (columnsResponse.data?.columns) {
              board.columns = columnsResponse.data.columns.map((col: any) => ({
                id: col.id.toString(), // Convert to string for consistency
                name: col.name,
                title: col.name, // Add title for compatibility
                color: col.color,
                position: col.position,
                tasks: [] // Tasks will be loaded separately
              }));
            }
          } catch (error) {
            console.error(`Failed to load columns for board ${board.id}:`, error);
          }
        }
        
        dispatch({ type: "SET_BOARDS", payload: boards });
        
        // Автоматически выбираем первую доску, если нет выбранной доски или она не принадлежит текущему проекту
        if (boards.length > 0) {
          const currentSelectedBoard = state.selectedBoard;
          const shouldSelectNewBoard = !currentSelectedBoard || 
            !boards.find(board => board.id === currentSelectedBoard.id);
          
          if (shouldSelectNewBoard) {
            dispatch({ type: "SELECT_BOARD", payload: boards[0] });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  }, [dispatch, state.selectedBoard]);

  const loadTasks = useCallback(async (params?: { projectId?: string; boardId?: string }): Promise<void> => {
    try {
      const response = await api.getTasks(params);
      
      if (response.error) {
        console.error('Load tasks error:', response.error);
        return;
      }
      
      if (response.data?.tasks) {
        const tasks = response.data.tasks.map(convertApiTaskToTask);
        dispatch({ type: "SET_TASKS", payload: tasks });
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [dispatch]);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      const response = await api.getUsers();
      
      if (response.error) {
        console.error('Load users error:', response.error);
        return;
      }
      
      if (response.data?.users) {
        const users = response.data.users.map(convertApiUserToUser);
        dispatch({ type: "SET_USERS", payload: users });
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [dispatch]);

  const createProject = async (projectData: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<boolean> => {
    try {
      const response = await api.createProject({
        ...projectData,
        color: projectData.color || '#6366f1'
      });
      
      if (response.error) {
        console.error('Create project error:', response.error);
        return false;
      }
      
      if (response.data?.project) {
        const project = convertApiProjectToProject(response.data.project);
        dispatch({ type: "ADD_PROJECT", payload: project });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to create project:', error);
      return false;
    }
  };

  const createBoard = async (boardData: {
    name: string;
    description?: string;
    projectId: string;
  }): Promise<boolean> => {
    try {
      const response = await api.createBoard({
        title: boardData.name,
        description: boardData.description,
        projectId: boardData.projectId,
        visibility: 'public',
        color: '#6366f1',
        allowComments: true,
        allowAttachments: true,
        autoArchive: false
      });
      
      if (response.error) {
        console.error('Create board error:', response.error);
        return false;
      }
      
      if (response.data?.board) {
        const board = convertApiBoardToBoard(response.data.board);
        dispatch({ type: "ADD_BOARD", payload: board });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to create board:', error);
      return false;
    }
  };

  const createTask = async (taskData: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    columnId: string;
    position?: number;
    dueDate?: Date;
    estimatedHours?: number;
    tags?: string[];
  }): Promise<boolean> => {
    try {
      const response = await api.createTask({
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assigneeId: taskData.assigneeId,
        columnId: taskData.columnId,
        position: taskData.position || 0,
        dueDate: taskData.dueDate,
        estimatedHours: taskData.estimatedHours,
        tags: taskData.tags || []
      });
      
      if (response.error) {
        console.error('Create task error:', response.error);
        return false;
      }
      
      if (response.data?.task) {
        const task = convertApiTaskToTask(response.data.task);
        dispatch({ type: "ADD_TASK", payload: task });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to create task:', error);
      return false;
    }
  };

  const updateTask = async (taskId: string, updateData: any): Promise<boolean> => {
    try {
      const response = await api.updateTask(taskId, updateData);
      
      if (response.error) {
        console.error('Update task error:', response.error);
        return false;
      }
      
      if (response.data?.task) {
        const task = convertApiTaskToTask(response.data.task);
        dispatch({ type: "UPDATE_TASK", payload: task });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update task:', error);
      return false;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      const response = await api.deleteTask(taskId);
      
      if (response.error) {
        console.error('Delete task error:', response.error);
        return false;
      }
      
      dispatch({ type: "DELETE_TASK", payload: taskId });
      return true;
    } catch (error) {
      console.error('Failed to delete task:', error);
      return false;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const response = await api.deleteProject(projectId);
      
      if (response.error) {
        console.error('Delete project error:', response.error);
        return false;
      }
      
      dispatch({ type: "DELETE_PROJECT", payload: projectId });
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  };

  const deleteBoard = async (boardId: string): Promise<boolean> => {
    try {
      const response = await api.deleteBoard(boardId);
      
      if (response.error) {
        console.error('Delete board error:', response.error);
        return false;
      }
      
      dispatch({ type: "DELETE_BOARD", payload: boardId });
      return true;
    } catch (error) {
      console.error('Failed to delete board:', error);
      return false;
    }
  };

  const updateUser = async (userId: string, updateData: { role?: string; status?: string }): Promise<boolean> => {
    try {
      const response = await api.updateUser(userId, updateData);
      
      if (response.error) {
        console.error('Update user error:', response.error);
        return false;
      }
      
      if (response.data?.user) {
        const updatedUser = convertApiUserToUser(response.data.user);
        dispatch({ type: "UPDATE_USER", payload: updatedUser });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update user:', error);
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await api.deleteUser(userId);
      
      if (response.error) {
        console.error('Delete user error:', response.error);
        return false;
      }
      
      dispatch({ type: "REJECT_USER", payload: userId });
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  };

  const contextValue = {
    state,
    dispatch,
    login,
    logout,
    loadProjects,
    loadBoards,
    loadTasks,
    loadUsers,
    createProject,
    createBoard,
    createTask,
    updateTask,
    deleteTask,
    deleteProject,
    updateUser,
    deleteUser
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export { createNotification };
export type { Notification, AppState, AppAction };