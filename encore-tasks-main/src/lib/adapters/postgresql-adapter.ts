// =====================================================
// POSTGRESQL ADAPTER FOR ENCORE TASKS
// =====================================================

import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class PostgreSQLAdapter {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'encore_tasks',
      user: process.env.DB_USER || 'encore_user',
      password: process.env.DB_PASSWORD || 'encore_password',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isInitialized = true;
      console.log('✅ PostgreSQL adapter initialized successfully');
    } catch (error) {
      console.error('❌ PostgreSQL adapter initialization failed:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.isInitialized;
  }

  async executeRawQuery(query: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  async query(sql: string, params?: unknown[]): Promise<any> {
    return this.executeRawQuery(sql, params as any[]);
  }

  // =====================================================
  // USER OPERATIONS
  // =====================================================

  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<any> {
    const { email, password, name, role = 'user' } = userData;
    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();

    const query = `
      INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, name, role, created_at, updated_at
    `;

    const result = await this.executeRawQuery(query, [id, email, hashedPassword, name, role]);
    return result.rows[0];
  }

  async getUserById(id: string): Promise<any> {
    const query = 'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<any> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.executeRawQuery(query, [email]);
    return result.rows[0] || null;
  }

  async updateUser(id: string, userData: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(userData)) {
      if (key === 'password') {
        fields.push(`password_hash = $${paramIndex}`);
        values.push(await bcrypt.hash(value as string, 12));
      } else if (key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, role, created_at, updated_at
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  async getAllUsers(): Promise<any[]> {
    const query = 'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC';
    const result = await this.executeRawQuery(query);
    return result.rows;
  }

  // =====================================================
  // SESSION OPERATIONS
  // =====================================================

  async createSession(sessionData: any): Promise<any> {
    const { userId, user_id, token, expiresAt, expires_at } = sessionData;
    const id = uuidv4();
    
    // Поддерживаем оба формата названий полей
    const userIdValue = userId || user_id;
    const expiresAtValue = expiresAt || expires_at;

    const query = `
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [id, userIdValue, token, expiresAtValue]);
    return result.rows[0];
  }

  async getSessionByToken(token: string): Promise<any> {
    const query = `
      SELECT s.*, u.id as user_id, u.email, u.name, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `;
    const result = await this.executeRawQuery(query, [token]);
    return result.rows[0] || null;
  }

  async deleteSession(token: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE token = $1';
    const result = await this.executeRawQuery(query, [token]);
    return result.rowCount > 0;
  }

  async deleteUserSessions(userId: string): Promise<boolean> {
    const query = 'DELETE FROM sessions WHERE user_id = $1';
    const result = await this.executeRawQuery(query, [userId]);
    return result.rowCount > 0;
  }

  // =====================================================
  // PROJECT OPERATIONS
  // =====================================================

  async createProject(projectData: any): Promise<any> {
    const { name, description, created_by, color, icon_url } = projectData;
    const id = uuidv4();

    const query = `
      INSERT INTO projects (id, name, description, creator_id, color, icon, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [id, name, description, created_by, color, icon_url]);
    return result.rows[0];
  }

  async getProjectById(id: string): Promise<any> {
    const query = `
      SELECT p.*, u.name as owner_name
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.id = $1
    `;
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getUserProjects(userId: string): Promise<any[]> {
    const query = `
      SELECT p.*, u.name as owner_name
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.creator_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await this.executeRawQuery(query, [userId]);
    return result.rows;
  }

  async updateProject(id: string, projectData: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(projectData)) {
      if (key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE projects 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteProject(id: string): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // BOARD OPERATIONS
  // =====================================================

  async createBoard(boardData: any): Promise<any> {
    const { name, description, projectId, position } = boardData;
    const id = uuidv4();

    const query = `
      INSERT INTO boards (id, name, description, project_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [id, name, description, projectId]);
    return result.rows[0];
  }

  async getBoardById(id: string): Promise<any> {
    const query = 'SELECT * FROM boards WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getProjectBoards(projectId: string): Promise<any[]> {
    const query = 'SELECT * FROM boards WHERE project_id = $1 ORDER BY created_at ASC';
    const result = await this.executeRawQuery(query, [projectId]);
    return result.rows;
  }

  async updateBoard(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE boards 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteBoard(id: string): Promise<boolean> {
    const query = 'DELETE FROM boards WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // COLUMN OPERATIONS
  // =====================================================

  async createColumn(columnData: any): Promise<any> {
    const { name, boardId, position } = columnData;
    const id = uuidv4();

    const query = `
      INSERT INTO columns (id, title, board_id, position, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [id, name, boardId, position || 0]);
    return result.rows[0];
  }

  async getColumnById(id: string): Promise<any> {
    const query = 'SELECT * FROM columns WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getBoardColumns(boardId: string): Promise<any[]> {
    const query = 'SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC, created_at ASC';
    const result = await this.executeRawQuery(query, [boardId]);
    return result.rows;
  }

  async updateColumn(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE columns 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteColumn(id: string): Promise<boolean> {
    const query = 'DELETE FROM columns WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // TASK OPERATIONS
  // =====================================================

  async createTask(taskData: any): Promise<any> {
    const { title, description, columnId, projectId, assigneeId, priority, dueDate, position } = taskData;
    const id = uuidv4();

    const query = `
      INSERT INTO tasks (id, title, description, column_id, project_id, assignee_id, priority, due_date, position, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'todo', NOW(), NOW())
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, [
      id, title, description, columnId, projectId, assigneeId, priority || 'medium', dueDate, position || 0
    ]);
    return result.rows[0];
  }

  async getTaskById(id: string): Promise<any> {
    const query = `
      SELECT t.*, u.name as assignee_name, c.name as column_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN columns c ON t.column_id = c.id
      WHERE t.id = $1
    `;
    const result = await this.executeRawQuery(query, [id]);
    return result.rows[0] || null;
  }

  async getProjectTasks(projectId: string): Promise<any[]> {
    const query = `
      SELECT t.*, u.name as assignee_name, c.name as column_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN columns c ON t.column_id = c.id
      WHERE t.project_id = $1
      ORDER BY t.position ASC, t.created_at ASC
    `;
    const result = await this.executeRawQuery(query, [projectId]);
    return result.rows;
  }

  async getBoardTasks(boardId: string): Promise<any[]> {
    const query = `
      SELECT t.*, u.name as assignee_name, c.name as column_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN columns c ON t.column_id = c.id
      WHERE c.board_id = $1
      ORDER BY t.position ASC, t.created_at ASC
    `;
    const result = await this.executeRawQuery(query, [boardId]);
    return result.rows;
  }

  async getColumnTasks(columnId: string): Promise<any[]> {
    const query = `
      SELECT t.*, u.name as assignee_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.column_id = $1
      ORDER BY t.position ASC, t.created_at ASC
    `;
    const result = await this.executeRawQuery(query, [columnId]);
    return result.rows;
  }

  async updateTask(id: string, updates: Partial<any>): Promise<any> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tasks 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.executeRawQuery(query, values);
    return result.rows[0];
  }

  async deleteTask(id: string): Promise<boolean> {
    const query = 'DELETE FROM tasks WHERE id = $1';
    const result = await this.executeRawQuery(query, [id]);
    return result.rowCount > 0;
  }

  // =====================================================
  // PROJECT ACCESS OPERATIONS
  // =====================================================

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    // Check if user is the creator of the project
    const query = `
      SELECT 1 FROM projects 
      WHERE id = $1 AND creator_id = $2
    `;
    const result = await this.executeRawQuery(query, [projectId, userId]);
    return result.rows.length > 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.isInitialized = false;
  }
}