import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { User, Project, Board, Column, Task, Comment, Session } from '../types';
import { Tag } from '../types/core.types';

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
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
    // Специальная настройка SSL для Supabase
    let sslConfig: boolean | object = false;
    if (config.ssl) {
      // Если хост содержит supabase.co, используем специальные настройки SSL
      if (config.host.includes('supabase.co')) {
        sslConfig = {
          rejectUnauthorized: false,
          ca: undefined
        };
      } else {
        sslConfig = { rejectUnauthorized: false };
      }
    }

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: sslConfig,
      max: 20, // максимальное количество соединений в пуле
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  // Инициализация базы данных
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing PostgreSQL adapter with config:', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        ssl: this.config.ssl
      });
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

  // Конвертация SQL из SQLite формата (?) в PostgreSQL формат ($1, $2, ...)
  private convertSqlToPostgreSQL(sql: string): string {
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }

  // Выполнение запроса
  async query(text: string, params?: unknown[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      // Конвертируем SQL из SQLite формата в PostgreSQL формат
      const convertedSql = this.convertSqlToPostgreSQL(text);
      console.log('Original SQL Query:', text);
      console.log('Converted SQL Query:', convertedSql);
      console.log('SQL Params:', params);
      const result = await client.query(convertedSql, params);
      return result;
    } finally {
      client.release();
    }
  }

  // === МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ ===

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { email, name, role = 'user', password_hash, isApproved = false, avatar } = userData;
    
    // Если password_hash не предоставлен, но есть пароль в виде строки, хешируем его
    const userDataWithPassword = userData as { password?: string };
    const hashedPassword = password_hash || (userDataWithPassword.password ? 
      await bcrypt.hash(userDataWithPassword.password, 12) : 
      await bcrypt.hash('defaultpassword', 12));
    
    // Преобразуем isApproved в approval_status
    const approvalStatus = isApproved ? 'approved' : 'pending';
    
    const result = await this.query(
      `INSERT INTO users (email, password_hash, name, role, approval_status, avatar_url) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [email, hashedPassword, name, role, approvalStatus, avatar]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role,
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const row = result.rows[0];
    if (!row) return null;
    
    // Маппинг полей базы данных в User интерфейс
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role || 'user',
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    const row = result.rows[0];
    if (!row) return null;
    
    console.log('User data:', row);
    console.log('User isApproved:', row.approval_status === 'approved', 'type:', typeof (row.approval_status === 'approved'));
    console.log('User role:', row.role);
    console.log('Final isApproved:', row.approval_status === 'approved');
    
    // Маппинг полей базы данных в User интерфейс
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role || 'user',
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    
    if (fields.length === 0) {
      return await this.getUserById(id);
    }

    // Маппинг полей интерфейса User в поля базы данных
    const dbFields = fields.map(field => {
      if (field === 'avatar') return 'avatar_url';
      if (field === 'isApproved') return 'approval_status';
      return field;
    });
    
    // Преобразуем значения для базы данных
    const dbValues = fields.map(field => {
      if (field === 'isApproved') {
        return updates[field] ? 'approved' : 'pending';
      }
      return updates[field as keyof User];
    });
    
    const setClause = dbFields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const result = await this.query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, ...dbValues]
    );
    
    const row = result.rows[0];
    if (!row) return null;
    
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role,
      isApproved: row.is_approved,
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    };
  }

  async getAllUsers(): Promise<User[]> {
    const result = await this.query(
      'SELECT * FROM users ORDER BY created_at DESC'
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatar: row.avatar_url,
      role: row.role || 'user',
      isApproved: row.approval_status === 'approved',
      created_at: row.created_at,
      updated_at: row.updated_at,
      password_hash: row.password_hash
    }));
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ ПРОЕКТОВ ===

  async createProject(projectData: { name: string; description: string; created_by: string; color?: string; icon_url?: string; telegram_chat_id?: string; telegram_topic_id?: string }): Promise<Project> {
    console.log('🔍 PostgreSQL createProject called with:', projectData);
    try {
      // Конвертируем строковый ID в integer для PostgreSQL
      const ownerIdInt = parseInt(projectData.created_by, 10);
      if (isNaN(ownerIdInt)) {
        throw new Error(`Invalid user ID: ${projectData.created_by}`);
      }
      
      const result = await this.query(
        `INSERT INTO projects (name, description, owner_id, color, icon, telegram_chat_id, telegram_topic_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [projectData.name, projectData.description, ownerIdInt, projectData.color || '#3B82F6', projectData.icon_url || null, projectData.telegram_chat_id || null, projectData.telegram_topic_id || null, true]
      );
      
      const project = result.rows[0];
      
      // Добавляем владельца проекта в project_members с ролью 'owner'
      await this.query(
        `INSERT INTO project_members (project_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [project.id, ownerIdInt, 'owner']
      );
      
      // Преобразуем owner_id обратно в created_by для совместимости с API
      const apiProject = {
        ...project,
        created_by: project.owner_id.toString(),
        icon_url: project.icon,
        telegram_chat_id: project.telegram_chat_id,
        telegram_topic_id: project.telegram_topic_id
      };
      
      console.log('✅ PostgreSQL project created successfully with owner membership:', apiProject);
      return apiProject;
    } catch (error) {
      console.error('❌ PostgreSQL createProject error:', error);
      throw error;
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    const result = await this.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    const project = result.rows[0];
    if (!project) return null;
    
    return {
      ...project,
      created_by: project.owner_id.toString(),
      icon_url: project.icon,
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    };
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    // Конвертируем userId в integer для PostgreSQL
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      console.error('Invalid userId for getProjectsByUserId:', userId);
      return [];
    }
    
    const result = await this.query(
      `SELECT DISTINCT p.* FROM projects p 
       LEFT JOIN project_members pm ON p.id = pm.project_id 
       WHERE (p.owner_id = $1 OR pm.user_id = $1) 
       ORDER BY p.created_at DESC`,
      [userIdInt]
    );
    return result.rows.map((project: any) => ({
      ...project,
      created_by: project.owner_id.toString(),
      icon_url: project.icon,
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    }));
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return this.getProjectsByUserId(userId);
  }

  async getAllProjects(): Promise<Project[]> {
    const result = await this.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    return result.rows.map((project: any) => ({
      ...project,
      created_by: project.owner_id.toString(),
      icon_url: project.icon,
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    }));
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
    const project = result.rows[0];
    if (!project) return null;
    
    return {
      ...project,
      created_by: project.owner_id.toString(),
      icon_url: project.icon,
      telegram_chat_id: project.telegram_chat_id,
      telegram_topic_id: project.telegram_topic_id
    };
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM projects WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  async hasProjectAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      // Конвертируем userId в integer для сравнения с PostgreSQL
      const userIdInt = parseInt(userId, 10);
      if (isNaN(userIdInt)) {
        console.error('Invalid userId for access check:', userId);
        return false;
      }
      
      // Проверяем, является ли пользователь владельцем проекта
      const ownerResult = await this.query(
        'SELECT owner_id FROM projects WHERE id = $1',
        [projectId]
      );
      
      if (ownerResult.rows.length === 0) {
        return false; // Проект не найден
      }
      
      const projectOwner = ownerResult.rows[0].owner_id;
      if (projectOwner === userIdInt) {
        return true; // Пользователь является владельцем
      }
      
      // Проверяем членство в проекте
      const memberResult = await this.query(
        'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
        [projectId, userIdInt]
      );
      
      return memberResult.rows.length > 0;
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }

  // === МЕТОДЫ ДЛЯ ДОСОК ===

  async createBoard(boardData: any): Promise<Board> {
    const result = await this.query(
      `INSERT INTO boards (name, description, project_id, created_by, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [boardData.name, boardData.description || '', boardData.project_id, parseInt(boardData.created_by, 10)]
    );
    return result.rows[0];
  }

  async getBoardById(id: string): Promise<Board | null> {
    const result = await this.query(
      'SELECT * FROM boards WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getBoardsByProjectId(projectId: string): Promise<Board[]> {
    const result = await this.query(
      `SELECT b.* FROM boards b 
       JOIN projects p ON b.project_id = p.id 
       WHERE b.project_id = $1 
       ORDER BY b.position ASC, b.created_at DESC`,
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
      'DELETE FROM boards WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  // === МЕТОДЫ ДЛЯ КОЛОНОК ===

  async createColumn(title: string, boardId: string, position?: number, color?: string, createdBy?: string): Promise<Column> {
    const result = await this.query(
      `INSERT INTO columns (title, board_id, position, color, settings, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [title, boardId, position || 0, color || '#6B7280', '{}', createdBy || null]
    );
    return result.rows[0];
  }

  async getColumnById(id: string): Promise<Column | null> {
    const result = await this.query(
      'SELECT * FROM columns WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getColumnsByBoardId(boardId: string): Promise<Column[]> {
    const result = await this.query(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC, created_at DESC',
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
      'DELETE FROM columns WHERE id = $1',
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

    // Создаем задачу без assignee_id (используется отдельная таблица task_assignees)
    const result = await this.query(
      `INSERT INTO tasks (title, description, status, priority, project_id, board_id, column_id, reporter_id, position) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [title, description, status, priority, project_id, board_id, column_id, reporter_id, position]
    );
    
    const task = result.rows[0];
    
    // Если указан assignee_id, создаем запись в таблице task_assignees
    if (assignee_id) {
      await this.query(
        `INSERT INTO task_assignees (task_id, user_id, assigned_by) 
         VALUES ($1, $2, $3)`,
        [task.id, assignee_id, reporter_id]
      );
    }
    
    return task;
  }

  async getTaskById(id: string): Promise<Task | null> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getTasksByProjectId(projectId: string): Promise<Task[]> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC, created_at DESC',
      [projectId]
    );
    return result.rows;
  }

  async getTasksByColumnId(columnId: string): Promise<Task[]> {
    const result = await this.query(
      'SELECT * FROM tasks WHERE column_id = $1 ORDER BY position ASC, created_at DESC',
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
      'DELETE FROM tasks WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  async getTaskAssignees(taskId: string): Promise<any[]> {
    const result = await this.query(
      `SELECT u.id, u.username, u.email, ta.assigned_at 
       FROM task_assignees ta 
       JOIN users u ON ta.user_id = u.id 
       WHERE ta.task_id = $1`,
      [taskId]
    );
    return result.rows;
  }

  async assignTaskToUser(taskId: string, userId: string, assignedBy?: string): Promise<boolean> {
    try {
      await this.query(
        `INSERT INTO task_assignees (task_id, user_id, assigned_by) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [taskId, userId, assignedBy]
      );
      return true;
    } catch (error) {
      console.error('Error assigning task to user:', error);
      return false;
    }
  }

  async unassignTaskFromUser(taskId: string, userId: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2',
      [taskId, userId]
    );
    return result.rowCount > 0;
  }

  // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ ===

  async getBoardColumns(boardId: string): Promise<Column[]> {
    return await this.getColumnsByBoardId(boardId);
  }

  async getColumnTasks(columnId: string): Promise<Task[]> {
    return await this.getTasksByColumnId(columnId);
  }

  // === МЕТОДЫ ДЛЯ СЕССИЙ ===

  async createSession(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    const result = await this.query(
      'INSERT INTO sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [sessionData.token, sessionData.user_id, sessionData.expires_at]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      token: row.session_token,
      expires_at: row.expires_at,
      created_at: row.created_at
    };
  }

  async getSessionByToken(sessionToken: string): Promise<Session | null> {
    const result = await this.query(
      'SELECT * FROM sessions WHERE session_token = $1 AND expires_at > NOW()',
      [sessionToken]
    );
    
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      token: row.session_token,
      expires_at: row.expires_at,
      created_at: row.created_at
    };
  }

  async deleteSession(sessionToken: string): Promise<boolean> {
    const result = await this.query(
      'DELETE FROM sessions WHERE session_token = $1',
      [sessionToken]
    );
    return result.rowCount > 0;
  }

  async deleteUserSessions(userId: string): Promise<number> {
    const result = await this.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );
    return result.rowCount;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.query(
      'DELETE FROM sessions WHERE expires_at <= NOW()'
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        ssl: false // Отключаем SSL для локального PostgreSQL
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