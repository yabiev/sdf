import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  approval_status: string;
  avatar?: string;
  telegram_chat_id?: number;
  telegram_username?: string;
  notification_settings: any;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Column {
  id: string;
  name: string;
  board_id: string;
  position: number;
  color: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee_id?: string;
  reporter_id: string;
  project_id: string;
  board_id: string;
  column_id: string;
  position: number;
  deadline?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
  last_activity_at: string;
}

interface Database {
  users: User[];
  projects: Project[];
  boards: Board[];
  columns: Column[];
  tasks: Task[];
  user_sessions: UserSession[];
}

const DB_PATH = path.join(process.cwd(), 'database', 'temp-db.json');

class TempDatabase {
  private data!: Database;

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const rawData = fs.readFileSync(DB_PATH, 'utf8');
      this.data = JSON.parse(rawData);
    } catch (error) {
      console.error('Error loading database:', error);
      this.data = {
        users: [],
        projects: [],
        boards: [],
        columns: [],
        tasks: [],
        user_sessions: []
      };
    }
  }

  private saveData() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }

  // User methods
  async findUserByEmail(email: string): Promise<User | null> {
    return this.data.users.find(user => user.email === email) || null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.data.users.find(user => user.id === id) || null;
  }

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const user: User = {
      ...userData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const userIndex = this.data.users.findIndex(user => user.id === id);
    if (userIndex === -1) return null;
    
    this.data.users[userIndex] = {
      ...this.data.users[userIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.saveData();
    return this.data.users[userIndex];
  }

  async getAllUsers(): Promise<User[]> {
    return this.data.users;
  }

  // Session methods
  async createSession(sessionData: Omit<UserSession, 'id' | 'created_at' | 'last_activity_at'>): Promise<UserSession> {
    const session: UserSession = {
      ...sessionData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString()
    };
    
    this.data.user_sessions.push(session);
    this.saveData();
    
    return session;
  }

  async findSessionByToken(token: string): Promise<UserSession | null> {
    const session = this.data.user_sessions.find(session => session.session_token === token);
    return session || null;
  }

  async deleteSession(token: string): Promise<void> {
    this.data.user_sessions = this.data.user_sessions.filter(session => session.session_token !== token);
    this.saveData();
  }

  // Project methods
  async getAllProjects(): Promise<Project[]> {
    return this.data.projects;
  }

  async createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const project: Project = {
      ...projectData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.projects.push(project);
    this.saveData();
    return project;
  }

  // Board methods
  async getAllBoards(): Promise<Board[]> {
    return this.data.boards;
  }

  async createBoard(boardData: Omit<Board, 'id' | 'created_at' | 'updated_at'>): Promise<Board> {
    const board: Board = {
      ...boardData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.boards.push(board);
    this.saveData();
    return board;
  }

  // Column methods
  async getAllColumns(): Promise<Column[]> {
    return this.data.columns;
  }

  async createColumn(columnData: Omit<Column, 'id' | 'created_at' | 'updated_at'>): Promise<Column> {
    const column: Column = {
      ...columnData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.columns.push(column);
    this.saveData();
    return column;
  }

  // Task methods
  async getAllTasks(): Promise<Task[]> {
    return this.data.tasks;
  }

  async findTaskById(id: string): Promise<Task | null> {
    return this.data.tasks.find(task => task.id === id) || null;
  }

  async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.tasks.push(task);
    this.saveData();
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const taskIndex = this.data.tasks.findIndex(task => task.id === id);
    if (taskIndex === -1) return null;
    
    this.data.tasks[taskIndex] = {
      ...this.data.tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.saveData();
    return this.data.tasks[taskIndex];
  }

  async deleteTask(id: string): Promise<boolean> {
    const initialLength = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(task => task.id !== id);
    this.saveData();
    return this.data.tasks.length < initialLength;
  }

  // Session methods
  async updateSession(id: string, updates: Partial<UserSession>): Promise<UserSession | null> {
    const sessionIndex = this.data.user_sessions.findIndex(session => session.id === id);
    if (sessionIndex === -1) return null;
    
    this.data.user_sessions[sessionIndex] = {
      ...this.data.user_sessions[sessionIndex],
      ...updates
    };
    this.saveData();
    return this.data.user_sessions[sessionIndex];
  }

  // Project methods
  async findProjectById(id: string): Promise<Project | null> {
    return this.data.projects.find(project => project.id === id) || null;
  }

  // Utility methods
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

export const tempDb = new TempDatabase();
export default tempDb;