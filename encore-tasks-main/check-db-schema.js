const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

try {
  console.log('Checking projects table schema:');
  const rows = db.prepare('PRAGMA table_info(projects)').all();
  
  console.log('Columns in projects table:');
  rows.forEach(row => {
    console.log(`  ${row.name}: ${row.type}`);
  });
  
  // Check if telegram columns exist
  const hasTelegramChatId = rows.some(row => row.name === 'telegram_chat_id');
  const hasTelegramTopicId = rows.some(row => row.name === 'telegram_topic_id');
  
  console.log('\nTelegram columns check:');
  console.log(`  telegram_chat_id: ${hasTelegramChatId ? 'EXISTS' : 'MISSING'}`);
  console.log(`  telegram_topic_id: ${hasTelegramTopicId ? 'EXISTS' : 'MISSING'}`);
  
} catch (err) {
  console.error('Error:', err);
} finally {
  db.close();
}