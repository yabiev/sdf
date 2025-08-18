// User Service Implementation
// Handles business logic for user management

import { IUserService, IUserRepository, IUserValidator } from '../interfaces';
import {
  User,
  SearchFilters,
  SortOptions,
  PaginationOptions,
  ValidationResult
} from '../../data/types';
import { userRepository } from '../../data/repositories';
import { UserValidator } from '../validators';

export class UserService implements IUserService {
  private repository: IUserRepository;
  private validator: IUserValidator;

  constructor(
    repository: IUserRepository = userRepository,
    validator: IUserValidator = new UserValidator()
  ) {
    this.repository = repository;
    this.validator = validator;
  }

  async getById(id: string): Promise<User | null> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findById(id);
  }

  async getByEmail(email: string): Promise<User | null> {
    const validation = this.validator.validateEmail(email);
    if (!validation.isValid) {
      throw new Error(`Invalid email: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByEmail(email);
  }

  async getAll(
    filters?: SearchFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<User[]> {
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
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> {
    const validation = this.validator.validateCreate(userData);
    if (!validation.isValid) {
      throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
    }

    // Business logic: Check if email already exists
    const existingUser = await this.repository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Business logic: Set default values
    const userWithDefaults = {
      ...userData,
      role: userData.role || 'user',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      isEmailVerified: userData.isEmailVerified || false,
      preferences: userData.preferences || {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        emailNotifications: true,
        pushNotifications: true,
        weekStartsOn: 1,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h'
      },
      profile: userData.profile || {
        bio: '',
        location: '',
        website: '',
        company: '',
        jobTitle: '',
        skills: [],
        socialLinks: {}
      }
    };

    // Business logic: Hash password (in real implementation)
    // userWithDefaults.password = await this.hashPassword(userWithDefaults.password);

    return await this.repository.create(userWithDefaults);
  }

  async update(
    id: string,
    updates: Partial<User>
  ): Promise<User> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid user ID: ${idValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Business logic: Check email uniqueness if email is being updated
    if (updates.email && updates.email !== existingUser.email) {
      const userWithEmail = await this.repository.findByEmail(updates.email);
      if (userWithEmail) {
        throw new Error('User with this email already exists');
      }
      // Reset email verification if email changes
      updates.isEmailVerified = false;
    }

    // Business logic: Prevent certain updates on inactive users
    if (!existingUser.isActive && updates.role) {
      throw new Error('Cannot update role of inactive user');
    }

    // Business logic: Hash password if being updated
    if (updates.password) {
      // updates.password = await this.hashPassword(updates.password);
    }

    return await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Business logic: Check if user owns any projects
    const userStats = await this.repository.getUserStats(id);
    if (userStats.projectsOwned > 0) {
      throw new Error('Cannot delete user who owns projects. Transfer ownership first.');
    }

    // Business logic: Deactivate instead of delete if user has activity
    if (userStats.tasksAssigned > 0 || userStats.projectsJoined > 0) {
      await this.deactivate(id);
      return;
    }

    await this.repository.delete(id);
  }

  async activate(id: string): Promise<User> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.isActive) {
      throw new Error('User is already active');
    }

    return await this.repository.activate(id);
  }

  async deactivate(id: string): Promise<User> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (!existingUser.isActive) {
      throw new Error('User is already inactive');
    }

    return await this.repository.deactivate(id);
  }

  async updateLastLogin(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists and is active
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (!existingUser.isActive) {
      throw new Error('Cannot update last login for inactive user');
    }

    await this.repository.updateLastLogin(id);
  }

  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (!existingUser.isActive) {
      throw new Error('Cannot update password for inactive user');
    }

    // Business logic: Verify current password
    // const isCurrentPasswordValid = await this.verifyPassword(currentPassword, existingUser.password);
    // if (!isCurrentPasswordValid) {
    //   throw new Error('Current password is incorrect');
    // }

    // Business logic: Hash new password
    // const hashedNewPassword = await this.hashPassword(newPassword);

    await this.repository.updatePassword(id, newPassword); // In real implementation, pass hashedNewPassword
  }

  async updatePreferences(
    id: string,
    preferences: Partial<User['preferences']>
  ): Promise<User> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Business logic: Validate preferences
    if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
      throw new Error('Invalid theme preference');
    }

    if (preferences.weekStartsOn && (preferences.weekStartsOn < 0 || preferences.weekStartsOn > 6)) {
      throw new Error('Week starts on must be between 0 (Sunday) and 6 (Saturday)');
    }

    if (preferences.dateFormat && !['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(preferences.dateFormat)) {
      throw new Error('Invalid date format preference');
    }

    if (preferences.timeFormat && !['12h', '24h'].includes(preferences.timeFormat)) {
      throw new Error('Invalid time format preference');
    }

    return await this.repository.updatePreferences(id, preferences);
  }

  async verifyEmail(id: string): Promise<User> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.isEmailVerified) {
      throw new Error('Email is already verified');
    }

    return await this.repository.verifyEmail(id);
  }

  async createSession(
    userId: string,
    sessionData: {
      token: string;
      expiresAt: Date;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<any> {
    const validation = this.validator.validateId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    if (!sessionData.token || !sessionData.expiresAt) {
      throw new Error('Session token and expiration date are required');
    }

    // Check if user exists and is active
    const existingUser = await this.repository.findById(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (!existingUser.isActive) {
      throw new Error('Cannot create session for inactive user');
    }

    return await this.repository.createSession(userId, sessionData);
  }

  async findSession(token: string): Promise<any> {
    if (!token) {
      throw new Error('Session token is required');
    }

    return await this.repository.findSession(token);
  }

  async deleteSession(token: string): Promise<void> {
    if (!token) {
      throw new Error('Session token is required');
    }

    await this.repository.deleteSession(token);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const validation = this.validator.validateId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    await this.repository.deleteAllUserSessions(userId);
  }

  async cleanupExpiredSessions(): Promise<void> {
    await this.repository.cleanupExpiredSessions();
  }

  async getUserStats(id: string): Promise<{
    projectsOwned: number;
    projectsJoined: number;
    tasksAssigned: number;
    tasksCompleted: number;
  }> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.getUserStats(id);
  }

  async search(
    query: string,
    filters?: SearchFilters
  ): Promise<User[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.search(query, filters);
  }

  async authenticate(
    email: string,
    password: string
  ): Promise<User | null> {
    const emailValidation = this.validator.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
    }

    if (!password) {
      throw new Error('Password is required');
    }

    // Find user by email
    const user = await this.repository.findByEmail(email);
    if (!user) {
      return null; // Don't reveal if user exists
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Business logic: Verify password
    // const isPasswordValid = await this.verifyPassword(password, user.password);
    // if (!isPasswordValid) {
    //   return null;
    // }

    // Update last login
    await this.updateLastLogin(user.id);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async canUserAccess(targetUserId: string, currentUserId: string): Promise<boolean> {
    const targetUserValidation = this.validator.validateId(targetUserId);
    if (!targetUserValidation.isValid) {
      return false;
    }

    const currentUserValidation = this.validator.validateId(currentUserId);
    if (!currentUserValidation.isValid) {
      return false;
    }

    try {
      // Users can always access their own profile
      if (targetUserId === currentUserId) {
        return true;
      }

      // Check if current user exists and is active
      const currentUser = await this.repository.findById(currentUserId);
      if (!currentUser || !currentUser.isActive) {
        return false;
      }

      // Admins can access all users
      if (currentUser.role === 'admin') {
        return true;
      }

      // Check if target user exists and is active
      const targetUser = await this.repository.findById(targetUserId);
      if (!targetUser || !targetUser.isActive) {
        return false;
      }

      // Regular users can access other active users (for collaboration)
      return true;
    } catch {
      return false;
    }
  }

  async canUserEdit(targetUserId: string, currentUserId: string): Promise<boolean> {
    const targetUserValidation = this.validator.validateId(targetUserId);
    if (!targetUserValidation.isValid) {
      return false;
    }

    const currentUserValidation = this.validator.validateId(currentUserId);
    if (!currentUserValidation.isValid) {
      return false;
    }

    try {
      // Users can edit their own profile
      if (targetUserId === currentUserId) {
        return true;
      }

      // Check if current user exists and is active
      const currentUser = await this.repository.findById(currentUserId);
      if (!currentUser || !currentUser.isActive) {
        return false;
      }

      // Only admins can edit other users
      return currentUser.role === 'admin';
    } catch {
      return false;
    }
  }

  // Private helper methods (would be implemented in real application)
  // private async hashPassword(password: string): Promise<string> {
  //   // Implementation using bcrypt or similar
  //   return password; // Placeholder
  // }

  // private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  //   // Implementation using bcrypt or similar
  //   return password === hashedPassword; // Placeholder
  // }
}

// Export singleton instance
export const userService = new UserService();