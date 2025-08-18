export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'user';
  isApproved: boolean;
  createdAt: Date;
  password?: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  members: User[];
  createdBy: string;
  createdAt: Date;
  telegramChatId?: string;
  telegramTopicId?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: User; // Deprecated: use assignees instead
  assignees: User[];
  reporter: User;
  projectId: string;
  boardId: string;
  parentTaskId?: string;
  subtasks: Task[];
  deadline?: Date;
  attachments: Attachment[];
  comments: Comment[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  position: number;
  isArchived?: boolean;
  archivedAt?: Date;
  completedAt?: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "document" | "other";
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Board {
  id: string;
  name: string;
  projectId: string;
  columns: Column[];
  icon?: string;
  createdAt: Date;
}

export interface Column {
  id: string;
  name: string;
  title: string; // Добавляем title для совместимости
  tasks: Task[];
  position: number;
  color?: string;
}

export type TaskStatus = "todo" | "in-progress" | "review" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface NotificationSettings {
  projectId: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramTopicId?: string;
  enabled: boolean;
}

export interface TaskAction {
  id: string;
  taskId: string;
  boardId: string;
  projectId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'assigned' | 'unassigned' | 'status_changed' | 'priority_changed' | 'title_changed' | 'description_changed' | 'deadline_changed' | 'tags_changed';
  description: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface Session {
  id: string;
  token: string;
  user_id: string;
  expires_at: Date;
  created_at: Date;
}

export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current?: {
        type: string;
        task?: Task;
        columnId?: string;
      };
    };
  };
  over: {
    id: string;
    data: {
      current?: {
        type: string;
        columnId?: string;
      };
    };
  } | null;
}