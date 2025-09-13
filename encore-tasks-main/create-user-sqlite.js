require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Путь к базе данных SQLite
const dbPath = path.join(__dirname, 'database', 'encore_tasks.db');

async function createUserInSQLite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err);
        reject(err);
        return;
      }
      console.log('✅ Подключение к SQLite установлено');
    });
    
    // Создаем таблицу users
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
        avatar TEXT,
        telegram_chat_id INTEGER,
        telegram_username TEXT,
        notification_settings TEXT DEFAULT '{
          "email": true,
          "telegram": false,
          "browser": true,
          "taskAssigned": true,
          "taskCompleted": true,
          "projectUpdates": true
        }',
        last_login_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      )
    `;
    
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Ошибка при создании таблицы:', err);
        reject(err);
        return;
      }
      console.log('✅ Таблица users создана успешно!');
      
      // Проверяем, существует ли пользователь
      db.get('SELECT * FROM users WHERE email = ?', ['axelencore@mail.ru'], async (err, row) => {
        if (err) {
          console.error('❌ Ошибка при проверке пользователя:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          console.log('Создание административного пользователя...');
          
          try {
            // Создаем хеш пароля
            const passwordHash = await bcrypt.hash('Ad580dc6axelencore', 10);
            
            const insertSQL = `
              INSERT INTO users (name, email, password_hash, role, approval_status)
              VALUES (?, ?, ?, ?, ?)
            `;
            
            db.run(insertSQL, [
              'Administrator',
              'axelencore@mail.ru',
              passwordHash,
              'admin',
              'approved'
            ], function(err) {
              if (err) {
                console.error('❌ Ошибка при создании пользователя:', err);
                reject(err);
                return;
              }
              
              console.log('✅ Административный пользователь создан с ID:', this.lastID);
              
              // Проверяем созданного пользователя
              db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                if (err) {
                  console.error('❌ Ошибка при получении пользователя:', err);
                  reject(err);
                  return;
                }
                
                console.log('✅ Пользователь создан:', {
                  id: newUser.id,
                  name: newUser.name,
                  email: newUser.email,
                  role: newUser.role,
                  approval_status: newUser.approval_status
                });
                
                db.close();
                resolve();
              });
            });
          } catch (hashError) {
            console.error('❌ Ошибка при хешировании пароля:', hashError);
            reject(hashError);
          }
        } else {
          console.log('✅ Административный пользователь уже существует:', {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            approval_status: row.approval_status
          });
          
          db.close();
          resolve();
        }
      });
    });
  });
}

createUserInSQLite().catch(console.error);