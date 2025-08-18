// User Repository Implementation
// Handles all database operations for users

import { IUserRepository } from '../../business/interfaces';
import {
  User,
  SearchFilters,
  SortOptions,
  PaginationOptions
} from '../types';
import { databaseAdapter } from '../adapters/database-adapter';
import { generateId } from '../../../lib/utils';

export class UserRepository implements IUserRepository {
  private readonly tableName = 'users';
  private readonly sessionsTableName = 'sessions';

  async findById(id: string): Promise<User | null> {
    try {
      const sql = 'SELECT * FROM users WHERE id = ?';
      const row = await databaseAdapter.queryOne(sql, [id]);
      if (!row) return null;

      return this.transformToUser(row);
    } catch (error) {
      throw new Error(`Failed to find user by id: ${error}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const sql = 'SELECT * FROM users WHERE email = ?';
      const row = await databaseAdapter.queryOne(sql, [email]);
      if (!row) return null;

      return this.transformToUser(row);
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error}`);
    }
  }

  async findAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<User[]> {
    try {
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params: any[] = [];

      // Apply filters
      if (filters?.query) {
        sql += ' AND (name LIKE ? OR email LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'name':
            sql += ` ORDER BY name ${direction}`;
            break;
          case 'email':
            sql += ` ORDER BY email ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY created_at ${direction}`;
            break;
          case 'lastLoginAt':
            sql += ` ORDER BY last_login_at ${direction}`;
            break;
          default:
            sql += ' ORDER BY created_at DESC';
        }
      } else {
        sql += ' ORDER BY created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToUser(row));
    } catch (error) {
      throw new Error(`Failed to find all users: ${error}`);
    }
  }

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const id = generateId();
      const now = new Date();
      
      const userData = {
        id,
        name: user.name,
        email: user.email,
        password_hash: user.passwordHash,
        avatar: user.avatar || null,
        role: user.role || 'user',
        is_active: user.isActive !== false ? 1 : 0,
        email_verified: user.emailVerified ? 1 : 0,
        preferences: JSON.stringify(user.preferences || {}),
        last_login_at: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, userData);
      return await this.findById(id) as User;
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    try {
      const updateData: Record<string, any> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.passwordHash !== undefined) updateData.password_hash = updates.passwordHash;
      if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;
      if (updates.emailVerified !== undefined) updateData.email_verified = updates.emailVerified ? 1 : 0;
      if (updates.preferences !== undefined) updateData.preferences = JSON.stringify(updates.preferences);
      if (updates.lastLoginAt !== undefined) updateData.last_login_at = updates.lastLoginAt ? updates.lastLoginAt.toISOString() : null;

      updateData.updated_at = new Date().toISOString();

      await databaseAdapter.update(this.tableName, id, updateData);
      return await this.findById(id) as User;
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databaseAdapter.beginTransaction();
      
      // Delete user sessions
      await databaseAdapter.query('DELETE FROM sessions WHERE user_id = ?', [id]);
      
      // Delete the user
      await databaseAdapter.delete(this.tableName, id);
      
      await databaseAdapter.commitTransaction();
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to delete user: ${error}`);
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update last login: ${error}`);
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update password: ${error}`);
    }
  }

  async updatePreferences(id: string, preferences: Record<string, any>): Promise<User> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        preferences: JSON.stringify(preferences),
        updated_at: new Date().toISOString()
      });
      return await this.findById(id) as User;
    } catch (error) {
      throw new Error(`Failed to update preferences: ${error}`);
    }
  }

  async verifyEmail(id: string): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        email_verified: 1,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to verify email: ${error}`);
    }
  }

  async deactivate(id: string): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        is_active: 0,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to deactivate user: ${error}`);
    }
  }

  async activate(id: string): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, {
        is_active: 1,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to activate user: ${error}`);
    }
  }

  async createSession(userId: string, sessionData: {
    token: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const sessionRecord = {
        id: generateId(),
        user_id: userId,
        token: sessionData.token,
        expires_at: sessionData.expiresAt.toISOString(),
        user_agent: sessionData.userAgent || null,
        ip_address: sessionData.ipAddress || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.sessionsTableName, sessionRecord);
    } catch (error) {
      throw new Error(`Failed to create session: ${error}`);
    }
  }

  async findSessionByToken(token: string): Promise<{
    id: string;
    userId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  } | null> {
    try {
      const sql = 'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')';
      const row = await databaseAdapter.queryOne(sql, [token]);
      if (!row) return null;

      return {
        id: row.id,
        userId: row.user_id,
        expiresAt: new Date(row.expires_at),
        userAgent: row.user_agent,
        ipAddress: row.ip_address
      };
    } catch (error) {
      throw new Error(`Failed to find session by token: ${error}`);
    }
  }

  async deleteSession(token: string): Promise<void> {
    try {
      await databaseAdapter.query('DELETE FROM sessions WHERE token = ?', [token]);
    } catch (error) {
      throw new Error(`Failed to delete session: ${error}`);
    }
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    try {
      await databaseAdapter.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    } catch (error) {
      throw new Error(`Failed to delete all user sessions: ${error}`);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      await databaseAdapter.query('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')', []);
    } catch (error) {
      throw new Error(`Failed to cleanup expired sessions: ${error}`);
    }
  }

  async getUserStats(id: string): Promise<{
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
  }> {
    try {
      const sql = `
        SELECT 
          (SELECT COUNT(DISTINCT pm.project_id) FROM project_members pm WHERE pm.user_id = ?) as total_projects,
          (SELECT COUNT(*) FROM tasks WHERE assigned_to = ? AND is_archived = 0) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE assigned_to = ? AND status = 'done' AND is_archived = 0) as completed_tasks,
          (SELECT COUNT(*) FROM tasks WHERE assigned_to = ? AND due_date < datetime('now') AND status != 'done' AND is_archived = 0) as overdue_tasks
      `;
      
      const result = await databaseAdapter.queryOne(sql, [id, id, id, id]);
      
      return {
        totalProjects: result?.total_projects || 0,
        totalTasks: result?.total_tasks || 0,
        completedTasks: result?.completed_tasks || 0,
        overdueTasks: result?.overdue_tasks || 0
      };
    } catch (error) {
      throw new Error(`Failed to get user stats: ${error}`);
    }
  }

  private transformToUser(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      avatar: row.avatar,
      role: row.role,
      isActive: Boolean(row.is_active),
      emailVerified: Boolean(row.email_verified),
      preferences: JSON.parse(row.preferences || '{}'),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();