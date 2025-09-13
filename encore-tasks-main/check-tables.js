const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Checking SQLite database tables...');

db.all(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`, (err, rows) => {
  if (err) {
    console.error('Error:', err.message);
    db.close();
    return;
  }
  
  console.log('Available tables:');
  rows.forEach(row => {
    console.log('- ' + row.name);
  });
  
  // Проверим конкретно таблицы, которые используются в коде
  const checkTables = ['task_assignees', 'task_tags', 'tags'];
  console.log('\nChecking specific tables:');
  
  checkTables.forEach(tableName => {
    const exists = rows.some(row => row.name === tableName);
    console.log(`- ${tableName}: ${exists ? 'EXISTS' : 'MISSING'}`);
  });
  
  db.close();
});