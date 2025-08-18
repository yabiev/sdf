// =====================================================
// ОПТИМИЗИРОВАННЫЙ АДАПТЕР ДЛЯ SQLITE
// =====================================================

import Database from 'better-sqlite3';
import { User, Project, Board, Column, Task, Session } from '@/types';
import path from 'path';
import fs from 'fs';

export default class SQLiteAdapterOptimized {
  private static instance: SQLiteAdapterOptimized;
  private db: Database.Database | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): SQLiteAdapterOptimized {
    if (!SQLiteAdapterOptimized.instance) {
      SQLiteAdapterOptimized.instance = new SQLiteAdapterOptimized();
    }
    return SQLiteAdapterOptimized.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.db) return;

    try {
      const dbPath = path.join(process.cwd(), 'database.sqlite');
      this.db = new Database(dbPath);
      
      // Создаем таблицы если их нет
      this.createTables();
      
      this.isInitialized = true;
      console.log('✅ SQLite: Инициализация завершена');
    } catch (error) {
      console.error('❌ SQLite: Ошибка инициализации:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Создаем таблицы
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        isApproved BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        creator_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        creator_id TEXT NOT NULL,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project_id TEXT NOT NULL,
        icon TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        visibility TEXT DEFAULT 'private',
        color TEXT DEFAULT '#3b82f6',
        settings TEXT DEFAULT '{}',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS columns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        board_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        color TEXT DEFAULT '#6b7280',
        settings TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (board_id) REFERENCES boards(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        assignee_id TEXT,
        column_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        due_date DATETIME,
        estimated_hours INTEGER,
        tags TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignee_id) REFERENCES users(id),
        FOREIGN KEY (column_id) REFERENCES columns(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(project_id, user_id)
      );
    `);
  }

  // Методы для работы с досками
  public async createBoard(boardData: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO boards (id, name, project_id, icon, is_default, visibility, color, settings, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      boardData.name,
      boardData.project_id,
      boardData.icon || null,
      boardData.is_default || false,
      boardData.visibility || 'private',
      boardData.color || '#3b82f6',
      JSON.stringify(boardData.settings || {}),
      boardData.created_by || null,
      now,
      now
    );

    return {
      id,
      ...boardData,
      created_at: now,
      updated_at: now
    };
  }

  public async getBoardsByProjectId(projectId: string): Promise<Board[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM boards WHERE project_id = ? ORDER BY created_at');
    const rows = stmt.all(projectId) as any[];

    return rows.map(row => ({
      ...row,
      is_default: Boolean(row.is_default),
      settings: JSON.parse(row.settings || '{}')
    }));
  }

  public async deleteBoard(boardId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM boards WHERE id = ?');
    stmt.run(boardId);
  }

  // Методы для работы с колонками
  public async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `column_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO columns (id, name, board_id, position, color, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      columnData.name,
      columnData.board_id,
      columnData.position,
      columnData.color || '#6b7280',
      JSON.stringify(columnData.settings || {}),
      now,
      now
    );

    return {
      id,
      ...columnData,
      created_at: now,
      updated_at: now
    };
  }

  public async getColumnsByBoardId(boardId: string): Promise<Column[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position');
    const rows = stmt.all(boardId) as any[];

    return rows.map(row => ({
      ...row,
      settings: JSON.parse(row.settings || '{}')
    }));
  }

  // Методы для работы с задачами
  public async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, assignee_id, column_id, position, due_date, estimated_hours, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      taskData.title,
      taskData.description || null,
      taskData.status,
      taskData.priority || 'medium',
      taskData.assignee_id || null,
      taskData.column_id,
      taskData.position,
      taskData.due_date || null,
      taskData.estimated_hours || null,
      JSON.stringify(taskData.tags || []),
      now,
      now
    );

    return {
      id,
      ...taskData,
      created_at: now,
      updated_at: now
    };
  }

  public async getTasksByColumnId(columnId: string): Promise<Task[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT * FROM tasks WHERE column_id = ? ORDER BY position');
    const rows = stmt.all(columnId) as any[];

    return rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  // Методы для работы с сессиями
  public async createSession(sessionData: Omit<Session, 'id' | 'created_at'>): Promise<Session> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(
      sessionData.user_id,
      sessionData.session_token,
      sessionData.expires_at,
      now
    );

    return {
      id,
      ...sessionData,
      created_at: now
    };
  }

  // Проверка доступа к проекту
  public async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Проверяем, является ли пользователь создателем проекта
      const ownerStmt = this.db.prepare(`
        SELECT creator_id FROM projects WHERE id = ? AND deleted_at IS NULL
      `);
      const project = ownerStmt.get(projectId) as { creator_id: string } | undefined;
      
      if (!project) {
        return false; // Проект не найден
      }
      
      if (project.creator_id === userId) {
        return true; // Пользователь - создатель проекта
      }
      
      // Проверяем членство в проекте
      const memberStmt = this.db.prepare(`
        SELECT role FROM project_members 
        WHERE project_id = ? AND user_id = ?
      `);
      const member = memberStmt.get(projectId, userId) as { role: string } | undefined;
      
      return !!member; // Возвращаем true, если пользователь является участником
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }

  // Метод для выполнения произвольных SQL запросов
  public async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(sql);
      const trimmedSql = sql.trim().toUpperCase();
      
      // Для INSERT, UPDATE, DELETE используем run()
      if (trimmedSql.startsWith('INSERT') || trimmedSql.startsWith('UPDATE') || trimmedSql.startsWith('DELETE')) {
        const result = params && params.length > 0 ? stmt.run(...params) : stmt.run();
        return [{ changes: result.changes, lastInsertRowid: result.lastInsertRowid }] as unknown[];
      }
      
      // Для SELECT используем all()
      if (params && params.length > 0) {
        return stmt.all(...params) as unknown[];
      } else {
        return stmt.all() as unknown[];
      }
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  // Методы для работы с пользователями
  public async getUserById(id: string): Promise<User | null> {
    console.log('🔍 SQLite getUserById called with:', id);
    const query = 'SELECT * FROM users WHERE id = ?';
    console.log('📝 SQL query:', query);
    const result = await this.query(query, [id]);
    console.log('📊 Query result:', result);
    console.log('📊 Result length:', result.length);
    if (result.length > 0) {
      console.log('✅ User found:', result[0]);
      return result[0] as User;
    } else {
      console.log('❌ User not found for id:', id);
      return null;
    }
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    console.log('🔍 SQLite getUserByEmail called with:', email);
    const query = 'SELECT * FROM users WHERE email = ?';
    console.log('📝 SQL query:', query);
    const result = await this.query(query, [email]);
    console.log('📊 Query result:', result);
    console.log('📊 Result length:', result.length);
    return result.length > 0 ? result[0] as User : null;
  }

  // Методы для работы с сессиями
  public async getSessionByToken(token: string): Promise<Session | null> {
    const query = "SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > datetime('now')";
    const result = await this.query(query, [token]);
    return result.length > 0 ? result[0] as Session : null;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const query = 'DELETE FROM user_sessions WHERE id = ?';
    await this.query(query, [sessionId]);
  }

  // Заглушки для других методов
  public async getAllProjects(): Promise<Project[]> {
    return [];
  }

  public async getUserProjects(userId: string): Promise<Project[]> {
    return [];
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}