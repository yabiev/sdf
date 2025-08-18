const fs = require('fs');
const path = require('path');

// Простая проверка структуры таблицы boards
const dbPath = path.join(__dirname, 'database', 'database.sqlite');

if (!fs.existsSync(dbPath)) {
  console.log('Database file not found:', dbPath);
  process.exit(1);
}

// Читаем файл базы данных как текст для поиска схемы
const dbContent = fs.readFileSync(dbPath, 'utf8');

// Ищем CREATE TABLE boards
const boardsTableMatch = dbContent.match(/CREATE TABLE boards \([^)]+\)/i);

if (boardsTableMatch) {
  console.log('Found boards table schema:');
  console.log(boardsTableMatch[0]);
} else {
  console.log('boards table schema not found in database file');
}

// Также проверим, есть ли упоминания description
const descriptionMatches = dbContent.match(/description[^,\n)]+/gi);
if (descriptionMatches) {
  console.log('\nFound description references:');
  descriptionMatches.forEach(match => console.log('- ' + match));
} else {
  console.log('\nNo description column references found');
}