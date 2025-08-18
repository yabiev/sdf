// =====================================================
// АДАПТЕР ДЛЯ РАБОТЫ С БАЗАМИ ДАННЫХ (PostgreSQL)
// =====================================================

import { User, Project, Board, Column, Task, Session } from '@/types';
import { getPostgreSQLAdapter, PostgreSQLAdapter } from './postgresql-adapter';

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

  private constructor() {
    this.postgresqlAdapter = getPostgreSQLAdapter();
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
    if (this.isInitialized) return;

    try {
      // Используем PostgreSQL
      await this.postgresqlAdapter.initialize();
      this.currentDatabase = 'postgresql';
      console.log('🎯 Database Adapter: Используется PostgreSQL');

      this.isInitialized = true;
      console.log('✅ Database Adapter: Инициализация завершена');
    } catch (error) {
      console.error('❌ Database Adapter: Ошибка инициализации PostgreSQL:', error);
      throw error;
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
    await this.initialize();
    const { email, password, name, role = 'user' } = userData;
    return await this.postgresqlAdapter.createUser(email, password, name, role);
  }

  /**
   * Получение пользователя по ID
   */
  public async getUserById(id: string): Promise<User | null> {
    await this.initialize();
    return await this.postgresqlAdapter.getUserById(id);
  }

  /**
   * Получение пользователя по email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    await this.initialize();
    return await this.postgresqlAdapter.getUserByEmail(email);
  }

  /**
   * Получение всех пользователей
   */
  public async getAllUsers(): Promise<User[]> {
    await this.initialize();
    return await this.postgresqlAdapter.getAllUsers();
  }

  /**
   * Обновление пользователя
   */
  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.initialize();
    return await this.postgresqlAdapter.updateUser(id, updates);
  }

  /**
   * Удаление пользователя
   */
  public async deleteUser(id: string): Promise<boolean> {
    await this.initialize();
    return await this.postgresqlAdapter.deleteUser(id);
  }

  // =====================================================
  // ОПЕРАЦИИ С СЕССИЯМИ
  // =====================================================

  /**
   * Создание сессии
   */
  public async createSession(sessionData: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    await this.initialize();
    const { session_token, user_id, expires_at } = sessionData;
    return await this.postgresqlAdapter.createSession(session_token, user_id, new Date(expires_at));
  }

  /**
   * Получение сессии по токену
   */
  public async getSessionByToken(token: string): Promise<Session | null> {
    await this.initialize();
    return await this.postgresqlAdapter.getSessionByToken(token);
  }

  /**
   * Обновление активности сессии
   */
  public async updateSessionActivity(token: string): Promise<boolean> {
    await this.initialize();
    // Для PostgreSQL можно реализовать обновление времени последней активности
    return true;
  }

  /**
   * Удаление сессии
   */
  public async deleteSession(token: string): Promise<boolean> {
    await this.initialize();
    return await this.postgresqlAdapter.deleteSession(token);
  }

  // =====================================================
  // ОПЕРАЦИИ С ПРОЕКТАМИ
  // =====================================================

  /**
   * Создание проекта
   */
  public async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    await this.initialize();
    const { name, description, creator_id, color } = projectData;
    return await this.postgresqlAdapter.createProject(name, description || '', creator_id, color);
  }

  /**
   * Получение проекта по ID
   */
  public async getProjectById(id: string): Promise<Project | null> {
    await this.initialize();
    return await this.postgresqlAdapter.getProjectById(id);
  }

  /**
   * Получение всех проектов
   */
  public async getAllProjects(): Promise<Project[]> {
    await this.initialize();
    // Для PostgreSQL получаем все проекты через пользователя (требует user_id)
    // Возвращаем пустой массив, так как метод требует конкретного пользователя
    return [];
  }

  /**
   * Получение проектов пользователя
   */
  public async getUserProjects(userId: string): Promise<Project[]> {
    await this.initialize();
    return await this.postgresqlAdapter.getProjectsByUserId(userId);
  }

  /**
   * Получение проектов по ID создателя
   */
  public async getProjectsByCreatorId(creatorId: string): Promise<Project[]> {
    await this.initialize();
    return await this.postgresqlAdapter.getProjectsByUserId(creatorId);
  }

  /**
   * Проверка доступа к проекту
   */
  public async hasProjectAccess(userId: string | number, projectId: string): Promise<boolean> {
    await this.initialize();
    return await this.postgresqlAdapter.hasProjectAccess(userId.toString(), projectId);
  }

  // =====================================================
  // ОПЕРАЦИИ С ДОСКАМИ
  // =====================================================

  /**
   * Получение досок проекта
   */
  public async getProjectBoards(projectId: string): Promise<Board[]> {
    await this.initialize();
    return await this.postgresqlAdapter.getBoardsByProjectId(projectId);
  }

  // =====================================================
  // ОПЕРАЦИИ С КОЛОНКАМИ
  // =====================================================

  /**
   * Получение колонок доски
   */
  public async getBoardColumns(boardId: string): Promise<Column[]> {
    await this.initialize();
    return await this.postgresqlAdapter.getColumnsByBoardId(boardId);
  }

  /**
   * Создание колонки
   */
  public async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    await this.initialize();
    const { name, board_id, position, color } = columnData;
    return await this.postgresqlAdapter.createColumn(name, board_id, position, color);
  }

  // =====================================================
  // ОПЕРАЦИИ С ЗАДАЧАМИ
  // =====================================================

  /**
   * Создание задачи
   */
  public async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    await this.initialize();
    return await this.postgresqlAdapter.createTask(taskData);
  }

  /**
   * Получение задач колонки
   */
  public async getColumnTasks(columnId: string): Promise<Task[]> {
    await this.initialize();
    return await this.postgresqlAdapter.getTasksByColumnId(columnId);
  }

  /**
   * Удаление задачи
   */
  public async deleteTask(id: string): Promise<boolean> {
    await this.initialize();
    return await this.postgresqlAdapter.deleteTask(id);
  }

  /**
   * Выполнение сырого SQL запроса (для совместимости с репозиториями)
   */
  public async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    await this.initialize();
    const result = await this.postgresqlAdapter.query(sql, params);
    return result.rows || [];
  }

}



// Экспорт единственного экземпляра
export const dbAdapter = DatabaseAdapter.getInstance();