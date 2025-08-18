#!/usr/bin/env node

/**
 * Скрипт для тестирования подключения к PostgreSQL
 * Использование: node test-postgresql-connection.js
 */

const { Pool } = require('pg');
require('dotenv').config();

// Конфигурация PostgreSQL
const pgConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'encore_tasks',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function testConnection() {
  console.log('🔍 Тестирование подключения к PostgreSQL...');
  console.log('📋 Конфигурация:', {
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.database,
    user: pgConfig.user,
    ssl: pgConfig.ssl
  });

  const pool = new Pool(pgConfig);

  try {
    // Тестируем подключение
    const client = await pool.connect();
    console.log('✅ Подключение к PostgreSQL установлено успешно');

    // Проверяем версию PostgreSQL
    const versionResult = await client.query('SELECT version()');
    console.log('📊 Версия PostgreSQL:', versionResult.rows[0].version);

    // Проверяем существование базы данных
    const dbResult = await client.query('SELECT current_database()');
    console.log('🗄️  Текущая база данных:', dbResult.rows[0].current_database);

    // Проверяем существование таблиц
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Существующие таблицы:');
    if (tablesResult.rows.length === 0) {
      console.log('   ⚠️  Таблицы не найдены. Необходимо выполнить инициализацию схемы.');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }

    client.release();
    console.log('\n🎉 Тест подключения завершен успешно!');

  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Возможные решения:');
      console.log('   1. Убедитесь, что PostgreSQL запущен');
      console.log('   2. Проверьте настройки подключения в .env файле');
      console.log('   3. Запустите PostgreSQL через Docker: docker-compose -f docker-compose.postgresql.yml up -d');
    } else if (error.code === '3D000') {
      console.log('\n💡 База данных не существует. Создайте её командой:');
      console.log('   createdb encore_tasks');
    } else if (error.code === '28P01') {
      console.log('\n💡 Ошибка аутентификации. Проверьте пользователя и пароль в .env файле');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запускаем тест
if (require.main === module) {
  testConnection();
}

module.exports = testConnection;