import { PostgreSQLAdapter } from './postgresql-adapter';
import { User, Project, Board, Column, Task, Session } from '@/types';

/**
 * Оптимизированный адаптер базы данных
 * Исправляет проблемы:
 * - Устраняет повторную инициализацию при каждом запросе
 * - Использует Singleton паттерн для управления соединениями
 * - Добавляет правильную обработку ошибок
 * - Оптимизирует производительность
 */
class DatabaseAdapterOptimized {
  private static instance: DatabaseAdapterOptimized;
  private postgresqlAdapter: PostgreSQLAdapter;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.postgresqlAdapter = PostgreSQLAdapter.getInstance();
  }

  public static getInstance(): DatabaseAdapterOptimized {
    if (!DatabaseAdapterOptimized.instance) {
      DatabaseAdapterOptimized.instance = new DatabaseAdapterOptimized();
    }
    return DatabaseAdapterOptimized.instance;
  }

  /**
   * Инициализация адаптера (вызывается только один раз)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private async performInitialization(): Promise<void> {
    try {
      await this.postgresqlAdapter.initialize();
      this.isInitialized = true;
      console.log('✅ Database Adapter оптимизирован и готов к работе');
    } catch (error) {
      console.error('❌ Ошибка инициализации Database Adapter:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Проверка инициализации перед выполнением операций
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  // === МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ===
  async createUser(email: string, password: string, name: string, role: string = 'user'): Promise<User> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.createUser(email, password, name, role);
  }

  async getUserById(id: string | number): Promise<User | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getUserById(id.toString());
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getUserByEmail(email);
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getAllUsers();
  }

  async getUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getAllUsers();
  }

  async updateUser(id: string | number, updates: Partial<User>): Promise<User | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.updateUser(id.toString(), updates);
  }

  async deleteUser(id: string | number): Promise<boolean> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.deleteUser(id.toString());
  }

  // === МЕТОДЫ ДЛЯ СЕССИЙ ===
  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'last_activity_at'>): Promise<Session> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.createSession(sessionData.token, sessionData.userId, sessionData.expiresAt);
  }

  async getSessionByToken(token: string): Promise<Session | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getSessionByToken(token);
  }

  async deleteSession(token: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.deleteSession(token);
  }

  // === МЕТОДЫ ДЛЯ ПРОЕКТОВ ===
  async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    await this.ensureInitialized();
    const { name, description, createdBy, color } = projectData;
    return this.postgresqlAdapter.createProject(name, description || '', createdBy, color);
  }

  async getProjectById(id: string | number): Promise<Project | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getProjectById(id.toString());
  }

  async getAllProjects(): Promise<Project[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getAllProjects();
  }

  async getUserProjects(userId: string | number): Promise<Project[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getUserProjects(userId.toString());
  }

  async getProjectsByUserId(userId: string | number): Promise<Project[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getUserProjects(userId.toString());
  }

  async getProjectsByCreatorId(creatorId: string | number): Promise<Project[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getProjectsByCreatorId(creatorId.toString());
  }

  async hasProjectAccess(userId: string | number, projectId: string | number): Promise<boolean> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.hasProjectAccess(userId.toString(), projectId.toString());
  }

  async updateProject(id: string | number, updateData: Partial<Project>): Promise<Project | null> {
    await this.ensureInitialized();
    const result = await this.postgresqlAdapter.updateProject(id.toString(), updateData);
    return result;
  }

  async deleteProject(id: string | number): Promise<boolean> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.deleteProject(id.toString());
  }

  // === МЕТОДЫ ДЛЯ ДОСОК ===
  async createBoard(name: string, description: string, projectId: string): Promise<Board> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.createBoard(name, description, projectId);
  }

  async getBoardById(id: string | number): Promise<Board | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getBoardById(id.toString());
  }

  async getProjectBoards(projectId: string | number): Promise<Board[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getProjectBoards(projectId.toString());
  }

  async deleteBoard(id: string | number): Promise<boolean> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.deleteBoard(id.toString());
  }

  // === МЕТОДЫ ДЛЯ КОЛОНОК ===
  async createColumn(name: string, boardId: string, position?: number, color?: string): Promise<Column> {
    await this.ensureInitialized();

    return this.postgresqlAdapter.createColumn(name, boardId, position, color);
  }

  async getColumnById(id: string | number): Promise<Column | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getColumnById(id.toString());
  }

  async getBoardColumns(boardId: string | number): Promise<Column[]> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getBoardColumns(boardId.toString());
  }

  async deleteColumn(id: string | number): Promise<boolean> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.deleteColumn(id.toString());
  }

  // === МЕТОДЫ ДЛЯ ЗАДАЧ ===
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.createTask(taskData);
  }

  async getTaskById(id: string | number): Promise<Task | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.getTaskById(id.toString());
  }

  async getTasks(filters: { projectId?: string | number; boardId?: string | number; status?: string; assigneeId?: string | number; priority?: string; columnId?: string | number } = {}): Promise<Task[]> {
    await this.ensureInitialized();
    const postgresFilters = {
      projectId: filters.projectId ? filters.projectId.toString() : undefined,
      boardId: filters.boardId ? filters.boardId.toString() : undefined,
      assigneeId: filters.assigneeId ? filters.assigneeId.toString() : undefined,
      columnId: filters.columnId ? filters.columnId.toString() : undefined
    };
    return this.postgresqlAdapter.getTasks(postgresFilters);
  }

  async updateTask(id: string | number, updates: Partial<Task>): Promise<Task | null> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.updateTask(id.toString(), updates);
  }

  async deleteTask(id: string | number): Promise<boolean> {
    await this.ensureInitialized();
    return this.postgresqlAdapter.deleteTask(id.toString());
  }

  // === СЛУЖЕБНЫЕ МЕТОДЫ ===
  
  /**
   * Проверка состояния адаптера
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Получение статистики использования
   */
  async getStats(): Promise<{
    isInitialized: boolean;
    adapterType: string;
    connectionStatus: string;
  }> {
    return {
      isInitialized: this.isInitialized,
      adapterType: 'PostgreSQL Optimized',
      connectionStatus: this.isInitialized ? 'Connected' : 'Disconnected'
    };
  }

  /**
   * Очистка ресурсов
   */
  async cleanup(): Promise<void> {
    if (this.isInitialized) {
      await this.postgresqlAdapter.close();
      this.isInitialized = false;
      this.initializationPromise = null;
      console.log('✅ Database Adapter очищен');
    }
  }

  /**
   * Полная переинициализация адаптера
   */
  async reinitialize(): Promise<void> {
    await this.cleanup();
    await this.initialize();
  }

  /**
   * Выполнение сырого SQL запроса (для совместимости с PostgreSQL API)
   */
  async executeRawQuery(sql: string, params?: unknown[]): Promise<unknown[]> {
    await this.initialize();
    return await this.postgresqlAdapter.query(sql, params);
  }

  /**
   * Выполнение SQL запроса (для совместимости с репозиториями)
   */
  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    await this.initialize();
    return await this.postgresqlAdapter.query(sql, params);
  }


}

// Экспортируем singleton instance
const databaseAdapter = DatabaseAdapterOptimized.getInstance();
export default databaseAdapter;

// Также экспортируем класс для тестирования
export { DatabaseAdapterOptimized };