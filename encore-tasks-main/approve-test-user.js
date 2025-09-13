// Скрипт для одобрения тестового пользователя
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

async function approveTestUser() {
  // Проверяем какой файл базы данных существует
  const dbFiles = ['database.db', 'database.sqlite', './database/database.sqlite'];
  let dbPath = null;
  
  for (const file of dbFiles) {
    if (fs.existsSync(file)) {
      dbPath = file;
      console.log(`📁 Найден файл базы данных: ${file}`);
      break;
    }
  }
  
  if (!dbPath) {
    console.error('❌ Файл базы данных не найден');
    return;
  }
  
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Проверим существующих пользователей
    console.log('🔍 Поиск пользователя test@example.com...');
    
    db.all("SELECT id, email, name, role FROM users WHERE email = 'test@example.com'", (err, users) => {
      if (err) {
        console.error('❌ Ошибка при поиске пользователя:', err);
        db.close();
        return;
      }
      
      console.log('👤 Найденные пользователи:', users);
      
      if (users.length === 0) {
        console.log('❌ Пользователь test@example.com не найден');
        
        // Попробуем создать пользователя
        console.log('🔧 Создание тестового пользователя...');
        const bcrypt = require('bcrypt');
        const hashedPassword = bcrypt.hashSync('test123', 10);
        
        db.run(
          "INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            'test-user-' + Date.now(),
            'test@example.com',
            'Test User',
            hashedPassword,
            'user',
            new Date().toISOString(),
            new Date().toISOString()
          ],
          function(err) {
            if (err) {
              console.error('❌ Ошибка при создании пользователя:', err);
            } else {
              console.log('✅ Тестовый пользователь создан');
              console.log('🎉 Данные для входа:');
              console.log('📧 Email: test@example.com');
              console.log('🔑 Пароль: test123');
            }
            db.close();
          }
        );
      } else {
        const user = users[0];
        console.log(`👤 Пользователь найден: ID=${user.id}, Email=${user.email}, Role=${user.role}`);
        console.log('🎉 Пользователь уже существует. Данные для входа:');
        console.log('📧 Email: test@example.com');
        console.log('🔑 Пароль: test123');
        db.close();
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    db.close();
  }
}

approveTestUser();