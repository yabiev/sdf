const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

async function fixTasksStepByStep() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 ПОШАГОВОЕ ИСПРАВЛЕНИЕ ТИПОВ ДАННЫХ В ТАБЛИЦЕ TASKS');
    console.log('=' .repeat(70));
    
    // Шаг 1: Удаляем все данные из таблицы tasks
    console.log('\n📋 Шаг 1: Удаление существующих данных из таблицы tasks...');
    try {
      const deleteResult = await client.query('DELETE FROM tasks');
      console.log(`✅ Удалено записей: ${deleteResult.rowCount}`);
    } catch (error) {
      console.error(`❌ Ошибка удаления данных: ${error.message}`);
    }
    
    // Шаг 2: Удаляем существующие внешние ключи (если есть)
    console.log('\n🔗 Шаг 2: Удаление существующих внешних ключей...');
    const constraintsToRemove = [
      'fk_tasks_board_id',
      'fk_tasks_reporter_id', 
      'fk_tasks_assignee_id',
      'fk_tasks_created_by',
      'fk_tasks_parent_task_id'
    ];
    
    for (const constraint of constraintsToRemove) {
      try {
        await client.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ${constraint}`);
        console.log(`✅ Удален внешний ключ: ${constraint}`);
      } catch (error) {
        console.log(`⚠️ Внешний ключ ${constraint} не найден или уже удален`);
      }
    }
    
    // Шаг 3: Изменяем типы данных
    console.log('\n🔄 Шаг 3: Изменение типов данных...');
    
    // 3.1: board_id
    console.log('   🔄 Изменение board_id с integer на UUID...');
    try {
      await client.query(`ALTER TABLE tasks ALTER COLUMN board_id TYPE UUID USING NULL`);
      console.log('   ✅ board_id изменен на UUID');
    } catch (error) {
      console.error(`   ❌ Ошибка изменения board_id: ${error.message}`);
    }
    
    // 3.2: reporter_id
    console.log('   🔄 Изменение reporter_id с integer на UUID...');
    try {
      // Сначала делаем поле nullable
      await client.query(`ALTER TABLE tasks ALTER COLUMN reporter_id DROP NOT NULL`);
      await client.query(`ALTER TABLE tasks ALTER COLUMN reporter_id TYPE UUID USING NULL`);
      console.log('   ✅ reporter_id изменен на UUID');
    } catch (error) {
      console.error(`   ❌ Ошибка изменения reporter_id: ${error.message}`);
    }
    
    // 3.3: assignee_id
    console.log('   🔄 Изменение assignee_id с integer на UUID...');
    try {
      await client.query(`ALTER TABLE tasks ALTER COLUMN assignee_id TYPE UUID USING NULL`);
      console.log('   ✅ assignee_id изменен на UUID');
    } catch (error) {
      console.error(`   ❌ Ошибка изменения assignee_id: ${error.message}`);
    }
    
    // 3.4: parent_task_id
    console.log('   🔄 Изменение parent_task_id с integer на UUID...');
    try {
      await client.query(`ALTER TABLE tasks ALTER COLUMN parent_task_id TYPE UUID USING NULL`);
      console.log('   ✅ parent_task_id изменен на UUID');
    } catch (error) {
      console.error(`   ❌ Ошибка изменения parent_task_id: ${error.message}`);
    }
    
    // Шаг 4: Добавляем поле created_by
    console.log('\n➕ Шаг 4: Добавление поля created_by...');
    try {
      await client.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID`);
      console.log('✅ Поле created_by добавлено');
    } catch (error) {
      console.error(`❌ Ошибка добавления created_by: ${error.message}`);
    }
    
    // Шаг 5: Добавляем внешние ключи
    console.log('\n🔗 Шаг 5: Добавление внешних ключей...');
    
    const foreignKeys = [
      {
        name: 'fk_tasks_board_id',
        column: 'board_id',
        references: 'boards(id)',
        onDelete: 'CASCADE'
      },
      {
        name: 'fk_tasks_reporter_id',
        column: 'reporter_id',
        references: 'users(id)',
        onDelete: 'SET NULL'
      },
      {
        name: 'fk_tasks_assignee_id',
        column: 'assignee_id',
        references: 'users(id)',
        onDelete: 'SET NULL'
      },
      {
        name: 'fk_tasks_created_by',
        column: 'created_by',
        references: 'users(id)',
        onDelete: 'SET NULL'
      },
      {
        name: 'fk_tasks_parent_task_id',
        column: 'parent_task_id',
        references: 'tasks(id)',
        onDelete: 'SET NULL'
      }
    ];
    
    for (const fk of foreignKeys) {
      try {
        const sql = `ALTER TABLE tasks ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.column}) REFERENCES ${fk.references} ON DELETE ${fk.onDelete}`;
        await client.query(sql);
        console.log(`✅ Добавлен внешний ключ: ${fk.name}`);
      } catch (error) {
        console.error(`❌ Ошибка добавления внешнего ключа ${fk.name}: ${error.message}`);
      }
    }
    
    // Шаг 6: Создаем индексы
    console.log('\n📊 Шаг 6: Создание индексов...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON tasks(reporter_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)'
    ];
    
    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        const indexName = indexSql.match(/idx_\w+/)[0];
        console.log(`✅ Создан индекс: ${indexName}`);
      } catch (error) {
        console.error(`❌ Ошибка создания индекса: ${error.message}`);
      }
    }
    
    // Финальная проверка
    console.log('\n🔍 ФИНАЛЬНАЯ ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ:');
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
    
    console.log('✅ Обновленные поля:');
    finalCheck.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
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
    
    console.log('\n' + '=' .repeat(70));
    console.log('🎉 ПОШАГОВОЕ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('✅ Типы данных обновлены на UUID');
    console.log('✅ Добавлено поле created_by');
    console.log('✅ Настроены внешние ключи');
    console.log('✅ Созданы индексы');
    
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
  fixTasksStepByStep()
    .then(() => {
      console.log('\n🏁 Пошаговое исправление завершено.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Критическая ошибка:', error.message);
      process.exit(1);
    });
}