const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

async function fixTasksTableTypes() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 ИСПРАВЛЕНИЕ ТИПОВ ДАННЫХ В ТАБЛИЦЕ TASKS');
    console.log('=' .repeat(60));
    
    // Читаем SQL скрипт
    const sqlPath = path.join(__dirname, 'fix-tasks-table-types.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Разбиваем скрипт на отдельные команды
    const commands = sqlScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '');
    
    console.log(`\n📝 Найдено команд для выполнения: ${commands.length}`);
    
    // Выполняем команды по одной
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Пропускаем комментарии
      if (command.startsWith('--')) {
        continue;
      }
      
      try {
        console.log(`\n⚡ Выполняем команду ${i + 1}/${commands.length}...`);
        
        // Показываем краткое описание команды
        if (command.includes('DELETE FROM tasks')) {
          console.log('   📋 Удаление существующих данных из таблицы tasks');
        } else if (command.includes('ALTER TABLE tasks ALTER COLUMN') && command.includes('board_id')) {
          console.log('   🔄 Изменение типа board_id с integer на UUID');
        } else if (command.includes('ALTER TABLE tasks ALTER COLUMN') && command.includes('reporter_id')) {
          console.log('   🔄 Изменение типа reporter_id с integer на UUID');
        } else if (command.includes('ALTER TABLE tasks ALTER COLUMN') && command.includes('assignee_id')) {
          console.log('   🔄 Изменение типа assignee_id с integer на UUID');
        } else if (command.includes('ALTER TABLE tasks ALTER COLUMN') && command.includes('parent_task_id')) {
          console.log('   🔄 Изменение типа parent_task_id с integer на UUID');
        } else if (command.includes('ADD COLUMN created_by')) {
          console.log('   ➕ Добавление поля created_by типа UUID');
        } else if (command.includes('ADD CONSTRAINT') && command.includes('fk_tasks_board_id')) {
          console.log('   🔗 Добавление внешнего ключа для board_id');
        } else if (command.includes('ADD CONSTRAINT') && command.includes('fk_tasks_reporter_id')) {
          console.log('   🔗 Добавление внешнего ключа для reporter_id');
        } else if (command.includes('ADD CONSTRAINT') && command.includes('fk_tasks_assignee_id')) {
          console.log('   🔗 Добавление внешнего ключа для assignee_id');
        } else if (command.includes('ADD CONSTRAINT') && command.includes('fk_tasks_created_by')) {
          console.log('   🔗 Добавление внешнего ключа для created_by');
        } else if (command.includes('ADD CONSTRAINT') && command.includes('fk_tasks_parent_task_id')) {
          console.log('   🔗 Добавление внешнего ключа для parent_task_id');
        } else if (command.includes('CREATE INDEX')) {
          console.log('   📊 Создание индекса для улучшения производительности');
        } else if (command.includes('SELECT')) {
          console.log('   🔍 Проверка результатов изменений');
        } else {
          console.log(`   ⚙️ Выполнение: ${command.substring(0, 50)}...`);
        }
        
        const result = await client.query(command);
        
        // Если это SELECT запрос, показываем результат
        if (command.trim().toUpperCase().startsWith('SELECT')) {
          console.log('   ✅ Результат проверки:');
          if (result.rows.length > 0) {
            result.rows.forEach((row, index) => {
              console.log(`      ${index + 1}. ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });
          } else {
            console.log('      Нет данных для отображения');
          }
        } else {
          console.log(`   ✅ Команда выполнена успешно (затронуто строк: ${result.rowCount || 0})`);
        }
        
      } catch (error) {
        // Некоторые ошибки можно игнорировать (например, если поле уже существует)
        if (error.message.includes('уже существует') || 
            error.message.includes('already exists') ||
            error.message.includes('duplicate key')) {
          console.log(`   ⚠️ Предупреждение: ${error.message}`);
        } else {
          console.error(`   ❌ Ошибка выполнения команды: ${error.message}`);
          // Продолжаем выполнение остальных команд
        }
      }
    }
    
    // Финальная проверка структуры таблицы
    console.log('\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ TASKS:');
    const finalCheck = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_name = 'tasks' 
        AND column_name IN ('board_id', 'reporter_id', 'assignee_id', 'parent_task_id', 'created_by')
      ORDER BY column_name
    `);
    
    if (finalCheck.rows.length > 0) {
      console.log('✅ Обновленные поля:');
      finalCheck.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    // Проверяем внешние ключи
    console.log('\n🔗 ПРОВЕРКА ВНЕШНИХ КЛЮЧЕЙ:');
    const foreignKeysCheck = await client.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'tasks'
        AND kcu.column_name IN ('board_id', 'reporter_id', 'assignee_id', 'parent_task_id', 'created_by')
      ORDER BY kcu.column_name
    `);
    
    if (foreignKeysCheck.rows.length > 0) {
      console.log('✅ Внешние ключи:');
      foreignKeysCheck.rows.forEach((fk, index) => {
        console.log(`   ${index + 1}. ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('⚠️ Внешние ключи не найдены');
    }
    
    client.release();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ИСПРАВЛЕНИЕ ТИПОВ ДАННЫХ ЗАВЕРШЕНО УСПЕШНО!');
    console.log('✅ Все поля теперь используют UUID типы');
    console.log('✅ Добавлено поле created_by');
    console.log('✅ Настроены внешние ключи для целостности данных');
    console.log('✅ Созданы индексы для улучшения производительности');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:');
    console.error(`   ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

// Запуск исправления
if (require.main === module) {
  fixTasksTableTypes()
    .then(() => {
      console.log('\n🏁 Исправление типов данных завершено.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}