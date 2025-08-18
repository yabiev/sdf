// Unified Data Types for Refactored Architecture
// This file consolidates all data types to eliminate duplication

// Base Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  telegram: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  taskOverdue: boolean;
  projectUpdates: boolean;
}

// Project Types
export interface Project extends BaseEntity {
  name: string;
  description?: string;
  color: string;
  ownerId: string;
  isArchived: boolean;
  settings: ProjectSettings;
  members: ProjectMember[];
  statistics: ProjectStatistics;
}

export interface ProjectSettings {
  isPublic: boolean;
  allowGuestAccess: boolean;
  defaultTaskPriority: TaskPriority;
  autoArchiveCompletedTasks: boolean;
  enableTimeTracking: boolean;
  enableDependencies: boolean;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  joinedAt: Date;
  permissions: ProjectPermissions;
}

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface ProjectPermissions {
  canCreateBoards: boolean;
  canEditProject: boolean;
  canManageMembers: boolean;
  canDeleteProject: boolean;
  canArchiveProject: boolean;
}

export interface ProjectStatistics {
  totalBoards: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeMembersCount: number;
}

// Board Types
export interface Board extends BaseEntity {
  name: string;
  description?: string;
  projectId: string;
  position: number;
  isArchived: boolean;
  settings: BoardSettings;
  columns: Column[];
  statistics: BoardStatistics;
}

export interface BoardSettings {
  allowTaskCreation: boolean;
  autoMoveCompletedTasks: boolean;
  enableWipLimits: boolean;
  defaultColumnId?: string;
}

export interface Column extends BaseEntity {
  name: string;
  boardId: string;
  position: number;
  color?: string;
  wipLimit?: number;
  isCollapsed: boolean;
  settings: ColumnSettings;
}

export interface ColumnSettings {
  autoAssignUsers: string[];
  defaultTaskPriority: TaskPriority;
  allowTaskDrop: boolean;
  hideCompletedTasks: boolean;
}

export interface BoardStatistics {
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  averageCompletionTime: number;
}

// Task Types
export interface Task extends BaseEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  columnId: string;
  boardId: string;
  projectId: string;
  position: number;
  assigneeId?: string;
  reporterId: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  isArchived: boolean;
  metadata: TaskMetadata;
  dependencies: TaskDependency[];
  attachments: Attachment[];
  comments: Comment[];
  timeEntries: TimeEntry[];
  history: TaskAction[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskMetadata {
  complexity: number; // 1-10
  businessValue: number; // 1-10
  technicalDebt: boolean;
  blockedReason?: string;
  completedAt?: Date;
  archivedAt?: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
  createdAt: Date;
  createdBy: string;
}

export type DependencyType = 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates';

export interface Attachment extends BaseEntity {
  taskId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
}

export interface Comment extends BaseEntity {
  taskId: string;
  content: string;
  authorId: string;
  parentCommentId?: string;
  isEdited: boolean;
  editedAt?: Date;
}

export interface TimeEntry extends BaseEntity {
  taskId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  description?: string;
  isActive: boolean;
}

export interface TaskAction extends BaseEntity {
  taskId: string;
  userId: string;
  action: TaskActionType;
  oldValue?: any;
  newValue?: any;
  description: string;
}

export type TaskActionType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'assigned'
  | 'unassigned'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'archived'
  | 'restored'
  | 'comment_added'
  | 'attachment_added'
  | 'dependency_added'
  | 'dependency_removed';

// Session and Authentication Types
export interface Session extends BaseEntity {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
  lastActivityAt: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
  permissions: GlobalPermissions;
}

export interface GlobalPermissions {
  canCreateProjects: boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  canExportData: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Event Types for Real-time Updates
export interface SystemEvent {
  id: string;
  type: EventType;
  entityType: EntityType;
  entityId: string;
  userId: string;
  timestamp: Date;
  data: Record<string, any>;
}

export type EventType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'moved'
  | 'assigned';

export type EntityType = 'project' | 'board' | 'column' | 'task' | 'user';

// Drag and Drop Types
export interface DragEndEvent {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  };
  reason: 'DROP' | 'CANCEL';
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  projectIds?: string[];
  boardIds?: string[];
  assigneeIds?: string[];
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
  isArchived?: boolean;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Cache Types
export interface CacheEntry<T = any> {
  key: string;
  data: T;
  expiresAt: Date;
  tags: string[];
}

// Configuration Types
export interface AppConfig {
  database: DatabaseConfig;
  auth: AuthConfig;
  cache: CacheConfig;
  notifications: NotificationConfig;
  features: FeatureFlags;
}

export interface DatabaseConfig {
  type: 'postgresql';
  url: string;
  poolSize: number;
  timeout: number;
}

export interface AuthConfig {
  sessionDuration: number;
  passwordMinLength: number;
  requireEmailVerification: boolean;
  allowRegistration: boolean;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

export interface NotificationConfig {
  email: EmailConfig;
  telegram: TelegramConfig;
  push: PushConfig;
}

export interface EmailConfig {
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  webhookUrl?: string;
}

export interface PushConfig {
  enabled: boolean;
  vapidKeys: {
    publicKey: string;
    privateKey: string;
  };
}

export interface FeatureFlags {
  enableTimeTracking: boolean;
  enableDependencies: boolean;
  enableTelegramIntegration: boolean;
  enableRealTimeUpdates: boolean;
  enableAdvancedSearch: boolean;
  enableDataExport: boolean;
}

// Export all types for easy importing
export * from './index';