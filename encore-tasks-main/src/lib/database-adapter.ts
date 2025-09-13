// =====================================================
// АДАПТЕР ДЛЯ РАБОТЫ С БАЗАМИ ДАННЫХ (ИСПРАВЛЕННЫЙ)
// =====================================================

import { User, Project, Board, Column, Task, Session } from '@/types';
import { PostgreSQLAdapter } from './postgresql-adapter';
// SQLite адаптер импортируется динамически только при необходимости
// import { SQLiteAdapter } from './sqlite-adapter';

// =====================================================
// ТИПЫ ДАННЫХ
// =====================================================

export type DatabaseType = 'postgresql' | 'sqlite';

export interface DatabaseStatus {
  postgresql: boolean;
  sqlite: boolean;
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
  private sqliteAdapter: any = null; // Динамически загружается
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.postgresqlAdapter = PostgreSQLAdapter.getInstance();
    // SQLite адаптер будет создан только при необходимости
    this.currentDatabase = 'postgresql'; // Используем PostgreSQL по умолчанию
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
    const databasePriority = process.env.DATABASE_PRIORITY || 'postgresql';
    console.log(`🔧 DATABASE_PRIORITY установлен в: ${databasePriority}`);
    
    if (databasePriority === 'sqlite') {
      try {
        // Динамически импортируем SQLite адаптер
        if (!this.sqliteAdapter) {
          const { SQLiteAdapter } = await import('./sqlite-adapter');
          this.sqliteAdapter = SQLiteAdapter.getInstance();
        }
        await this.sqliteAdapter.initialize();
        this.currentDatabase = 'sqlite';
        this.isInitialized = true;
        console.log('✅ Database Adapter инициализирован с SQLite');
        return;
      } catch (sqliteError) {
        console.warn('⚠️ SQLite недоступен, переключаемся на PostgreSQL:', sqliteError);
        // Fallback на PostgreSQL
        try {
          await this.postgresqlAdapter.initialize();
          this.currentDatabase = 'postgresql';
          this.isInitialized = true;
          console.log('✅ Database Adapter инициализирован с PostgreSQL (fallback)');
          return;
        } catch (postgresError) {
          console.error('❌ Ошибка инициализации обеих баз данных:', { sqliteError, postgresError });
          this.initializationPromise = null;
          throw postgresError;
        }
      }
    } else {
      try {
        // Сначала пытаемся использовать PostgreSQL
        await this.postgresqlAdapter.initialize();
        this.currentDatabase = 'postgresql';
        this.isInitialized = true;
        console.log('✅ Database Adapter инициализирован с PostgreSQL');
      } catch (postgresError) {
        console.warn('⚠️ PostgreSQL недоступен, переключаемся на SQLite:', postgresError);
        try {
          // Динамически импортируем SQLite адаптер только при необходимости
          if (!this.sqliteAdapter) {
            const { SQLiteAdapter } = await import('./sqlite-adapter');
            this.sqliteAdapter = SQLiteAdapter.getInstance();
          }
          // Fallback на SQLite
          await this.sqliteAdapter.initialize();
          this.currentDatabase = 'sqlite';
          this.isInitialized = true;
          console.log('✅ Database Adapter инициализирован с SQLite (fallback)');
        } catch (sqliteError) {
          console.error('❌ Ошибка инициализации обеих баз данных:', { postgresError, sqliteError });
          this.initializationPromise = null;
          throw sqliteError;
        }
      }
    }
  }

  /**
   * Проверка инициализации перед выполнением операций
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    console.log(`🔍 DatabaseAdapter: используется ${this.currentDatabase}`);
  }

  /**
   * Получение текущего адаптера базы данных
   */
  private getCurrentAdapter() {
    if (this.currentDatabase === 'sqlite') {
      if (!this.sqliteAdapter) {
        throw new Error('SQLite adapter not loaded');
      }
      return this.sqliteAdapter;
    }
    return this.postgresqlAdapter;
  }

  /**
   * Получение статуса базы данных
   */
  public async getDatabaseStatus(): Promise<DatabaseStatus> {
    const postgresql = await Promise.resolve(this.postgresqlAdapter.initialize()).then(() => true).catch(() => false);
    let sqlite = false;
    
    // Проверяем SQLite только если адаптер загружен
    if (this.sqliteAdapter) {
      sqlite = await Promise.resolve(this.sqliteAdapter.initialize()).then(() => true).catch(() => false);
    }
    
    return {
      postgresql,
      sqlite,
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
    const adapter = this.getCurrentAdapter();
    return await adapter.createUser(userData);
  }

  /**
   * Получение пользователя по ID
   */
  public async getUserById(id: string): Promise<User | null> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.getUserById(id);
  }

  /**
   * Получение пользователя по email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.getUserByEmail(email);
  }

  /**
   * Получение всех пользователей
   */
  public async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.getAllUsers();
  }

  /**
   * Получение пользователей (алиас для getAllUsers)
   */
  public async getUsers(): Promise<User[]> {
    return await this.getAllUsers();
  }

  /**
   * Обновление пользователя
   */
  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.updateUser(id, updates);
  }

  /**
   * Удаление пользователя
   */
  public async deleteUser(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.deleteUser(id);
  }

  // =====================================================
  // МЕТОДЫ ДЛЯ РАБОТЫ С СЕССИЯМИ
  // =====================================================

  public async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.createSession(sessionData);
  }

  public async getSessionByToken(token: string): Promise<Session | null> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.getSessionByToken(token);
  }

  public async deleteSession(token: string): Promise<boolean> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.deleteSession(token);
  }

  public async deleteExpiredSessions(): Promise<number> {
    await this.ensureInitialized();
    const adapter = this.getCurrentAdapter();
    return await adapter.deleteExpiredSessions();
  }

  // =====================================================
  // ОПЕРАЦИИ С ПРОЕКТАМИ
  // =====================================================

  /**
   * Создание проекта
   */
  public async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.createProject(projectData) : 
      await this.postgresqlAdapter.createProject({
        name: projectData.name,
        description: projectData.description || '',
        created_by: projectData.created_by,
        color: projectData.color,
        icon_url: projectData.icon_url,
        telegram_chat_id: projectData.telegram_chat_id,
        telegram_topic_id: projectData.telegram_topic_id
      });
  }

  /**
   * Получение проекта по ID
   */
  public async getProjectById(id: string): Promise<Project | null> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? this.sqliteAdapter.getProjectById(id) : this.postgresqlAdapter.getProjectById(id);
  }

  /**
   * Получение всех проектов
   */
  public async getAllProjects(): Promise<Project[]> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? this.sqliteAdapter.getAllProjects() : this.postgresqlAdapter.getAllProjects();
  }

  /**
   * Получение проектов пользователя
   */
  public async getUserProjects(userId: string): Promise<Project[]> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? this.sqliteAdapter.getUserProjects(userId) : this.postgresqlAdapter.getUserProjects(userId);
  }

  /**
   * Получение проектов по ID создателя
   */
  public async getProjectsByCreatorId(creatorId: string): Promise<Project[]> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? this.sqliteAdapter.getUserProjects(creatorId) : this.postgresqlAdapter.getUserProjects(creatorId);
  }

  /**
   * Проверка доступа к проекту
   */
  public async hasProjectAccess(userId: string | number, projectId: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? this.sqliteAdapter.hasProjectAccess(userId.toString(), projectId) : this.postgresqlAdapter.hasProjectAccess(userId.toString(), projectId);
  }

  /**
   * Обновление проекта
   */
  public async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? this.sqliteAdapter.updateProject(id, updates) : this.postgresqlAdapter.updateProject(id, updates);
  }

  /**
   * Удаление проекта
   */
  public async deleteProject(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? this.sqliteAdapter.deleteProject(id) : this.postgresqlAdapter.deleteProject(id);
  }

  // =====================================================
  // ОПЕРАЦИИ С ДОСКАМИ
  // =====================================================

  /**
   * Создание доски
   */
  public async createBoard(boardData: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.createBoard(boardData) : 
      await this.postgresqlAdapter.createBoard(boardData);
  }

  /**
   * Получение доски по ID
   */
  public async getBoardById(id: string): Promise<Board | null> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.getBoardById(id) : 
      await this.postgresqlAdapter.getBoardById(id);
  }

  /**
   * Получение досок проекта
   */
  public async getProjectBoards(projectId: string): Promise<Board[]> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.getProjectBoards(projectId) : 
      await this.postgresqlAdapter.getBoardsByProjectId(projectId);
  }

  /**
   * Удаление доски
   */
  public async deleteBoard(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.deleteBoard(id) : 
      await this.postgresqlAdapter.deleteBoard(id);
  }

  // =====================================================
  // ОПЕРАЦИИ С КОЛОНКАМИ
  // =====================================================

  /**
   * Получение колонок доски
   */
  public async getBoardColumns(boardId: string): Promise<Column[]> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.getBoardColumns(boardId) : 
      await this.postgresqlAdapter.getBoardColumns(boardId);
  }

  /**
   * Создание колонки
   */
  public async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.createColumn(columnData) : 
      await this.postgresqlAdapter.createColumn(
        columnData.name || columnData.title, 
        columnData.board_id.toString(), 
        columnData.position || 0, 
        columnData.color, 
        columnData.created_by
      );
  }

  /**
   * Удаление колонки
   */
  public async deleteColumn(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.deleteColumn(id) : 
      await this.postgresqlAdapter.deleteColumn(id);
  }

  // =====================================================
  // ОПЕРАЦИИ С ЗАДАЧАМИ
  // =====================================================

  /**
   * Создание задачи
   */
  public async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.createTask(taskData) : 
      await this.postgresqlAdapter.createTask({
        title: taskData.title,
        description: taskData.description || '',
        column_id: taskData.column_id,
        assignee_id: taskData.assignee_id,
        priority: taskData.priority || 'medium',
        position: taskData.position || 0,
        status: taskData.status || 'todo',
        project_id: taskData.project_id,
        board_id: taskData.board_id,
        reporter_id: taskData.creator_id
      });
  }

  /**
   * Получение задач колонки
   */
  public async getColumnTasks(columnId: string): Promise<Task[]> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.getColumnTasks(columnId) : 
      await this.postgresqlAdapter.getColumnTasks(columnId);
  }

  /**
   * Удаление задачи
   */
  public async deleteTask(id: string): Promise<boolean> {
    await this.ensureInitialized();
    return this.currentDatabase === 'sqlite' ? 
      await this.sqliteAdapter.deleteTask(id) : 
      await this.postgresqlAdapter.deleteTask(id);
  }

  /**
   * Выполнение сырого SQL запроса (для совместимости с репозиториями)
   */
  public async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    await this.ensureInitialized();
    if (this.currentDatabase === 'sqlite') {
      const result = await this.sqliteAdapter.query(sql, params);
      return result.rows;
    } else {
      const result = await this.postgresqlAdapter.query(sql, params);
      return result.rows;
    }
  }
}

// Экспорт единственного экземпляра
export const dbAdapter = DatabaseAdapter.getInstance();
