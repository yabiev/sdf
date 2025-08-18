// Unified Validators for Refactored Architecture
// These validators provide consistent validation across all entities

import {
  ValidationResult,
  ValidationError,
  Project,
  Board,
  Task,
  User,
  Column,
  TaskDependency,
  Comment,
  Attachment,
  TaskPriority,
  TaskStatus
} from '../../data/types';
import {
  IProjectValidator,
  IBoardValidator,
  ITaskValidator,
  IUserValidator
} from '../interfaces';

// Base Validator Class
abstract class BaseValidator {
  protected createValidationResult(errors: ValidationError[] = []): ValidationResult {
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected addError(errors: ValidationError[], field: string, message: string, code: string): void {
    errors.push({ field, message, code });
  }

  protected validateRequired(value: any, field: string, errors: ValidationError[]): void {
    if (value === undefined || value === null || value === '') {
      this.addError(errors, field, `${field} is required`, 'REQUIRED');
    }
  }

  protected validateString(value: any, field: string, minLength = 0, maxLength = Infinity, errors: ValidationError[]): void {
    if (typeof value !== 'string') {
      this.addError(errors, field, `${field} must be a string`, 'INVALID_TYPE');
      return;
    }

    if (value.length < minLength) {
      this.addError(errors, field, `${field} must be at least ${minLength} characters long`, 'MIN_LENGTH');
    }

    if (value.length > maxLength) {
      this.addError(errors, field, `${field} must be no more than ${maxLength} characters long`, 'MAX_LENGTH');
    }
  }

  protected validateEmail(email: string, field: string, errors: ValidationError[]): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.addError(errors, field, 'Invalid email format', 'INVALID_EMAIL');
    }
  }

  protected validateUrl(url: string, field: string, errors: ValidationError[]): void {
    try {
      new URL(url);
    } catch {
      this.addError(errors, field, 'Invalid URL format', 'INVALID_URL');
    }
  }

  protected validateDate(date: any, field: string, errors: ValidationError[]): void {
    if (!(date instanceof Date) && typeof date !== 'string') {
      this.addError(errors, field, `${field} must be a valid date`, 'INVALID_DATE');
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      this.addError(errors, field, `${field} must be a valid date`, 'INVALID_DATE');
    }
  }

  protected validateNumber(value: any, field: string, min = -Infinity, max = Infinity, errors: ValidationError[]): void {
    if (typeof value !== 'number' || isNaN(value)) {
      this.addError(errors, field, `${field} must be a valid number`, 'INVALID_NUMBER');
      return;
    }

    if (value < min) {
      this.addError(errors, field, `${field} must be at least ${min}`, 'MIN_VALUE');
    }

    if (value > max) {
      this.addError(errors, field, `${field} must be no more than ${max}`, 'MAX_VALUE');
    }
  }

  protected validateEnum<T>(value: any, field: string, allowedValues: T[], errors: ValidationError[]): void {
    if (!allowedValues.includes(value)) {
      this.addError(errors, field, `${field} must be one of: ${allowedValues.join(', ')}`, 'INVALID_ENUM');
    }
  }

  protected validateArray(value: any, field: string, minLength = 0, maxLength = Infinity, errors: ValidationError[]): void {
    if (!Array.isArray(value)) {
      this.addError(errors, field, `${field} must be an array`, 'INVALID_TYPE');
      return;
    }

    if (value.length < minLength) {
      this.addError(errors, field, `${field} must have at least ${minLength} items`, 'MIN_ITEMS');
    }

    if (value.length > maxLength) {
      this.addError(errors, field, `${field} must have no more than ${maxLength} items`, 'MAX_ITEMS');
    }
  }

  protected validateUuid(value: string, field: string, errors: ValidationError[]): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      this.addError(errors, field, `${field} must be a valid UUID`, 'INVALID_UUID');
    }
  }
}

// Project Validator
export class ProjectValidator extends BaseValidator implements IProjectValidator {
  validateCreate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    this.validateRequired(data.name, 'name', errors);
    this.validateRequired(data.ownerId, 'ownerId', errors);

    // String validations
    if (data.name !== undefined) {
      this.validateString(data.name, 'name', 1, 100, errors);
    }

    if (data.description !== undefined && data.description !== null) {
      this.validateString(data.description, 'description', 0, 1000, errors);
    }

    if (data.color !== undefined) {
      this.validateString(data.color, 'color', 3, 7, errors);
      // Validate hex color format
      if (typeof data.color === 'string' && !/^#[0-9A-F]{6}$/i.test(data.color)) {
        this.addError(errors, 'color', 'Color must be a valid hex color (e.g., #FF0000)', 'INVALID_COLOR');
      }
    }

    // UUID validation
    if (data.ownerId !== undefined) {
      this.validateUuid(data.ownerId, 'ownerId', errors);
    }

    // Settings validation
    if (data.settings) {
      this.validateProjectSettings(data.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Optional string validations
    if (data.name !== undefined) {
      this.validateString(data.name, 'name', 1, 100, errors);
    }

    if (data.description !== undefined && data.description !== null) {
      this.validateString(data.description, 'description', 0, 1000, errors);
    }

    if (data.color !== undefined) {
      this.validateString(data.color, 'color', 3, 7, errors);
      if (typeof data.color === 'string' && !/^#[0-9A-F]{6}$/i.test(data.color)) {
        this.addError(errors, 'color', 'Color must be a valid hex color (e.g., #FF0000)', 'INVALID_COLOR');
      }
    }

    if (data.settings) {
      this.validateProjectSettings(data.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateMember(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(data.userId, 'userId', errors);
    this.validateRequired(data.role, 'role', errors);

    if (data.userId !== undefined) {
      this.validateUuid(data.userId, 'userId', errors);
    }

    if (data.role !== undefined) {
      this.validateEnum(data.role, 'role', ['owner', 'admin', 'member', 'viewer'], errors);
    }

    return this.createValidationResult(errors);
  }

  private validateProjectSettings(settings: any, errors: ValidationError[]): void {
    if (typeof settings !== 'object' || settings === null) {
      this.addError(errors, 'settings', 'Settings must be an object', 'INVALID_TYPE');
      return;
    }

    if (settings.defaultTaskPriority !== undefined) {
      this.validateEnum(settings.defaultTaskPriority, 'settings.defaultTaskPriority', ['low', 'medium', 'high', 'urgent'], errors);
    }
  }
}

// Board Validator
export class BoardValidator extends BaseValidator implements IBoardValidator {
  validateCreate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    this.validateRequired(data.name, 'name', errors);
    this.validateRequired(data.projectId, 'projectId', errors);

    // String validations
    if (data.name !== undefined) {
      this.validateString(data.name, 'name', 1, 100, errors);
    }

    if (data.description !== undefined && data.description !== null) {
      this.validateString(data.description, 'description', 0, 1000, errors);
    }

    // UUID validation
    if (data.projectId !== undefined) {
      this.validateUuid(data.projectId, 'projectId', errors);
    }

    // Number validation
    if (data.position !== undefined) {
      this.validateNumber(data.position, 'position', 0, undefined, errors);
    }

    // Settings validation
    if (data.settings) {
      this.validateBoardSettings(data.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Optional validations
    if (data.name !== undefined) {
      this.validateString(data.name, 'name', 1, 100, errors);
    }

    if (data.description !== undefined && data.description !== null) {
      this.validateString(data.description, 'description', 0, 1000, errors);
    }

    if (data.position !== undefined) {
      this.validateNumber(data.position, 'position', 0, undefined, errors);
    }

    if (data.settings) {
      this.validateBoardSettings(data.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateColumn(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    this.validateRequired(data.name, 'name', errors);
    this.validateRequired(data.boardId, 'boardId', errors);

    // String validations
    if (data.name !== undefined) {
      this.validateString(data.name, 'name', 1, 50, errors);
    }

    // UUID validation
    if (data.boardId !== undefined) {
      this.validateUuid(data.boardId, 'boardId', errors);
    }

    // Number validations
    if (data.position !== undefined) {
      this.validateNumber(data.position, 'position', 0, undefined, errors);
    }

    if (data.wipLimit !== undefined && data.wipLimit !== null) {
      this.validateNumber(data.wipLimit, 'wipLimit', 1, 100, errors);
    }

    // Color validation
    if (data.color !== undefined && data.color !== null) {
      this.validateString(data.color, 'color', 3, 7, errors);
      if (typeof data.color === 'string' && !/^#[0-9A-F]{6}$/i.test(data.color)) {
        this.addError(errors, 'color', 'Color must be a valid hex color (e.g., #FF0000)', 'INVALID_COLOR');
      }
    }

    return this.createValidationResult(errors);
  }

  private validateBoardSettings(settings: any, errors: ValidationError[]): void {
    if (typeof settings !== 'object' || settings === null) {
      this.addError(errors, 'settings', 'Settings must be an object', 'INVALID_TYPE');
      return;
    }

    if (settings.defaultColumnId !== undefined && settings.defaultColumnId !== null) {
      this.validateUuid(settings.defaultColumnId, 'settings.defaultColumnId', errors);
    }
  }

  // Static methods for compatibility with existing components
  static validateName(name: string): ValidationResult {
    const validator = new BoardValidator();
    const errors: ValidationError[] = [];
    validator.validateString(name, 'name', 1, 100, errors);
    return validator.createValidationResult(errors);
  }

  static validateDescription(description: string): ValidationResult {
    const validator = new BoardValidator();
    const errors: ValidationError[] = [];
    if (description) {
      validator.validateString(description, 'description', 0, 1000, errors);
    }
    return validator.createValidationResult(errors);
  }

  static validateProjectId(projectId: string): ValidationResult {
    const validator = new BoardValidator();
    const errors: ValidationError[] = [];
    validator.validateUuid(projectId, 'projectId', errors);
    return validator.createValidationResult(errors);
  }
}

// Task Validator
export class TaskValidator extends BaseValidator implements ITaskValidator {
  validateCreate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    this.validateRequired(data.title, 'title', errors);
    this.validateRequired(data.columnId, 'columnId', errors);
    this.validateRequired(data.boardId, 'boardId', errors);
    this.validateRequired(data.projectId, 'projectId', errors);
    this.validateRequired(data.reporterId, 'reporterId', errors);
    this.validateRequired(data.status, 'status', errors);
    this.validateRequired(data.priority, 'priority', errors);

    // String validations
    if (data.title !== undefined) {
      this.validateString(data.title, 'title', 1, 200, errors);
    }

    if (data.description !== undefined && data.description !== null) {
      this.validateString(data.description, 'description', 0, 5000, errors);
    }

    // UUID validations
    if (data.columnId !== undefined) {
      this.validateUuid(data.columnId, 'columnId', errors);
    }

    if (data.boardId !== undefined) {
      this.validateUuid(data.boardId, 'boardId', errors);
    }

    if (data.projectId !== undefined) {
      this.validateUuid(data.projectId, 'projectId', errors);
    }

    if (data.reporterId !== undefined) {
      this.validateUuid(data.reporterId, 'reporterId', errors);
    }

    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      this.validateUuid(data.assigneeId, 'assigneeId', errors);
    }

    // Enum validations
    if (data.status !== undefined) {
      this.validateEnum(data.status, 'status', ['todo', 'in_progress', 'review', 'done', 'blocked'], errors);
    }

    if (data.priority !== undefined) {
      this.validateEnum(data.priority, 'priority', ['low', 'medium', 'high', 'urgent'], errors);
    }

    // Number validations
    if (data.position !== undefined) {
      this.validateNumber(data.position, 'position', 0, undefined, errors);
    }

    if (data.estimatedHours !== undefined && data.estimatedHours !== null) {
      this.validateNumber(data.estimatedHours, 'estimatedHours', 0, 1000, errors);
    }

    if (data.actualHours !== undefined && data.actualHours !== null) {
      this.validateNumber(data.actualHours, 'actualHours', 0, 1000, errors);
    }

    // Date validations
    if (data.dueDate !== undefined && data.dueDate !== null) {
      this.validateDate(data.dueDate, 'dueDate', errors);
    }

    // Array validations
    if (data.tags !== undefined) {
      this.validateArray(data.tags, 'tags', 0, 20, errors);
      if (Array.isArray(data.tags)) {
        data.tags.forEach((tag: any, index: number) => {
          this.validateString(tag, `tags[${index}]`, 1, 50, errors);
        });
      }
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Optional validations
    if (data.title !== undefined) {
      this.validateString(data.title, 'title', 1, 200, errors);
    }

    if (data.description !== undefined && data.description !== null) {
      this.validateString(data.description, 'description', 0, 5000, errors);
    }

    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      this.validateUuid(data.assigneeId, 'assigneeId', errors);
    }

    if (data.status !== undefined) {
      this.validateEnum(data.status, 'status', ['todo', 'in_progress', 'review', 'done', 'blocked'], errors);
    }

    if (data.priority !== undefined) {
      this.validateEnum(data.priority, 'priority', ['low', 'medium', 'high', 'urgent'], errors);
    }

    if (data.position !== undefined) {
      this.validateNumber(data.position, 'position', 0, undefined, errors);
    }

    if (data.estimatedHours !== undefined && data.estimatedHours !== null) {
      this.validateNumber(data.estimatedHours, 'estimatedHours', 0, 1000, errors);
    }

    if (data.actualHours !== undefined && data.actualHours !== null) {
      this.validateNumber(data.actualHours, 'actualHours', 0, 1000, errors);
    }

    if (data.dueDate !== undefined && data.dueDate !== null) {
      this.validateDate(data.dueDate, 'dueDate', errors);
    }

    if (data.tags !== undefined) {
      this.validateArray(data.tags, 'tags', 0, 20, errors);
      if (Array.isArray(data.tags)) {
        data.tags.forEach((tag: any, index: number) => {
          this.validateString(tag, `tags[${index}]`, 1, 50, errors);
        });
      }
    }

    return this.createValidationResult(errors);
  }

  validateMove(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(data.taskId, 'taskId', errors);
    this.validateRequired(data.columnId, 'columnId', errors);
    this.validateRequired(data.position, 'position', errors);

    if (data.taskId !== undefined) {
      this.validateUuid(data.taskId, 'taskId', errors);
    }

    if (data.columnId !== undefined) {
      this.validateUuid(data.columnId, 'columnId', errors);
    }

    if (data.position !== undefined) {
      this.validateNumber(data.position, 'position', 0, undefined, errors);
    }

    return this.createValidationResult(errors);
  }

  validateDependency(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(data.taskId, 'taskId', errors);
    this.validateRequired(data.dependsOnTaskId, 'dependsOnTaskId', errors);
    this.validateRequired(data.type, 'type', errors);

    if (data.taskId !== undefined) {
      this.validateUuid(data.taskId, 'taskId', errors);
    }

    if (data.dependsOnTaskId !== undefined) {
      this.validateUuid(data.dependsOnTaskId, 'dependsOnTaskId', errors);
    }

    if (data.type !== undefined) {
      this.validateEnum(data.type, 'type', ['blocks', 'blocked_by', 'relates_to', 'duplicates'], errors);
    }

    // Prevent self-dependency
    if (data.taskId === data.dependsOnTaskId) {
      this.addError(errors, 'dependsOnTaskId', 'Task cannot depend on itself', 'SELF_DEPENDENCY');
    }

    return this.createValidationResult(errors);
  }

  validateComment(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(data.content, 'content', errors);
    this.validateRequired(data.taskId, 'taskId', errors);
    this.validateRequired(data.authorId, 'authorId', errors);

    if (data.content !== undefined) {
      this.validateString(data.content, 'content', 1, 2000, errors);
    }

    if (data.taskId !== undefined) {
      this.validateUuid(data.taskId, 'taskId', errors);
    }

    if (data.authorId !== undefined) {
      this.validateUuid(data.authorId, 'authorId', errors);
    }

    if (data.parentCommentId !== undefined && data.parentCommentId !== null) {
      this.validateUuid(data.parentCommentId, 'parentCommentId', errors);
    }

    return this.createValidationResult(errors);
  }

  validateAttachment(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(data.fileName, 'fileName', errors);
    this.validateRequired(data.fileSize, 'fileSize', errors);
    this.validateRequired(data.mimeType, 'mimeType', errors);
    this.validateRequired(data.url, 'url', errors);

    if (data.fileName !== undefined) {
      this.validateString(data.fileName, 'fileName', 1, 255, errors);
    }

    if (data.fileSize !== undefined) {
      this.validateNumber(data.fileSize, 'fileSize', 1, 100 * 1024 * 1024, errors); // Max 100MB
    }

    if (data.mimeType !== undefined) {
      this.validateString(data.mimeType, 'mimeType', 1, 100, errors);
    }

    if (data.url !== undefined) {
      this.validateString(data.url, 'url', 1, 500, errors);
      this.validateUrl(data.url, 'url', errors);
    }

    return this.createValidationResult(errors);
  }

  // Static methods for compatibility with existing components
  static validateTitle(title: string): ValidationResult {
    const validator = new TaskValidator();
    const errors: ValidationError[] = [];
    validator.validateString(title, 'title', 1, 200, errors);
    return validator.createValidationResult(errors);
  }

  static validateDescription(description: string): ValidationResult {
    const validator = new TaskValidator();
    const errors: ValidationError[] = [];
    if (description) {
      validator.validateString(description, 'description', 0, 5000, errors);
    }
    return validator.createValidationResult(errors);
  }

  static validateDueDate(dueDate: Date | string): ValidationResult {
    const validator = new TaskValidator();
    const errors: ValidationError[] = [];
    validator.validateDate(dueDate, 'dueDate', errors);
    return validator.createValidationResult(errors);
  }
}

// User Validator
export class UserValidator extends BaseValidator implements IUserValidator {
  validateCreate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Required fields
    this.validateRequired(data.email, 'email', errors);
    this.validateRequired(data.name, 'name', errors);

    // String validations
    if (data.email !== undefined) {
      this.validateString(data.email, 'email', 1, 255, errors);
      this.validateEmail(data.email, 'email', errors);
    }

    if (data.name !== undefined) {
      this.validateString(data.name, 'name', 1, 100, errors);
    }

    if (data.avatar !== undefined && data.avatar !== null) {
      this.validateString(data.avatar, 'avatar', 1, 500, errors);
      this.validateUrl(data.avatar, 'avatar', errors);
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Optional validations
    if (data.email !== undefined) {
      this.validateString(data.email, 'email', 1, 255, errors);
      this.validateEmail(data.email, 'email', errors);
    }

    if (data.name !== undefined) {
      this.validateString(data.name, 'name', 1, 100, errors);
    }

    if (data.avatar !== undefined && data.avatar !== null) {
      this.validateString(data.avatar, 'avatar', 1, 500, errors);
      this.validateUrl(data.avatar, 'avatar', errors);
    }

    return this.createValidationResult(errors);
  }

  validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(email, 'email', errors);
    if (email !== undefined) {
      this.validateString(email, 'email', 1, 255, errors);
      super.validateEmail(email, 'email', errors);
    }

    return this.createValidationResult(errors);
  }

  validatePassword(password: string): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(password, 'password', errors);
    if (password !== undefined) {
      this.validateString(password, 'password', 8, 128, errors);

      // Password complexity validation
      if (typeof password === 'string') {
        if (!/[a-z]/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one lowercase letter', 'PASSWORD_LOWERCASE');
        }
        if (!/[A-Z]/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one uppercase letter', 'PASSWORD_UPPERCASE');
        }
        if (!/\d/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one number', 'PASSWORD_NUMBER');
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one special character', 'PASSWORD_SPECIAL');
        }
      }
    }

    return this.createValidationResult(errors);
  }
}

// Export validator instances
export const projectValidator = new ProjectValidator();
export const boardValidator = new BoardValidator();
export const taskValidator = new TaskValidator();
export const userValidator = new UserValidator();

// Export validation helper functions
export function validateId(id: string): ValidationResult {
  const errors: ValidationError[] = [];
  const validator = new BaseValidator();
  
  validator['validateRequired'](id, 'id', errors);
  if (id !== undefined) {
    validator['validateUuid'](id, 'id', errors);
  }
  
  return validator['createValidationResult'](errors);
}

export function validatePagination(page?: number, limit?: number): ValidationResult {
  const errors: ValidationError[] = [];
  const validator = new BaseValidator();
  
  if (page !== undefined) {
    validator['validateNumber'](page, 'page', 1, 1000, errors);
  }
  
  if (limit !== undefined) {
    validator['validateNumber'](limit, 'limit', 1, 100, errors);
  }
  
  return validator['createValidationResult'](errors);
}

export function validateSearchQuery(query?: string): ValidationResult {
  const errors: ValidationError[] = [];
  const validator = new BaseValidator();
  
  if (query !== undefined && query !== null && query !== '') {
    validator['validateString'](query, 'query', 1, 500, errors);
  }
  
  return validator['createValidationResult'](errors);
}