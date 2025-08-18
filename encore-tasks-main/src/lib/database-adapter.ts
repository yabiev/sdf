// =====================================================
// АДАПТЕР ДЛЯ РАБОТЫ С БАЗАМИ ДАННЫХ (ИСПРАВЛЕННЫЙ)
// =====================================================

import { User, Project, Board, Column, Task, Session } from '@/types';
import { PostgreSQLAdapter } from './postgresql-adapter';

// =====================================================
// ТИПЫ ДАННЫХ
// =====================================================

export type DatabaseType = 'postgresql';

export interface DatabaseStatus {
  postgresql: boolean;
  current: DatabaseType;
}

// =====================================================
// КЛАСС АДАПТЕРА БАЗЫ ДАННЫХ
// =====================================================

export class DatabaseAdapter {
  private static instance: DatabaseAdapter;
  private currentDatabase: DatabaseType = 'postgresql';
  private isInitialized = false;
  private postgresqlAdapter: PostgreSQLAdapter;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.postgresqlAdapter = PostgreSQLAdapter.getInstance();
    this.currentDatabase = 'postgresql';
  }

  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  /**
   * Инициализация адаптера
   */
  public async initialize(): Promise<void> {
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
      console.log('✅ Database Adapter инициализирован с PostgreSQL');
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

  /**
   * Получение статуса базы данных
   */
  public async getDatabaseStatus(): Promise<DatabaseStatus> {
    const postgresql = await Promise.resolve(this.postgresqlAdapter.initialize()).then(() => true).catch(() => false);
    
    return {
      postgresql,
      current: this.currentDatabase
    };
  }

  /**
   * Получение текущей базы данных
   */
  public getCurrentDatabase(): DatabaseType {
    return this.currentDatabase;
  }

  // =====================================================
  // ОПЕРАЦИИ С ПОЛЬЗОВАТЕЛЯМИ
  // =====================================================

  /**
   * Создание пользователя
   */
  public async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.createUser(userData.email, userData.password, userData.name, userData.role || 'user');
  }

  /**
   * Получение пользователя по ID
   */
  public async getUserById(id: string): Promise<User | null> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getUserById(id);
  }

  /**
   * Получение пользователя по email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getUserByEmail(email);
  }

  /**
   * Получение всех пользователей
   */
  public async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getAllUsers();
  }

  /**
   * Обновление пользователя
   */
  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.updateUser(id, updates);
  }

  /**
   * Удаление пользователя
   */
  public async deleteUser(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.deleteUser(id);
  }

  // =====================================================
  // ОПЕРАЦИИ С СЕССИЯМИ (ИСПРАВЛЕНО)
  // =====================================================

  /**
   * Создание сессии
   */
  public async createSession(sessionData: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    await this.ensureInitialized();
    console.log('🔐 DatabaseAdapter: Создание сессии через PostgreSQL адаптер');
    console.log('🔐 SessionData:', {
      token: sessionData.token ? 'present' : 'missing',
      userId: sessionData.userId,
      expiresAt: sessionData.expiresAt
    });
    return await this.postgresqlAdapter.createSession(sessionData.token, sessionData.userId, sessionData.expiresAt);
  }

  /**
   * Получение сессии по токену
   */
  public async getSessionByToken(token: string): Promise<Session | null> {
    await this.ensureInitialized();
    console.log('🔍 DatabaseAdapter: Поиск сессии по токену через PostgreSQL адаптер');
    const session = await this.postgresqlAdapter.getSessionByToken(token);
    console.log('📊 DatabaseAdapter: Результат поиска сессии:', session ? 'найдена' : 'не найдена');
    return session;
  }

  /**
   * Обновление активности сессии
   */
  public async updateSessionActivity(token: string): Promise<boolean> {
    await this.ensureInitialized();
    // Для PostgreSQL можно реализовать обновление времени последней активности
    return true;
  }

  /**
   * Удаление сессии
   */
  public async deleteSession(token: string): Promise<boolean> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.deleteSession(token);
  }

  // =====================================================
  // ОПЕРАЦИИ С ПРОЕКТАМИ
  // =====================================================

  /**
   * Создание проекта
   */
  public async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    await this.ensureInitialized();
    const { name, description, createdBy, color } = projectData;
    return await this.postgresqlAdapter.createProject(name, description || '', createdBy, color);
  }

  /**
   * Получение проекта по ID
   */
  public async getProjectById(id: string): Promise<Project | null> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getProjectById(id);
  }

  /**
   * Получение всех проектов
   */
  public async getAllProjects(): Promise<Project[]> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getAllProjects();
  }

  /**
   * Получение проектов пользователя
   */
  public async getUserProjects(userId: string): Promise<Project[]> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getUserProjects(userId);
  }

  /**
   * Получение проектов по ID создателя
   */
  public async getProjectsByCreatorId(creatorId: string): Promise<Project[]> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getUserProjects(creatorId);
  }

  /**
   * Проверка доступа к проекту
   */
  public async hasProjectAccess(userId: string | number, projectId: string): Promise<boolean> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.hasProjectAccess(userId.toString(), projectId);
  }

  // =====================================================
  // ОПЕРАЦИИ С ДОСКАМИ
  // =====================================================

  /**
   * Создание доски
   */
  public async createBoard(boardData: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.createBoard(boardData.name, boardData.description || '', boardData.projectId);
  }

  /**
   * Получение доски по ID
   */
  public async getBoardById(id: string): Promise<Board | null> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getBoardById(id);
  }

  /**
   * Получение досок проекта
   */
  public async getProjectBoards(projectId: string): Promise<Board[]> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getBoardsByProjectId(projectId);
  }

  /**
   * Удаление доски
   */
  public async deleteBoard(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.deleteBoard(id);
  }

  // =====================================================
  // ОПЕРАЦИИ С КОЛОНКАМИ
  // =====================================================

  /**
   * Получение колонок доски
   */
  public async getBoardColumns(boardId: string): Promise<Column[]> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getBoardColumns(boardId);
  }

  /**
   * Создание колонки
   */
  public async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.createColumn(columnData.name, columnData.boardId, columnData.position || 0);
  }

  // =====================================================
  // ОПЕРАЦИИ С ЗАДАЧАМИ
  // =====================================================

  /**
   * Создание задачи
   */
  public async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.createTask({
      title: taskData.title,
      description: taskData.description || '',
      column_id: taskData.columnId,
      assignee_id: taskData.assignedTo,
      priority: taskData.priority || 'medium',
      position: taskData.position || 0,
      status: taskData.status || 'todo',
      project_id: taskData.projectId,
      board_id: taskData.boardId,
      reporter_id: taskData.reporterId
    });
  }

  /**
   * Получение задач колонки
   */
  public async getColumnTasks(columnId: string): Promise<Task[]> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.getColumnTasks(columnId);
  }

  /**
   * Удаление задачи
   */
  public async deleteTask(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return await this.postgresqlAdapter.deleteTask(id);
  }

  /**
   * Выполнение сырого SQL запроса (для совместимости с репозиториями)
   */
  public async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    aw