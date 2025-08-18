const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Открываем базу данных
const db = new Database('database.db');

// Создаем таблицы если их нет
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    isApproved BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );
`);

console.log('Tables created successfully!');

// Создаем пользователя если его нет
const userId = 'a7395264-ae97-466d-8dd3-65410a7266aa';
const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);

if (!userExists) {
  console.log('Creating user...');
  db.prepare(`
    INSERT INTO users (id, email, name, role) 
    VALUES (?, ?, ?, ?)
  `).run(userId, 'axelencore@mail.ru', 'Test User', 'admin');
} else {
  // Обновляем пользователя, добавляя роль admin
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', userId);
}

// Создаем проект для тестирования
const projectId = 'test-project-id';
const projectExists = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);

if (!projectExists) {
  console.log('Creating test project...');
  db.prepare(`
    INSERT INTO projects (id, name, description, creator_id, created_at, updated_at) 
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(projectId, 'Test Project', 'Test project for board creation', userId);
}

// Создаем сессию
const sessionToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhNzM5NTI2NC1hZTk3LTQ2NmQtOGRkMy02NTQxMGE3MjY2YWEiLCJlbWFpbCI6ImF4ZWxlbmNvcmVAbWFpbC5ydSIsImlhdCI6MTc1NTI3Mjk5MywiZXhwIjoxNzU1ODc3NzkzfQ.UCsnQGUS7M8XhS25aH8d7f4NYd3IyIr8nlS0xjBHYQQ';
const sessionId = uuidv4();
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 дней

// Удаляем старые сессии для этого токена
db.prepare('DELETE FROM user_sessions WHERE session_token = ?').run(sessionToken);

// Создаем новую сессию
db.prepare(`
  INSERT INTO user_sessions (id, user_id, session_token, expires_at) 
  VALUES (?, ?, ?, ?)
`).run(sessionId, userId, sessionToken, expiresAt);

console.log('Session created successfully!');
console.log('User ID:', userId);
console.log('Session Token:', sessionToken);
console.log('Expires At:', expiresAt);

db.close();