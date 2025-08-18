// API клиент для работы с бэкендом

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    this.initializeCSRF();
  }

  private async initializeCSRF(): Promise<void> {
    try {
      // Get CSRF token from server
      const response = await fetch(`${this.baseUrl}/api/csrf`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrfToken;
      }
    } catch (error) {
      console.warn('Failed to initialize CSRF token:', error);
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Используем только cookie для безопасности (защита от XSS)
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token-client='));
    if (authCookie) {
      return authCookie.split('=')[1];
    }
    
    return null;
  }

  private getCSRFToken(): string | null {
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      const csrfCookie = cookies.find(cookie => 
        cookie.trim().startsWith('csrf-token=')
      );
      if (csrfCookie) {
        return csrfCookie.split('=')[1];
      }
    }
    return this.csrfToken;
  }

  private setAuthToken(token: string): void {
    // Токен устанавливается сервером через httpOnly cookie
    // Клиентская установка не требуется для безопасности
    // localStorage больше не используется для предотвращения XSS атак
  }

  private removeAuthToken(): void {
    // Токен удаляется сервером через API logout
    // localStorage больше не используется для предотвращения XSS атак
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const token = this.getAuthToken();
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
          ...options.headers as Record<string, string>,
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Add CSRF token for state-changing requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
          const csrfToken = this.getCSRFToken();
          if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
          }
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        const response = await fetch(url, {
          headers,
          credentials: 'include', // Для работы с cookies
          signal: controller.signal,
          ...options,
        });
        
        clearTimeout(timeoutId);

        // Handle different response types
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = { message: await response.text() };
        }

        if (!response.ok) {
          // Handle specific HTTP errors
          if (response.status === 401) {
            // Unauthorized - just return error, don't redirect
            // The AuthModal will handle showing login form
            return { error: 'Сессия истекла. Необходимо войти в систему заново.' };
          }
          
          if (response.status === 403) {
            return { error: 'Недостаточно прав для выполнения операции' };
          }
          
          if (response.status === 429) {
            // Rate limiting - wait and retry
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
              continue;
            }
            return { error: 'Слишком много запросов. Попробуйте позже.' };
          }
          
          if (response.status >= 500) {
            // Server error - retry
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
              continue;
            }
            return { error: 'Ошибка сервера. Попробуйте позже.' };
          }
          
          return { error: data.error || `HTTP ${response.status}: ${response.statusText}` };
        }

        return { data };
        
      } catch (error) {
        console.error(`API Error (attempt ${attempt + 1}):`, error);
        
        // Handle specific error types
        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
          return { error: 'Ошибка сети. Проверьте подключение к интернету.' };
        }
        
        if (error instanceof Error && error.name === 'AbortError') {
          return { error: 'Запрос прерван по таймауту' };
        }
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
        
        return { error: 'Произошла неожиданная ошибка' };
      }
    }
    
    return { error: 'Максимальное количество попыток исчерпано' };
  }

  // Методы аутентификации
  async login(email: string, password: string) {
    const response = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Сохраняем токен при успешном логине
    if (response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  async register(name: string, email: string, password: string) {
    const response = await this.request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    
    // Сохраняем токен при успешной регистрации
    if (response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    // Удаляем токен при выходе
    this.removeAuthToken();
    
    return response;
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me');
  }

  // Методы для работы с пользователями
  async getUsers(params?: {
    status?: string;
    projectId?: string;
    includeStats?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.includeStats) searchParams.set('includeStats', 'true');
    
    const query = searchParams.toString();
    return this.request<{ users: any[] }>(`/users${query ? `?${query}` : ''}`);
  }

  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    status?: string;
  }) {
    return this.request<{ user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, updateData: {
    role?: string;
    status?: string;
  }) {
    return this.request<{ user: any }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Методы для работы с проектами
  async getProjects() {
    return this.request<{ projects: any[] }>('/projects');
  }

  async createProject(projectData: {
    name: string;
    description?: string;
    color?: string;
    isPrivate?: boolean;
  }) {
    return this.request<{ project: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(projectId: string, updateData: {
    name?: string;
    description?: string;
    color?: string;
    status?: string;
  }) {
    return this.request<{ project: any }>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteProject(projectId: string) {
    return this.request(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  // Методы для работы с досками
  async getBoards(projectId?: string, params?: {
    includeArchived?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    if (projectId) searchParams.set('projectId', projectId);
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    
    const query = searchParams.toString();
    return this.request<{ boards: any[] }>(`/boards${query ? `?${query}` : ''}`);
  }

  async createBoard(boardData: {
    name: string;
    description?: string;
    projectId: string;
    visibility?: 'public' | 'private';
    color?: string;
    allowComments?: boolean;
    allowAttachments?: boolean;
    autoArchive?: boolean;
  }) {
    return this.request<{ board: any }>('/boards', {
      method: 'POST',
      body: JSON.stringify(boardData),
    });
  }

  async deleteBoard(boardId: string) {
    return this.request(`/boards?boardId=${boardId}`, {
      method: 'DELETE',
    });
  }

  // Методы для работы с колонками
  async getColumns(boardId: string, params?: {
    includeArchived?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set('boardId', boardId);
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    
    const query = searchParams.toString();
    return this.request<{ columns: any[] }>(`/columns?${query}`);
  }

  async createColumn(columnData: {
    title: string;
    boardId: string;
    color?: string;
    wipLimit?: number;
    isCollapsed?: boolean;
    autoMoveRules?: {
      enabled: boolean;
      conditions: any[];
      targetColumnId?: string;
    };
    notifications?: {
      onTaskAdded: boolean;
      onTaskMoved: boolean;
      onWipLimitExceeded: boolean;
    };
    taskTemplate?: {
      enabled: boolean;
      defaultTitle?: string;
      defaultDescription?: string;
      defaultPriority?: string;
      defaultTags?: string[];
    };
  }) {
    return this.request<{ column: any }>('/columns', {
      method: 'POST',
      body: JSON.stringify(columnData),
    });
  }

  async updateColumnsOrder(boardId: string, columnOrders: Record<string, number>) {
    return this.request('/columns', {
      method: 'PUT',
      body: JSON.stringify({ boardId, columnOrders }),
    });
  }

  // Методы для работы с задачами
  async getTasks(params?: {
    columnId?: string;
    projectId?: string;
    boardId?: string;
    status?: string;
    assigneeId?: string;
    priority?: string;
    includeArchived?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.columnId) searchParams.set('columnId', params.columnId);
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.boardId) searchParams.set('boardId', params.boardId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.includeArchived) searchParams.set('includeArchived', 'true');
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<{ tasks: any[] }>(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(taskId: string) {
    return this.request<{ task: any }>(`/tasks/${taskId}`);
  }

  async createTask(taskData: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    columnId: string;
    position?: number;
    dueDate?: string;
    estimatedHours?: number;
    tags?: string[];
  }) {
    return this.request<{ task: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async updateTask(taskId: string, updateData: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    position?: number;
    storyPoints?: number;
    estimatedHours?: number;
    actualHours?: number;
    deadline?: string;
    columnId?: string;
    parentTaskId?: string;
    isArchived?: boolean;
    assigneeIds?: string[];
    tags?: string[];
  }) {
    return this.request<{ task: any }>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async deleteTask(taskId: string) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }
}

// Экспорт единственного экземпляра API клиента
export const api = new ApiClient();

// Типы для TypeScript
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'suspended';
  approval_status?: 'pending' | 'approved' | 'rejected';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  stats?: {
    assignedTasksCount: number;
    createdTasksCount: number;
    createdProjectsCount: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  isPrivate: boolean;
  isArchived: boolean;
  archivedAt?: string;
  createdBy: string;
  creatorName: string;
  membersCount: number;
  tasksCount: number;
  boardsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  position: number;
  isArchived: boolean;
  archivedAt?: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  tasksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  color: string;
  position: number;
  isArchived: boolean;
  archivedAt?: string;
  boardId: string;
  boardName: string;
  projectName: string;
  tasksCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  position: number;
  storyPoints?: number;
  estimatedHours?: number;
  actualHours?: number;
  deadline?: string;
  startedAt?: string;
  completedAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  boardId: string;
  boardName: string;
  columnId?: string;
  columnTitle?: string;
  columnColor?: string;
  reporterId: string;
  reporterName: string;
  parentTaskId?: string;
  parentTaskTitle?: string;
  assignees: User[];
  tags: { id: string; name: string; color: string }[];
  commentsCount: number;
  attachmentsCount: number;
  createdAt: string;
  updatedAt: string;
}