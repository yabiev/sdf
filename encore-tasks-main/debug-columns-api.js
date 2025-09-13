const { Pool } = require('pg');

// Конфигурация базы данных
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'encore_tasks',
  user: 'postgres',
  password: 'postgres'
});

async function debugColumnsAPI() {
  try {
    console.log('🔍 Диагностика API колонок...');
    
    // 1. Проверим структуру таблицы columns
    console.log('\n1. Структура таблицы columns:');
    const columnsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'columns' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    console.table(columnsStructure.rows);
    
    // 2. Проверим доску с ID 10
    console.log('\n2. Проверка доски с ID 10:');
    const board = await pool.query('SELECT * FROM boards WHERE id = $1', [10]);
    if (board.rows.length > 0) {
      console.log('Доска найдена:', board.rows[0]);
    } else {
      console.log('❌ Доска с ID 10 не найдена!');
      return;
    }
    
    // 3. Проверим пользователя с ID 2
    console.log('\n3. Проверка пользователя с ID 2:');
    const user = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [2]);
    if (user.rows.length > 0) {
      console.log('Пользователь найден:', user.rows[0]);
    } else {
      console.log('❌ Пользователь с ID 2 не найден!');
      return;
    }
    
    // 4. Проверим доступ к проекту
    console.log('\n4. Проверка доступа к проекту:');
    const projectId = board.rows[0].project_id;
    const access = await pool.query(`
      SELECT pm.*, p.name as project_name 
      FROM project_members pm 
      JOIN projects p ON p.id = pm.project_id 
      WHERE pm.user_id = $1 AND pm.project_id = $2
    `, [2, projectId]);
    
    if (access.rows.length > 0) {
      console.log('Доступ к проекту есть:', access.rows[0]);
    } else {
      console.log('❌ Нет доступа к проекту!');
      
      // Проверим, является ли пользователь создателем проекта
      const creator = await pool.query('SELECT * FROM projects WHERE id = $1 AND created_by = $2', [projectId, 2]);
      if (creator.rows.length > 0) {
        console.log('✅ Пользователь является создателем проекта');
      } else {
        console.log('❌ Пользователь не является создателем проекта');
        return;
      }
    }
    
    // 5. Попробуем создать колонку напрямую в БД
    console.log('\n5. Создание колонки напрямую в БД:');
    try {
      const newColumn = await pool.query(`
        INSERT INTO columns (title, board_id, position, color, settings, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `, ['Test Column Direct', 10, 0, '#6B7280', '{}', 2]);
      
      console.log('✅ Колонка создана успешно:', newColumn.rows[0]);
      
      // Удалим тестовую колонку
      await pool.query('DELETE FROM columns WHERE id = $1', [newColumn.rows[0].id]);
      console.log('🗑️ Тестовая колонка удалена');
      
    } catch (error) {
      console.log('❌ Ошибка создания колонки:', error.message);
    }
    
    console.log('\n✅ Диагностика завершена');
    
  } catch (error) {
    console.error('❌ Ошибка диагностики:', error);
  } finally {
    await pool.end();
  }
}

debugColumnsAPI();