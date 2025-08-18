// Project Service Implementation
// Handles business logic for project management

import { IProjectService, IProjectRepository, IProjectValidator } from '../interfaces';
import {
  Project,
  SearchFilters,
  SortOptions,
  PaginationOptions,
  ValidationResult
} from '../../data/types';
import { projectRepository } from '../../data/repositories';
import { ProjectValidator } from '../validators';

export class ProjectService implements IProjectService {
  private repository: IProjectRepository;
  private validator: IProjectValidator;

  constructor(
    repository: IProjectRepository = projectRepository,
    validator: IProjectValidator = new ProjectValidator()
  ) {
    this.repository = repository;
    this.validator = validator;
  }

  async getById(id: string): Promise<Project | null> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findById(id);
  }

  async getByUserId(
    userId: string,
    filters?: SearchFilters
  ): Promise<Project[]> {
    const validation = this.validator.validateId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByUserId(userId, filters);
  }

  async getAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<Project[]> {
    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    if (sort) {
      const validation = this.validator.validateSortOptions(sort);
      if (!validation.isValid) {
        throw new Error(`Invalid sort options: ${validation.errors.join(', ')}`);
      }
    }

    if (pagination) {
      const validation = this.validator.validatePaginationOptions(pagination);
      if (!validation.isValid) {
        throw new Error(`Invalid pagination options: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.findAll(filters, sort, pagination);
  }

  async create(
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    const validation = this.validator.validateCreate(projectData);
    if (!validation.isValid) {
      throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
    }

    // Business logic: Set default values
    const projectWithDefaults = {
      ...projectData,
      color: projectData.color || '#3B82F6',
      isArchived: projectData.isArchived || false,
      settings: projectData.settings || {
        allowPublicAccess: false,
        requireApprovalForTasks: false,
        enableTimeTracking: true,
        defaultTaskPriority: 'medium',
        autoArchiveCompletedTasks: false
      },
      statistics: projectData.statistics || {
        totalBoards: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        activeMembersCount: 1
      }
    };

    return await this.repository.create(projectWithDefaults);
  }

  async update(
    id: string,
    updates: Partial<Project>
  ): Promise<Project> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid project ID: ${idValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if project exists
    const existingProject = await this.repository.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Prevent certain updates on archived projects
    if (existingProject.isArchived && updates.name) {
      throw new Error('Cannot update name of archived project');
    }

    return await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    // Check if project exists
    const existingProject = await this.repository.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Archive instead of delete if project has data
    const stats = await this.repository.getStatistics(id);
    if (stats.totalBoards > 0 || stats.totalTasks > 0) {
      throw new Error('Cannot delete project with existing boards or tasks. Archive it instead.');
    }

    await this.repository.delete(id);
  }

  async archive(id: string): Promise<Project> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    // Check if project exists
    const existingProject = await this.repository.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    if (existingProject.isArchived) {
      throw new Error('Project is already archived');
    }

    return await this.repository.archive(id);
  }

  async restore(id: string): Promise<Project> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    // Check if project exists
    const existingProject = await this.repository.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    if (!existingProject.isArchived) {
      throw new Error('Project is not archived');
    }

    return await this.repository.restore(id);
  }

  async updatePosition(id: string, position: number): Promise<void> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid project ID: ${idValidation.errors.join(', ')}`);
    }

    if (position < 0) {
      throw new Error('Position must be non-negative');
    }

    await this.repository.updatePosition(id, position);
  }

  async getStatistics(id: string): Promise<Project['statistics']> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.getStatistics(id);
  }

  async getMembers(id: string): Promise<Project['members']> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.getMembers(id);
  }

  async addMember(
    projectId: string,
    member: Project['members'][0]
  ): Promise<void> {
    const idValidation = this.validator.validateId(projectId);
    if (!idValidation.isValid) {
      throw new Error(`Invalid project ID: ${idValidation.errors.join(', ')}`);
    }

    const memberValidation = this.validator.validateMember(member);
    if (!memberValidation.isValid) {
      throw new Error(`Invalid member data: ${memberValidation.errors.join(', ')}`);
    }

    // Check if project exists
    const existingProject = await this.repository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Check if user is already a member
    const existingMembers = await this.repository.getMembers(projectId);
    const isAlreadyMember = existingMembers.some(m => m.userId === member.userId);
    if (isAlreadyMember) {
      throw new Error('User is already a member of this project');
    }

    // Set default permissions based on role
    const memberWithDefaults = {
      ...member,
      permissions: member.permissions || this.getDefaultPermissions(member.role)
    };

    await this.repository.addMember(projectId, memberWithDefaults);
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const projectIdValidation = this.validator.validateId(projectId);
    if (!projectIdValidation.isValid) {
      throw new Error(`Invalid project ID: ${projectIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    // Check if project exists
    const existingProject = await this.repository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Cannot remove project owner
    if (existingProject.ownerId === userId) {
      throw new Error('Cannot remove project owner');
    }

    await this.repository.removeMember(projectId, userId);
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: Project['members'][0]['role']
  ): Promise<void> {
    const projectIdValidation = this.validator.validateId(projectId);
    if (!projectIdValidation.isValid) {
      throw new Error(`Invalid project ID: ${projectIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Check if project exists
    const existingProject = await this.repository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Cannot change owner role
    if (existingProject.ownerId === userId && role !== 'owner') {
      throw new Error('Cannot change project owner role');
    }

    await this.repository.updateMemberRole(projectId, userId, role);
  }

  async canUserAccess(projectId: string, userId: string): Promise<boolean> {
    const projectIdValidation = this.validator.validateId(projectId);
    if (!projectIdValidation.isValid) {
      return false;
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      return false;
    }

    try {
      const project = await this.repository.findById(projectId);
      if (!project) {
        return false;
      }

      // Owner always has access
      if (project.ownerId === userId) {
        return true;
      }

      // Check if user is a member
      const members = await this.repository.getMembers(projectId);
      return members.some(member => member.userId === userId);
    } catch {
      return false;
    }
  }

  async canUserEdit(projectId: string, userId: string): Promise<boolean> {
    const hasAccess = await this.canUserAccess(projectId, userId);
    if (!hasAccess) {
      return false;
    }

    try {
      const project = await this.repository.findById(projectId);
      if (!project) {
        return false;
      }

      // Owner always can edit
      if (project.ownerId === userId) {
        return true;
      }

      // Check member permissions
      const members = await this.repository.getMembers(projectId);
      const member = members.find(m => m.userId === userId);
      
      return member?.permissions?.canEditProject || false;
    } catch {
      return false;
    }
  }

  private getDefaultPermissions(role: string): Record<string, boolean> {
    switch (role) {
      case 'owner':
        return {
          canCreateBoards: true,
          canEditProject: true,
          canManageMembers: true,
          canDeleteProject: true,
          canArchiveProject: true
        };
      case 'admin':
        return {
          canCreateBoards: true,
          canEditProject: true,
          canManageMembers: true,
          canDeleteProject: false,
          canArchiveProject: true
        };
      case 'member':
        return {
          canCreateBoards: true,
          canEditProject: false,
          canManageMembers: false,
          canDeleteProject: false,
          canArchiveProject: false
        };
      case 'viewer':
        return {
          canCreateBoards: false,
          canEditProject: false,
          canManageMembers: false,
          canDeleteProject: false,
          canArchiveProject: false
        };
      default:
        return {
          canCreateBoards: false,
          canEditProject: false,
          canManageMembers: false,
          canDeleteProject: false,
          canArchiveProject: false
        };
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();