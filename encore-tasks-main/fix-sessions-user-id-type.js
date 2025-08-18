const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

async function fixSessionsUserIdType() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Исправление типа данных user_id в таблице sessions...');
    
    // Начинаем транзакцию
    await client.query('BEGIN');
    
    // Удаляем все существующие записи из sessions
    console.log('🗑️  Удаление существующих записей из таблицы sessions...');
    const deleteResult = await client.query('DELETE FROM sessions');
    console.log(`   Удалено записей: ${deleteResult.rowCount}`);
    
    // Изменяем тип столбца user_id с integer на UUID
    console.log('🔄 Изменение типа столбца user_id с integer на UUID...');
    await client.query(`
      ALTER TABLE sessions 
      ALTER COLUMN user_id TYPE UUID USING user_id::text::UUID
    `);
    console.log('   ✅ Тип столбца user_id изменен на UUID');
    
    // Добавляем внешний ключ для обеспечения целостности данных
    console.log('🔗 Добавление внешнего ключа...');
    try {
      await client.query(`
        ALTER TABLE sessions 
        ADD CONSTRAINT fk_sessions_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('   ✅ Внешний ключ добавлен');
    } catch (fkError) {
      if (fkError.message.includes('already exists')) {
        console.log('   ℹ️  Внешний ключ уже существует');
      } else {
        throw fkError;
      }
    }
    
    // Подтверждаем транзакцию
    await client.query('COMMIT');
    console.log('✅ Транзакция успешно завершена');
    
    // Проверяем результат
    console.log('\n🔍 Проверка результата...');
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'user_id'
    `);
    
    if (checkResult.rows.length > 0) {
      const column = checkResult.rows[0];
      console.log('\nИнформация о поле user_id в таблице sessions:');
      console.log(`  Название: ${column.column_name}`);
      console.log(`  Тип данных: ${column.data_type}`);
      console.log(`  Может быть NULL: ${column.is_nullable}`);
      
      if (column.data_type === 'uuid') {
        console.log('\n🎉 УСПЕХ! Тип данных user_id успешно изменен на UUID');
      } else {
        console.log('\n❌ ОШИБКА! Тип данных не изменился');
      }
    }
    
  } catch (error) {
    // Откатываем транзакцию в случае ошибки
    await client.query('ROLLBACK');
    console.error('\n❌ ОШИБКА при исправлении типа данных:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixSessionsUserIdType();
    console.log('\n✅ Исправление типа данных завершено успешно!');
  } catch (error) {
    console.error('\n💥 Критическая ошибка:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();