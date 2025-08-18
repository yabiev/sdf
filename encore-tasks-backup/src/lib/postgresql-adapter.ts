import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { User, Project, Board, Column, Task, Comment, Attachment, Tag, Session } from '../types';

// Интерфейс для конфигурации базы данных
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

// Класс для работы с PostgreSQL
export class PostgreSQLAdapter {
  private static instance: PostgreSQLAdapter | null = null;
  private pool: Pool;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 20, // максимальное количество соединений в пуле
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Инициализация базы данных
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const client = await this.pool.connect();
      
      // Проверяем подключение
      await client.query('SELECT NOW()');
      
      console.log('✅ PostgreSQL подключение установлено');
      client.release();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Ошибка подключения к PostgreSQL:', error);
      throw error;
    }
  }

  // Закрытие пула соединений
  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
  }

  // Получение клиента для транзакций
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Выполнение запроса
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      console.log('SQL Query:', text);
      console.log('SQL Params:', params);
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // === МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ===

  async createUser(email: string, password: string, name: string, role: string = 'user'): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await this.query(
      `INSERT INTO users (email, password_hash, name, role, approval_status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [email, hashedPassword, name, role, 'pending']
    );
    return result.rows[0];
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    return result.rows[0] || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    
    // Маппинг полей базы данных в User интерфейс
    return {
      id: row.id,
      userId: row.id, // Добавляем userId для совместимости
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.is_active ? 'active' : 'inactive',
      approval_status: row.approval_status,
      avatar: row.avatar,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login_at: row.last_login_at
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof User]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getUserById(id);
    }

    const result = await this.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.query(
      'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ ПРОЕКТОВ ===

  async createProject(name: string, description: string, ownerId: string, color?: string): Promise<Project> {
    const result = await this.query(
      `INSERT INTO projects (name, description, creator_id, color)
     VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, ownerId, color || '#3B82F6']
    );
    return result.rows[0];
  }

  async getProjectById(id: string): Promise<Project | null> {
    const result = await this.query(
      'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const result = await this.query(
      `SELECT DISTINCT p.* FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id 
       WHERE (p.creator_id = $1 OR pm.user_id = $1) AND p.deleted_at IS NULL 
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async getAllProjects(): Promise<Project[]> {
    const result = await this.query(
      'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    return result.rows;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof Project]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getProjectById(id);
    }

    const result = await this.query(
      `UPDATE projects SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      // Проверяем, является ли пользователь владельцем проекта
      const ownerResult = await this.query(
        'SELECT creator_id FROM projects WHERE id = $1 AND deleted_at IS NULL',
        [projectId]
      );
      
      if (ownerResult.rows.length === 0) {
        return false; // Проект не найден
      }
      
      const projectOwner = ownerResult.rows[0].creator_id;
      if (projectOwner === userId) {
        return true; // Пользователь является владельцем
      }
      
      // Проверяем членство в проекте
      const memberResult = await this.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userId]
      );
      
      return memberResult.rows.length > 0;
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }

  // === МЕТОДЫ ДЛЯ ДОСОК ===

  async createBoard(name: string, description: string, projectId: string): Promise<Board> {
    const result = await this.query(
      `INSERT INTO boards (name, project_id) 
       VALUES ($1, $2) 
       RETURNING *`,
      [name, projectId]
    );
    return result.rows[0];
  }

  async getBoardById(id: string): Promise<Board | null> {
    const result = await this.query(
      'SELECT * FROM boards WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  async getBoardsByProjectId(projectId: string): Promise<Board[]> {
    const result = await this.query(
      'SELECT * FROM boards WHERE project_id = $1 AND deleted_at IS NULL ORDER BY position, created_at',
      [projectId]
    );
    return result.rows;
  }

  async updateBoard(id: string, updates: Partial<Board>): Promise<Board | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof Board]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getBoardById(id);
    }

    const result = await this.query(
      `UPDATE boards SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async deleteBoard(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE boards SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ КОЛОНОК ===

  async createColumn(name: string, boardId: string, position?: number, color?: string): Promise<Column> {

    const result = await this.query(
      `INSERT INTO columns (title, board_id, position, color) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, boardId, position || 0, color || '#6B7280']
    );
    return result.rows[0];
  }

  async getColumnById(id: string): Promise<Column | null> {
    const result = await this.query(
      'SELECT * FROM columns WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  async getColumnsByBoardId(boardId: string): Promise<Column[]> {
    const result = await this.query(
      'SELECT * FROM columns WHERE board_id = $1 AND deleted_at IS NULL ORDER BY position, created_at',
      [boardId]
    );
    return result.rows;
  }

  async updateColumn(id: string, updates: Partial<Column>): Promise<Column | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof Column]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getColumnById(id);
    }

    const result = await this.query(
      `UPDATE columns SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async deleteColumn(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE columns SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ ЗАДАЧ ===

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const {
      title,
      description,
      status = 'todo',
      priority = 'medium',
      project_id,
      board_id,
      column_id,
      assignee_id,
      reporter_id,
      position = 0
    } = taskData;

    const result = await this.query(
      `INSERT INTO tasks (title, description, status, priority, project_id, board_id, column_id, assignee_id, reporter_id, position) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [title, description, status, priority, project_id, board_id, column_id, assignee_id, reporter_id, position]
    );
    return result.rows[0];
  }

  async getTaskById(id: string): Promise<Task | null> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0] || null;
  }

  async getTasksByProjectId(projectId: string): Promise<Task[]> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE project_id = $1 AND deleted_at IS NULL ORDER BY position, created_at',
      [projectId]
    );
    return result.rows;
  }

  async getTasksByColumnId(columnId: string): Promise<Task[]> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE column_id = $1 AND deleted_at IS NULL ORDER BY position, created_at',
      [columnId]
    );
    return result.rows;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const values = fields.map(field => updates[field as keyof Task]);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    if (fields.length === 0) {
      return await this.getTaskById(id);
    }

    const result = await this.query(
      `UPDATE tasks SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async deleteTask(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ СЕССИЙ ===

  async createSession(sessionToken: string, userId: string, expiresAt: Date): Promise<Session> {
    
    const result = await this.query(
      `INSERT INTO user_sessions (session_token, user_id, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
      [sessionToken, userId, expiresAt]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      token: row.session_token,
      expiresAt: new Date(row.expires_at),
      isActive: true,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      lastActivityAt: new Date(row.last_activity_at || row.created_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at)
    };
  }

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    const result = await this.query(
      'SELECT * FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      token: row.session_token,
      expiresAt: new Date(row.expires_at),
      isActive: true,
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      lastActivityAt: new Date(row.last_activity_at || row.created_at),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at)
    };
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );
    return result.rowCount > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.query(
      'DELETE FROM user_sessions WHERE expires_at <= NOW()'
    );
    return result.rowCount;
  }

  // === МЕТОДЫ ДЛЯ КОММЕНТАРИЕВ ===

  async createComment(content: string, taskId: string, authorId: string): Promise<Comment> {
    const result = await this.query(
      `INSERT INTO comments (content, task_id, author_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [content, taskId, authorId]
    );
    return result.rows[0];
  }

  async getCommentsByTaskId(taskId: string): Promise<Comment[]> {
    const result = await this.query(
      'SELECT * FROM comments WHERE task_id = $1 AND deleted_at IS NULL ORDER BY created_at',
      [taskId]
    );
    return result.rows;
  }

  async updateComment(id: string, content: string): Promise<Comment | null> {
    const result = await this.query(
      'UPDATE comments SET content = $2 WHERE id = $1 RETURNING *',
      [id, content]
    );
    return result.rows[0] || null;
  }

  async deleteComment(id: string): Promise<boolean> {
    const result = await this.query(
      'UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ ТЕГОВ ===

  async createTag(name: string, color: string, projectId?: string): Promise<Tag> {
    const result = await this.query(
      `INSERT INTO tags (name, color, project_id) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [name, color, projectId]
    );
    return result.rows[0];
  }

  async getTagsByProjectId(projectId: string): Promise<Tag[]> {
    const result = await this.query(
      'SELECT * FROM tags WHERE project_id = $1 ORDER BY name',
      [projectId]
    );
    return result.rows;
  }

  async addTagToTask(taskId: string, tagId: string): Promise<boolean> {
    try {
      await this.query(
        'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)',
        [taskId, tagId]
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async removeTagFromTask(taskId: string, tagId: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2',
      [taskId, tagId]
    );
    return result.rowCount > 0;
  }

  async getTagsByTaskId(taskId: string): Promise<Tag[]> {
    const result = await this.query(
      `SELECT t.* FROM tags t 
       JOIN task_tags tt ON t.id = tt.tag_id 
       WHERE tt.task_id = $1`,
      [taskId]
    );
    return result.rows;
  }

  // Статический метод для получения экземпляра (Singleton)
  static getInstance(): PostgreSQLAdapter {
    if (!PostgreSQLAdapter.instance) {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'encore_tasks',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ssl: process.env.DB_SSL === 'true'
      };
      
      PostgreSQLAdapter.instance = new PostgreSQLAdapter(config);
    }
    
    return PostgreSQLAdapter.instance;
  }
}

// Экспорт экземпляра адаптера
let dbAdapter: PostgreSQLAdapter | null = null;

export function getPostgreSQLAdapter(): PostgreSQLAdapter {
  if (!dbAdapter) {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'encore_tasks',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true'
    };
    
    dbAdapter = new PostgreSQLAdapter(config);
  }
  
  return dbAdapter;
}

export default getPostgreSQLAdapter;