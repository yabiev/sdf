// Project Repository Implementation
// Handles all database operations for projects

import { IProjectRepository } from '../../business/interfaces';
import {
  Project,
  SearchFilters,
  SortOptions,
  PaginationOptions
} from '../types';
import { databaseAdapter } from '../adapters/database-adapter';
import { generateId } from '../../../lib/utils';

export class ProjectRepository implements IProjectRepository {
  private readonly tableName = 'projects';
  private readonly membersTableName = 'project_members';

  async findById(id: string): Promise<Project | null> {
    try {
      const sql = `
        SELECT p.*, 
               json_group_array(
                 json_object(
                   'userId', pm.user_id,
                   'role', pm.role,
                   'joinedAt', pm.joined_at,
                   'permissions', pm.permissions
                 )
               ) as members
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.id = ?
        GROUP BY p.id
      `;
      
      const row = await databaseAdapter.queryOne(sql, [id]);
      if (!row) return null;

      return this.transformToProject(row);
    } catch (error) {
      throw new Error(`Failed to find project by id: ${error}`);
    }
  }

  async findByUserId(userId: string, filters?: SearchFilters): Promise<Project[]> {
    try {
      let sql = `
        SELECT DISTINCT p.*, 
               json_group_array(
                 json_object(
                   'userId', pm.user_id,
                   'role', pm.role,
                   'joinedAt', pm.joined_at,
                   'permissions', pm.permissions
                 )
               ) as members
        FROM projects p
        INNER JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = ?
      `;
      
      const params: any[] = [userId];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND p.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToProject(row));
    } catch (error) {
      throw new Error(`Failed to find projects by user id: ${error}`);
    }
  }

  async findAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Project[]> {
    try {
      let sql = `
        SELECT p.*, 
               json_group_array(
                 json_object(
                   'userId', pm.user_id,
                   'role', pm.role,
                   'joinedAt', pm.joined_at,
                   'permissions', pm.permissions
                 )
               ) as members
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE 1=1
      `;
      
      const params: any[] = [];

      // Apply filters
      if (filters?.isArchived !== undefined) {
        sql += ' AND p.is_archived = ?';
        params.push(filters.isArchived ? 1 : 0);
      }

      if (filters?.query) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        const searchTerm = `%${filters.query}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ' GROUP BY p.id';

      // Apply sorting
      if (sort) {
        const direction = sort.direction.toUpperCase();
        switch (sort.field) {
          case 'name':
            sql += ` ORDER BY p.name ${direction}`;
            break;
          case 'createdAt':
            sql += ` ORDER BY p.created_at ${direction}`;
            break;
          case 'updatedAt':
            sql += ` ORDER BY p.updated_at ${direction}`;
            break;
          default:
            sql += ' ORDER BY p.created_at DESC';
        }
      } else {
        sql += ' ORDER BY p.created_at DESC';
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        sql += ' LIMIT ? OFFSET ?';
        params.push(pagination.limit, offset);
      }

      const rows = await databaseAdapter.query(sql, params);
      return rows.map(row => this.transformToProject(row));
    } catch (error) {
      throw new Error(`Failed to find all projects: ${error}`);
    }
  }

  async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      await databaseAdapter.beginTransaction();

      const id = generateId();
      const now = new Date();
      
      const projectData = {
        id,
        name: project.name,
        description: project.description || null,
        color: project.color || '#3B82F6',
        creator_id: project.ownerId,
        is_archived: project.isArchived ? 1 : 0,
        settings: JSON.stringify(project.settings || {}),
        statistics: JSON.stringify(project.statistics || {}),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.tableName, projectData);

      // Add owner as project member
      const memberData = {
        id: generateId(),
        project_id: id,
        user_id: project.ownerId,
        role: 'owner',
        permissions: JSON.stringify({
          canCreateBoards: true,
          canEditProject: true,
          canManageMembers: true,
          canDeleteProject: true,
          canArchiveProject: true
        }),
        joined_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      await databaseAdapter.insert(this.membersTableName, memberData);
      await databaseAdapter.commitTransaction();

      return await this.findById(id) as Project;
    } catch (error) {
      await databaseAdapter.rollbackTransaction();
      throw new Error(`Failed to create project: ${error}`);
    }
  }

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      const updateData: Record<string, any> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.isArchived !== undefined) updateData.is_archived = updates.isArchived ? 1 : 0;
      if (updates.settings !== undefined) updateData.settings = JSON.stringify(updates.settings);
      if (updates.statistics !== undefined) updateData.statistics = JSON.stringify(updates.statistics);

      await databaseAdapter.update(this.tableName, id, updateData);
      return await this.findById(id) as Project;
    } catch (error) {
      throw new Error(`Failed to update project: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databaseAdapter.delete(this.tableName, id);
    } catch (error) {
      throw new Error(`Failed to delete project: ${error}`);
    }
  }

  async archive(id: string): Promise<Project> {
    try {
      await databaseAdapter.update(this.tableName, id, { is_archived: 1 });
      return await this.findById(id) as Project;
    } catch (error) {
      throw new Error(`Failed to archive project: ${error}`);
    }
  }

  async restore(id: string): Promise<Project> {
    try {
      await databaseAdapter.update(this.tableName, id, { is_archived: 0 });
      return await this.findById(id) as Project;
    } catch (error) {
      throw new Error(`Failed to restore project: ${error}`);
    }
  }

  async updatePosition(id: string, position: number): Promise<void> {
    try {
      await databaseAdapter.update(this.tableName, id, { position });
    } catch (error) {
      throw new Error(`Failed to update project position: ${error}`);
    }
  }

  async getStatistics(id: string): Promise<Project['statistics']> {
    try {
      const sql = `
        SELECT 
          (SELECT COUNT(*) FROM boards WHERE project_id = ? AND is_archived = 0) as total_boards,
          (SELECT COUNT(*) FROM tasks WHERE project_id = ? AND is_archived = 0) as total_tasks,
          (SELECT COUNT(*) FROM tasks WHERE project_id = ? AND status = 'done' AND is_archived = 0) as completed_tasks,
          (SELECT COUNT(*) FROM tasks WHERE project_id = ? AND due_date < datetime('now') AND status != 'done' AND is_archived = 0) as overdue_tasks,
          (SELECT COUNT(DISTINCT pm.user_id) FROM project_members pm WHERE pm.project_id = ?) as active_members_count
      `;
      
      const result = await databaseAdapter.queryOne(sql, [id, id, id, id, id]);
      
      return {
        totalBoards: result?.total_boards || 0,
        totalTasks: result?.total_tasks || 0,
        completedTasks: result?.completed_tasks || 0,
        overdueTasks: result?.overdue_tasks || 0,
        activeMembersCount: result?.active_members_count || 0
      };
    } catch (error) {
      throw new Error(`Failed to get project statistics: ${error}`);
    }
  }

  async getMembers(id: string): Promise<Project['members']> {
    try {
      const sql = `
        SELECT pm.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
        FROM project_members pm
        INNER JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ?
        ORDER BY pm.joined_at ASC
      `;
      
      const rows = await databaseAdapter.query(sql, [id]);
      
      return rows.map(row => ({
        userId: row.user_id,
        role: row.role,
        joinedAt: new Date(row.joined_at),
        permissions: JSON.parse(row.permissions || '{}')
      }));
    } catch (error) {
      throw new Error(`Failed to get project members: ${error}`);
    }
  }

  async addMember(projectId: string, member: Project['members'][0]): Promise<void> {
    try {
      const memberData = {
        id: generateId(),
        project_id: projectId,
        user_id: member.userId,
        role: member.role,
        permissions: JSON.stringify(member.permissions),
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await databaseAdapter.insert(this.membersTableName, memberData);
    } catch (error) {
      throw new Error(`Failed to add project member: ${error}`);
    }
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    try {
      const sql = 'DELETE FROM project_members WHERE project_id = ? AND user_id = ?';
      await databaseAdapter.query(sql, [projectId, userId]);
    } catch (error) {
      throw new Error(`Failed to remove project member: ${error}`);
    }
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: Project['members'][0]['role']
  ): Promise<void> {
    try {
      const sql = 'UPDATE project_members SET role = ?, updated_at = datetime(\'now\') WHERE project_id = ? AND user_id = ?';
      await databaseAdapter.query(sql, [role, projectId, userId]);
    } catch (error) {
      throw new Error(`Failed to update member role: ${error}`);
    }
  }

  private transformToProject(row: any): Project {
    const members = row.members ? JSON.parse(row.members) : [];
    
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      ownerId: row.creator_id,
      isArchived: Boolean(row.is_archived),
      settings: JSON.parse(row.settings || '{}'),
      members: members.filter((m: any) => m.userId).map((m: any) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: new Date(m.joinedAt),
        permissions: JSON.parse(m.permissions || '{}')
      })),
      statistics: JSON.parse(row.statistics || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

// Export singleton instance
export const projectRepository = new ProjectRepository();