// =====================================================
// SQLite АДАПТЕР ДЛЯ ВРЕМЕННОГО ИСПОЛЬЗОВАНИЯ
// =====================================================

import Database from 'better-sqlite3';
import { User, Project, Board, Column, Task, Session } from '../types';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import * as path from 'path';

export class SQLiteAdapter {
  private static instance: SQLiteAdapter;
  private db: Database.Database;
  private isInitialized = false;

  private constructor() {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    this.db = new Database(dbPath);
  }

  public static getInstance(): SQLiteAdapter {
    if (!SQLiteAdapter.instance) {
      SQLiteAdapter.instance = new SQLiteAdapter();
    }
    return SQLiteAdapter.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Проверяем существование таблиц
      const tables = this.db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      
      console.log('✅ SQLite адаптер инициализирован');
      console.log('📊 Доступные таблицы:', (tables as { name: string }[]).map(t => t.name));
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Ошибка инициализации SQLite адаптера:', error);
      throw error;
    }
  }

  // =====================================================
  // ОПЕРАЦИИ С ПОЛЬЗОВАТЕЛЯМИ
  // =====================================================

  public async createUser(userData: Partial<User>): Promise<User> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const {
        email,
        name,
        avatar,
        role = 'user',
        isApproved = false,
        password_hash
      } = userData;

      const stmt = this.db.prepare(`
        INSERT INTO users (id, email, name, avatar_url, role, approval_status, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Преобразуем isApproved в число для approval_status (BOOLEAN в SQLite)
      const approvalStatus = isApproved ? 1 : 0;
      // Используем avatar как avatar_url для соответствия схеме SQLite
      stmt.run(id, email, name, avatar || null, role, approvalStatus, password_hash, now, now);

      return {
        id,
        email: email || '',
        name: name || '',
        avatar,
        role,
        isApproved,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('❌ SQLite: Ошибка создания пользователя:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getUserById(id: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
      const dbUser = stmt.get(id) as {
        id: string;
        name?: string;
        username?: string;
        email: string;
        avatar?: string;
        avatar_url?: string;
        role?: string;
        isApproved?: boolean;
        is_approved?: boolean;
        approval_status?: boolean;
        lastLoginAt?: string;
        last_login_at?: string;
        created_at: string;
        updated_at: string;
        password_hash?: string;
      } | undefined;
      
      if (!dbUser) return null;
    
    return {
      id: dbUser.id,
      name: dbUser.name || dbUser.username || dbUser.email.split('@')[0],
      email: dbUser.email,
      avatar: dbUser.avatar || dbUser.avatar_url,
      role: (dbUser.role as 'admin' | 'manager' | 'user') || 'user',
      isApproved: dbUser.isApproved || dbUser.is_approved || dbUser.approval_status,
      lastLoginAt: dbUser.lastLoginAt || dbUser.last_login_at,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
      password_hash: dbUser.password_hash
    };
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения пользователя по ID:', error);
      throw new Error(`Failed to get user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
      const dbUser = stmt.get(email) as {
        id: string;
        name?: string;
        username?: string;
        email: string;
        avatar?: string;
        avatar_url?: string;
        role?: string;
        isApproved?: boolean;
        is_approved?: boolean;
        approval_status?: boolean;
        lastLoginAt?: string;
        last_login_at?: string;
        created_at: string;
        updated_at: string;
        password_hash?: string;
      } | undefined;
      
      if (!dbUser) return null;
    
    return {
      id: dbUser.id,
      name: dbUser.name || dbUser.username || dbUser.email.split('@')[0],
      email: dbUser.email,
      avatar: dbUser.avatar || dbUser.avatar_url,
      role: (dbUser.role as 'admin' | 'manager' | 'user') || 'user',
      isApproved: dbUser.isApproved || dbUser.is_approved || dbUser.approval_status,
      lastLoginAt: dbUser.lastLoginAt || dbUser.last_login_at,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
      password_hash: dbUser.password_hash
    };
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения пользователя по email:', error);
      throw new Error(`Failed to get user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getAllUsers(): Promise<User[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users');
      const dbUsers = stmt.all() as {
        id: string;
        name?: string;
        username?: string;
        email: string;
        avatar?: string;
        avatar_url?: string;
        role?: string;
        isApproved?: boolean;
        is_approved?: boolean;
        lastLoginAt?: string;
        last_login_at?: string;
        created_at: string;
        updated_at: string;
        password_hash?: string;
      }[];
      
      return dbUsers.map(dbUser => ({
      id: dbUser.id,
      name: dbUser.name || dbUser.username || dbUser.email.split('@')[0],
      email: dbUser.email,
      avatar: dbUser.avatar || dbUser.avatar_url,
      role: (dbUser.role as 'admin' | 'manager' | 'user') || 'user',
      isApproved: dbUser.isApproved || dbUser.is_approved,
      lastLoginAt: dbUser.lastLoginAt || dbUser.last_login_at,
      created_at: dbUser.created_at,
      updated_at: dbUser.updated_at,
      password_hash: dbUser.password_hash
    }));
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения всех пользователей:', error);
      throw new Error(`Failed to get all users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as Record<string, unknown>)[field]);
    values.push(new Date().toISOString()); // updated_at
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?
    `);

    stmt.run(...values);
    return this.getUserById(id);
  }

  public async deleteUser(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // =====================================================
  // ОПЕРАЦИИ С СЕССИЯМИ
  // =====================================================

  public async createSession(sessionData: {
    user_id: string;
    token: string;
    expires_at: string;
    isActive?: boolean;
    userAgent?: string;
    ipAddress?: string;
    lastActivityAt?: string;
  }): Promise<Session> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Проверяем что expires_at является валидной датой
    if (!sessionData.expires_at) {
      throw new Error('Invalid expires_at date provided');
    }

    console.log('🔐 SQLite: Создание сессии:', {
      token: sessionData.token ? 'present' : 'missing',
      userId: sessionData.user_id,
      expires_at: sessionData.expires_at
    });

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, sessionData.token, sessionData.user_id, sessionData.expires_at, now);

    return {
      id,
      token: sessionData.token,
      user_id: sessionData.user_id,
      expires_at: sessionData.expires_at,
      created_at: now
    };
  }

  public async getSessionByToken(token: string): Promise<Session | null> {
    try {
      console.log('🔍 SQLite: Поиск сессии по токену:', token);
      const stmt = this.db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')');
      const dbSession = stmt.get(token) as {
        id: string;
        token: string;
        user_id: string;
        expires_at: string;
        created_at: string;
      } | undefined;
      
      if (!dbSession) {
        console.log('📊 SQLite: Результат поиска сессии: не найдена');
        return null;
      }
      
      console.log('📊 SQLite: Результат поиска сессии:', dbSession);
      
      return {
        id: dbSession.id,
        token: dbSession.token,
        user_id: dbSession.user_id,
        expires_at: dbSession.expires_at,
        created_at: dbSession.created_at
      };
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения сессии по токену:', error);
      throw new Error(`Failed to get session by token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteSession(token: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE token = ?');
      const result = stmt.run(token);
      return result.changes > 0;
    } catch (error) {
      console.error('❌ SQLite: Ошибка удаления сессии:', error);
      throw new Error(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteUserSessions(userId: string): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM sessions WHERE user_id = ?');
      const result = stmt.run(userId);
      return result.changes;
    } catch (error) {
      console.error('❌ SQLite: Ошибка удаления сессий пользователя:', error);
      throw new Error(`Failed to delete user sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteExpiredSessions(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?');
      const result = stmt.run(now);
      return result.changes;
    } catch (error) {
      console.error('❌ SQLite: Ошибка удаления истёкших сессий:', error);
      throw new Error(`Failed to delete expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // ОПЕРАЦИИ С ПРОЕКТАМИ
  // =====================================================

  public async createProject(projectData: Partial<Project>): Promise<Project> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const {
        name,
        description,
        created_by,
        color,
        icon_url,
        telegram_chat_id,
        telegram_topic_id
      } = projectData;

      const stmt = this.db.prepare(`
        INSERT INTO projects (id, name, description, creator_id, color, icon, telegram_chat_id, telegram_topic_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, name, description, created_by, color || '#3B82F6', icon_url || '📋', telegram_chat_id, telegram_topic_id, now, now);

      // Добавляем создателя как участника проекта
      const memberStmt = this.db.prepare(`
        INSERT INTO project_members (id, project_id, user_id, role, joined_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      const memberId = uuidv4();
      memberStmt.run(memberId, id, created_by, 'owner', now);

      return {
        id,
        name: name || '',
        description: description || '',
        created_by: created_by || '',
        color: color || '#3B82F6',
        icon_url: icon_url || '📋',
        telegram_chat_id: telegram_chat_id || null,
        telegram_topic_id: telegram_topic_id || null,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('❌ SQLite: Ошибка создания проекта:', error);
      throw new Error(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getProjectById(id: string): Promise<Project | null> {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const dbProject = stmt.get(id) as {
      id: string;
      name: string;
      description: string;
      creator_id: string;
      color: string;
      icon: string;
      created_at: string;
      updated_at: string;
    } | undefined;
    
    if (!dbProject) return null;
    
    // Маппинг полей из базы данных в ожидаемый формат
    const project: Project = {
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description,
      created_by: dbProject.creator_id,
      color: dbProject.color,
      icon_url: dbProject.icon || '📋',
      created_at: dbProject.created_at,
      updated_at: dbProject.updated_at
    };
    
    return project;
  }

  public async getUserProjects(userId: string): Promise<Project[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM projects WHERE creator_id = ?
    `);
    const dbProjects = stmt.all(userId) as {
      id: string;
      name: string;
      description: string;
      creator_id: string;
      color: string;
      icon: string;
      created_at: string;
      updated_at: string;
    }[];
    
    // Маппинг полей из базы данных в ожидаемый формат
    return dbProjects.map(dbProject => ({
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description,
      created_by: dbProject.creator_id,
      color: dbProject.color,
      icon_url: dbProject.icon || '📋',
      created_at: dbProject.created_at,
      updated_at: dbProject.updated_at
    }));
  }

  public async getAllProjects(): Promise<Project[]> {
    const stmt = this.db.prepare('SELECT * FROM projects');
    const dbProjects = stmt.all() as {
      id: string;
      name: string;
      description: string;
      creator_id: string;
      color: string;
      icon: string;
      created_at: string;
      updated_at: string;
    }[];
    
    // Маппинг полей из базы данных в ожидаемый формат
    return dbProjects.map(dbProject => ({
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description,
      color: dbProject.color,
      icon_url: dbProject.icon || '📋',
      created_by: dbProject.creator_id,
      created_at: dbProject.created_at,
      updated_at: dbProject.updated_at
    }));
  }

  public async deleteProject(id: string): Promise<boolean> {
    try {
      // Начинаем транзакцию для атомарного удаления
      this.db.exec('BEGIN TRANSACTION');

      // Удаляем задачи проекта
      const deleteTasksStmt = this.db.prepare('DELETE FROM tasks WHERE project_id = ?');
      deleteTasksStmt.run(id);

      // Удаляем колонки досок проекта
      const deleteColumnsStmt = this.db.prepare(`
        DELETE FROM columns WHERE board_id IN (
          SELECT id FROM boards WHERE project_id = ?
        )
      `);
      deleteColumnsStmt.run(id);

      // Удаляем доски проекта
      const deleteBoardsStmt = this.db.prepare('DELETE FROM boards WHERE project_id = ?');
      deleteBoardsStmt.run(id);

      // Удаляем участников проекта
      const deleteMembersStmt = this.db.prepare('DELETE FROM project_members WHERE project_id = ?');
      deleteMembersStmt.run(id);

      // Удаляем сам проект
      const deleteProjectStmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
      const result = deleteProjectStmt.run(id);

      // Подтверждаем транзакцию
      this.db.exec('COMMIT');

      return result.changes > 0;
    } catch (error) {
      // Откатываем транзакцию в случае ошибки
      this.db.exec('ROLLBACK');
      console.error('❌ Ошибка удаления проекта:', error);
      throw error;
    }
  }

  // =====================================================
  // ОПЕРАЦИИ С ДОСКАМИ
  // =====================================================

  public async createBoard(boardData: Partial<Board>): Promise<Board> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const {
        name,
        description,
        project_id,
        created_by
      } = boardData;

      const stmt = this.db.prepare(`
        INSERT INTO boards (id, name, description, project_id, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, name, description, project_id, created_by, now, now);

      return {
        id,
        name: name || '',
        description: description || '',
        project_id: project_id || '',
        created_by: created_by || '',
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('❌ SQLite: Ошибка создания доски:', error);
      throw new Error(`Failed to create board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getBoardById(id: string): Promise<Board | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM boards WHERE id = ?');
      const row = stmt.get(id) as {
        id: string;
        name: string;
        description: string;
        project_id: string;
        created_by: string;
        created_at: string;
        updated_at: string;
      } | undefined;
      
      if (!row) return null;

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        project_id: row.project_id,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения доски по ID:', error);
      throw new Error(`Failed to get board by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getProjectBoards(projectId: string): Promise<Board[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM boards WHERE project_id = ? ORDER BY created_at DESC');
      const dbBoards = stmt.all(projectId) as {
        id: string;
        name: string;
        description: string;
        project_id: string;
        created_by: string;
        created_at: string;
        updated_at: string;
      }[];
      
      return dbBoards.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        project_id: row.project_id,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения досок проекта:', error);
      throw new Error(`Failed to get project boards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteBoard(id: string): Promise<boolean> {
    try {
      const deleteBoard = this.db.transaction(() => {
        // Удаляем все задачи доски
        const deleteTasksStmt = this.db.prepare(`
          DELETE FROM tasks 
          WHERE column_id IN (
            SELECT id FROM columns WHERE board_id = ?
          )
        `);
        deleteTasksStmt.run(id);
        
        // Удаляем все колонки доски
        const deleteColumnsStmt = this.db.prepare('DELETE FROM columns WHERE board_id = ?');
        deleteColumnsStmt.run(id);
        
        // Удаляем саму доску
        const deleteBoardStmt = this.db.prepare('DELETE FROM boards WHERE id = ?');
        const result = deleteBoardStmt.run(id);
        
        return result.changes > 0;
      });
      
      return deleteBoard();
    } catch (error) {
      console.error('❌ SQLite: Ошибка удаления доски:', error);
      throw new Error(`Failed to delete board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // ОПЕРАЦИИ С КОЛОНКАМИ
  // =====================================================

  public async createColumn(column: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO columns (id, name, board_id, position, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(id, column.name, column.board_id, column.position, column.color, now, now);
      
      return {
        id,
        name: column.name,
        board_id: column.board_id,
        position: column.position,
        color: column.color,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('❌ SQLite: Ошибка создания колонки:', error);
      throw new Error(`Failed to create column: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getBoardColumns(boardId: string): Promise<Column[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position');
      const rows = stmt.all(boardId) as {
        id: string;
        name: string;
        board_id: string;
        position: number;
        color: string;
        created_at: string;
        updated_at: string;
      }[];
      
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        board_id: row.board_id,
        position: row.position,
        color: row.color,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения колонок доски:', error);
      throw new Error(`Failed to get board columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // ОПЕРАЦИИ С ЗАДАЧАМИ
  // =====================================================

  public async createTask(taskData: Partial<Task>): Promise<Task> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      const {
        title,
        description,
        status = 'todo',
        priority = 'medium',
        column_id,
        due_date,
        estimated_hours,
        position = 0
      } = taskData;

      const stmt = this.db.prepare(`
        INSERT INTO tasks (id, title, description, status, priority, column_id, due_date, estimated_hours, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, title, description, status, priority, column_id, due_date, estimated_hours, position, now, now);

      return {
        id,
        title: title || '',
        description: description || '',
        status,
        priority,
        column_id,
        due_date,
        estimated_hours,
        position,
        created_at: now,
        updated_at: now
      };
    } catch (error) {
      console.error('❌ SQLite: Ошибка создания задачи:', error);
      throw new Error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getTaskById(id: string): Promise<Task | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
      const task = stmt.get(id) as Task | undefined;
      return task || null;
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения задачи по ID:', error);
      throw new Error(`Failed to get task by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async getColumnTasks(columnId: string): Promise<Task[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM tasks WHERE column_id = ? ORDER BY position ASC, created_at DESC');
      return stmt.all(columnId) as Task[];
    } catch (error) {
      console.error('❌ SQLite: Ошибка получения задач колонки:', error);
      throw new Error(`Failed to get column tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('❌ SQLite: Ошибка удаления задачи:', error);
      throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // ПРОВЕРКА ДОСТУПА К ПРОЕКТАМ
  // =====================================================

  public async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      // Проверяем, является ли пользователь владельцем проекта
      const ownerStmt = this.db.prepare('SELECT id FROM projects WHERE id = ? AND creator_id = ?');
      const isOwner = ownerStmt.get(projectId, userId);
      
      if (isOwner) {
        console.log('🔍 SQLite: User is project owner');
        return true;
      }
      
      // Проверяем, является ли пользователь членом проекта
      const memberStmt = this.db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?');
      const isMember = memberStmt.get(projectId, userId);
      
      console.log('🔍 SQLite: Project access check:', {
        userId,
        projectId,
        isOwner: !!isOwner,
        isMember: !!isMember
      });
      
      return !!isMember;
    } catch (error) {
      console.error('❌ SQLite: Ошибка проверки доступа к проекту:', error);
      throw new Error(`Failed to check project access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // МЕТОДЫ ОБНОВЛЕНИЯ
  // =====================================================

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at');
      if (fields.length === 0) return null;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => (updates as Record<string, unknown>)[field]);
      values.push(new Date().toISOString()); // updated_at
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE tasks SET ${setClause}, updated_at = ? WHERE id = ?
      `);

      const result = stmt.run(...values);
      if (result.changes === 0) return null;

      return this.getTaskById(id);
    } catch (error) {
      console.error('❌ SQLite: Ошибка обновления задачи:', error);
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async updateBoard(id: string, updates: Partial<Board>): Promise<Board | null> {
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at');
      if (fields.length === 0) return null;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => (updates as Record<string, unknown>)[field]);
      values.push(new Date().toISOString()); // updated_at
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE boards SET ${setClause}, updated_at = ? WHERE id = ?
      `);

      const result = stmt.run(...values);
      if (result.changes === 0) return null;

      return this.getBoardById(id);
    } catch (error) {
      console.error('❌ SQLite: Ошибка обновления доски:', error);
      throw new Error(`Failed to update board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at');
      if (fields.length === 0) return null;

      const setClause = fields.map(field => `${field} = ?`).join(', ');
      const values = fields.map(field => (updates as Record<string, unknown>)[field]);
      values.push(new Date().toISOString()); // updated_at
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE projects SET ${setClause}, updated_at = ? WHERE id = ?
      `);

      const result = stmt.run(...values);
      if (result.changes === 0) return null;

      return this.getProjectById(id);
    } catch (error) {
      console.error('❌ SQLite: Ошибка обновления проекта:', error);
      throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // =====================================================
  // ВЫПОЛНЕНИЕ ПРОИЗВОЛЬНЫХ SQL ЗАПРОСОВ
  // =====================================================

  public async query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(sql);
      const trimmedSql = sql.trim().toUpperCase();
      
      // Определяем тип SQL команды
      const isSelectQuery = trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('WITH');
      
      if (isSelectQuery) {
        // Для SELECT запросов используем all()
        let rows: unknown[];
        if (params && params.length > 0) {
          rows = stmt.all(...params) as unknown[];
        } else {
          rows = stmt.all() as unknown[];
        }
        return { rows };
      } else {
        // Для INSERT, UPDATE, DELETE, BEGIN, COMMIT, ROLLBACK используем run()
        let result;
        if (params && params.length > 0) {
          result = stmt.run(...params);
        } else {
          result = stmt.run();
        }
        
        // Возвращаем информацию о результате операции
        return { 
          rows: []
        };
      }
    } catch (error) {
      console.error('❌ SQLite query error:', error);
      throw error;
    }
  }

  // Закрытие соединения
  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Экспорт экземпляра адаптера
export const sqliteAdapter = SQLiteAdapter.getInstance();