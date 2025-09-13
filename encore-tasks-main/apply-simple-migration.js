const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function applySimpleMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'encore_tasks',
    user: 'postgres',
    password: 'postgres'
  });

  try {
    await client.connect();
    console.log('Подключение к PostgreSQL установлено');

    // Удаляем все существующие таблицы
    console.log('Удаление существующих таблиц...');
    const dropTables = [
      'DROP TABLE IF EXISTS attachments CASCADE;',
      'DROP TABLE IF EXISTS comments CASCADE;',
      'DROP TABLE IF EXISTS task_tags CASCADE;',
      'DROP TABLE IF EXISTS tags CASCADE;',
      'DROP TABLE IF EXISTS tasks CASCADE;',
      'DROP TABLE IF EXISTS columns CASCADE;',
      'DROP TABLE IF EXISTS boards CASCADE;',
      'DROP TABLE IF EXISTS project_members CASCADE;',
      'DROP TABLE IF EXISTS projects CASCADE;',
      'DROP TABLE IF EXISTS sessions CASCADE;',
      'DROP TABLE IF EXISTS users CASCADE;'
    ];

    for (const dropQuery of dropTables) {
      await client.query(dropQuery);
    }
    console.log('Существующие таблицы удалены');

    // Читаем и применяем миграцию
    const migrationPath = path.join(__dirname, 'simple-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Применение миграции...');
    await client.query(migrationSQL);
    console.log('Миграция успешно применена');

    // Создаем административного пользователя
    console.log('Создание административного пользователя...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const insertUserQuery = `
      INSERT INTO users (email, password_hash, name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active
      RETURNING id, email, name, role;
    `;
    
    const result = await client.query(insertUserQuery, [
      'axelencore@mail.ru',
      hashedPassword,
      'Admin User',
      'admin',
      true
    ]);
    
    console.log('Административный пользователь создан:', result.rows[0]);
    
    // Проверяем созданные таблицы
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log('Созданные таблицы:', tablesResult.rows.map(row => row.table_name));
    
    console.log('\nБаза данных успешно настроена!');
    console.log('Административный пользователь:');
    console.log('Email: axelencore@mail.ru');
    console.log('Пароль: admin123');
    
  } catch (error) {
    console.error('Ошибка при применении миграции:', error);
  } finally {
    await client.end();
  }
}

applySimpleMigration();