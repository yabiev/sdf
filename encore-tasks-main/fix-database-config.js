const fs = require('fs');
const path = require('path');

console.log('🔧 Исправление конфигурации базы данных...');

// 1. Проверяем текущую конфигурацию
console.log('\n1. Анализ текущей конфигурации:');

// Проверяем .env файл
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📄 .env файл найден');
  
  if (envContent.includes('postgresql://')) {
    console.log('⚠️ .env настроен на PostgreSQL');
  }
  
  if (envContent.includes('DATABASE_URL')) {
    console.log('🔗 DATABASE_URL найден в .env');
  }
} else {
  console.log('❌ .env файл не найден');
}

// Проверяем database-adapter.ts
const adapterPath = path.join(__dirname, 'src', 'lib', 'database-adapter.ts');
if (fs.existsSync(adapterPath)) {
  const adapterContent = fs.readFileSync(adapterPath, 'utf8');
  console.log('📄 database-adapter.ts найден');
  
  if (adapterContent.includes("currentDatabase: DatabaseType = 'sqlite'")) {
    console.log('⚠️ database-adapter.ts принудительно использует SQLite');
  }
  
  if (adapterContent.includes('SQLiteAdapterOptimized')) {
    console.log('🗃️ Используется SQLiteAdapterOptimized');
  }
} else {
  console.log('❌ database-adapter.ts не найден');
}

// 2. Проверяем SQLite базу данных
console.log('\n2. Проверка SQLite базы данных:');
const dbPath = path.join(__dirname, 'database.db');
if (fs.existsSync(dbPath)) {
  console.log('✅ SQLite база данных найдена: database.db');
  
  // Проверяем размер файла
  const stats = fs.statSync(dbPath);
  console.log(`📊 Размер базы данных: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.log('❌ SQLite база данных не найдена');
}

// 3. Создаем исправленную версию database-adapter.ts
console.log('\n3. Создание исправленной конфигурации...');

const fixedAdapterContent = `// =====================================================
// АДАПТЕР ДЛЯ РАБОТЫ С БАЗАМИ ДАННЫХ (ИСПРАВЛЕННЫЙ)
// =====================================================

import { User, Project, Board, Column, Task, Session } from '@/types';
import SQLiteAdapterOptimized from './sqlite-adapter-optimized';

// =====================================================
// ТИПЫ ДАННЫХ
// =====================================================

export type DatabaseType = 'sqlite';

export interface DatabaseStatus {
  sqlite: boolean;
  current: DatabaseType;
}

// =====================================================
// КЛАСС АДАПТЕРА БАЗЫ ДАННЫХ
// =====================================================

export class DatabaseAdapter {
  private static instance: DatabaseAdapter;
  private currentDatabase: DatabaseType = 'sqlite';
  private isInitialized = false;
  private sqliteAdapter: SQLiteAdapterOptimized;

  private constructor() {
    this.sqliteAdapter = SQLiteAdapterOptimized.getInstance();
    this.currentDatabase = 'sqlite';
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
      // Используем только SQLite
      await this.sqliteAdapter.initialize();
      this.currentDatabase = 'sqlite';
      console.log('🎯 Database Adapter: Используется SQLite');

      this.isInitialized = true;
      console.log('✅ Database Adapter: Инициализация завершена');
    } catch (error) {
      console.error('❌ Database Adapter: Ошибка инициализации SQLite:', error);
      throw error;
    }
  }

  /**
   * Получение статуса базы данных
   */
  public async getDatabaseStatus(): Promise<DatabaseStatus> {
    const sqlite = await Promise.resolve(this.sqliteAdapter.initialize()).then(() => true).catch(() => false);
    
    return {
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
    await this.initialize();
    return await this.sqliteAdapter.createUser(userData);
  }

  /**
   * Получение пользователя по ID
   */
  public async getUserById(id: string): Promise<User | null> {
    await this.initialize();
    return await this.sqliteAdapter.getUserById(id);
  }

  /**
   * Получение пользователя по email
   */
  public async getUserByEmail(email: string): Promise<User | null> {
    await this.initialize();
    return await this.sqliteAdapter.getUserByEmail(email);
  }

  /**
   * Получение всех пользователей
   */
  public async getAllUsers(): Promise<User[]> {
    await this.initialize();
    return await this.sqliteAdapter.getAllUsers();
  }

  /**
   * Обновление пользователя
   */
  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    await this.initialize();
    return await this.sqliteAdapter.updateUser(id, updates);
  }

  /**
   * Удаление пользователя
   */
  public async deleteUser(id: string): Promise<boolean> {
    await this.initialize();
    return await this.sqliteAdapter.deleteUser(id);
  }

  // =====================================================
  // ОПЕРАЦИИ С СЕССИЯМИ (ИСПРАВЛЕНО)
  // =====================================================

  /**
   * Создание сессии
   */
  public async createSession(sessionData: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    await this.initialize();
    console.log('🔐 DatabaseAdapter: Создание сессии через SQLite адаптер');
    return await this.sqliteAdapter.createSession(sessionData);
  }

  /**
   * Получение сессии по токену
   */
  public async getSessionByToken(token: string): Promise<Session | null> {
    await this.initialize();
    console.log('🔍 DatabaseAdapter: Поиск сессии по токену через SQLite адаптер');
    const session = await this.sqliteAdapter.getSessionByToken(token);
    console.log('📊 DatabaseAdapter: Результат поиска сессии:', session ? 'найдена' : 'не найдена');
    return session;
  }

  /**
   * Обновление активности сессии
   */
  public async updateSessionActivity(token: string): Promise<boolean> {
    await this.initialize();
    // Для SQLite можно реализовать обновление времени последней активности
    return true;
  }

  /**
   * Удаление сессии
   */
  public async deleteSession(token: string): Promise<boolean> {
    await this.initialize();
    return await this.sqliteAdapter.deleteSession(token);
  }

  // =====================================================
  // ОПЕРАЦИИ С ПРОЕКТАМИ
  // =====================================================

  /**
   * Создание проекта
   */
  public async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    await this.initialize();
    return await this.sqliteAdapter.createProject(projectData);
  }

  /**
   * Получение проекта по ID
   */
  public async getProjectById(id: string): Promise<Project | null> {
    await this.initialize();
    return await this.sqliteAdapter.getProjectById(id);
  }

  /**
   * Получение всех проектов
   */
  public async getAllProjects(): Promise<Project[]> {
    await this.initialize();
    return await this.sqliteAdapter.getAllProjects();
  }

  /**
   * Получение проектов пользователя
   */
  public async getUserProjects(userId: string): Promise<Project[]> {
    await this.initialize();
    return await this.sqliteAdapter.getUserProjects(userId);
  }

  /**
   * Получение проектов по ID создателя
   */
  public async getProjectsByCreatorId(creatorId: string): Promise<Project[]> {
    await this.initialize();
    return await this.sqliteAdapter.getUserProjects(creatorId);
  }

  /**
   * Проверка доступа к проекту
   */
  public async hasProjectAccess(userId: string | number, projectId: string): Promise<boolean> {
    await this.initialize();
    return await this.sqliteAdapter.hasProjectAccess(userId.toString(), projectId);
  }

  // =====================================================
  // ОПЕРАЦИИ С ДОСКАМИ
  // =====================================================

  /**
   * Получение досок проекта
   */
  public async getProjectBoards(projectId: string): Promise<Board[]> {
    await this.initialize();
    return await this.sqliteAdapter.getBoardsByProjectId(projectId);
  }

  // =====================================================
  // ОПЕРАЦИИ С КОЛОНКАМИ
  // =====================================================

  /**
   * Получение колонок доски
   */
  public async getBoardColumns(boardId: string): Promise<Column[]> {
    await this.initialize();
    return await this.sqliteAdapter.getColumnsByBoardId(boardId);
  }

  /**
   * Создание колонки
   */
  public async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    await this.initialize();
    return await this.sqliteAdapter.createColumn(columnData);
  }

  // =====================================================
  // ОПЕРАЦИИ С ЗАДАЧАМИ
  // =====================================================

  /**
   * Создание задачи
   */
  public async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    await this.initialize();
    return await this.sqliteAdapter.createTask(taskData);
  }

  /**
   * Получение задач колонки
   */
  public async getColumnTasks(columnId: string): Promise<Task[]> {
    await this.initialize();
    return await this.sqliteAdapter.getTasksByColumnId(columnId);
  }

  /**
   * Удаление задачи
   */
  public async deleteTask(id: string): Promise<boolean> {
    await this.initialize();
    return await this.sqliteAdapter.deleteTask(id);
  }

  /**
   * Выполнение сырого SQL запроса (для совместимости с репозиториями)
   */
  public async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    await this.initialize();
    return await this.sqliteAdapter.query(sql, params);
  }
}

// Экспорт единственного экземпляра
export const dbAdapter = DatabaseAdapter.getInstance();
`;

// Создаем резервную копию
const backupPath = path.join(__dirname, 'src', 'lib', 'database-adapter.ts.backup');
if (fs.existsSync(adapterPath)) {
  fs.copyFileSync(adapterPath, backupPath);
  console.log('💾 Создана резервная копия: database-adapter.ts.backup');
}

// Записываем исправленную версию
fs.writeFileSync(adapterPath, fixedAdapterContent, 'utf8');
console.log('✅ Обновлен database-adapter.ts с улучшенным логированием');

// 4. Создаем .env.sqlite для SQLite конфигурации
console.log('\n4. Создание .env.sqlite конфигурации...');

const sqliteEnvContent = `# SQLite Database Configuration
DATABASE_TYPE=sqlite
SQLITE_DB_PATH=./database.db

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# JWT Secret
JWT_SECRET=your-secret-key

# Session Configuration
SESSION_SECRET=your-session-secret-here
SESSION_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Development/Production Mode
NODE_ENV=development
`;

const sqliteEnvPath = path.join(__dirname, '.env.sqlite');
fs.writeFileSync(sqliteEnvPath, sqliteEnvContent, 'utf8');
console.log('✅ Создан .env.sqlite для SQLite конфигурации');

console.log('\n🎉 Исправление конфигурации завершено!');
console.log('\n📋 Следующие шаги:');
console.log('1. Перезапустите сервер разработки');
console.log('2. Проверьте логи сессий в консоли');
console.log('3. Попробуйте войти в систему снова');
console.log('\n💡 Если проблемы продолжаются, проверьте SQLite адаптер');