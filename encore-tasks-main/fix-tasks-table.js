const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к базе данных
const dbPath = path.join(__dirname, 'database.sqlite');

// Подключаемся к базе данных
const db = new sqlite3.Database(dbPath);

console.log('Исправляем структуру таблицы tasks...');

// Удаляем старую таблицу и создаем новую
db.serialize(() => {
  // Удаляем старую таблицу
  db.run('DROP TABLE IF EXISTS tasks', (err) => {
    if (err) {
      console.error('Ошибка при удалении старой таблицы:', err);
      return;
    }
    console.log('Старая таблица tasks удалена');
    
    // Создаем новую таблицу с правильной структурой
    db.run(`
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        assignee_id TEXT,
        column_id TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 1,
        due_date DATETIME,
        estimated_hours INTEGER,
        actual_hours INTEGER DEFAULT 0,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        board_id TEXT,
        project_id TEXT,
        reporter_id TEXT,
        parent_task_id TEXT,
        settings TEXT DEFAULT '{}',
        created_by TEXT,
        FOREIGN KEY (column_id) REFERENCES columns(id),
        FOREIGN KEY (board_id) REFERENCES boards(id),
        FOREIGN KEY (assignee_id) REFERENCES users(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
      )
    `, (err) => {
      if (err) {
        console.error('Ошибка при создании новой таблицы tasks:', err);
        return;
      }
      console.log('Новая таблица tasks создана');
      
      // Проверяем новую структуру
      db.all('PRAGMA table_info(tasks)', [], (err, columns) => {
        if (err) {
          console.error('Ошибка при получении структуры таблицы:', err);
        } else {
          console.log('\nНовая структура таблицы tasks:');
          columns.forEach(col => {
            console.log(`${col.name}: ${col.type} (nullable: ${col.notnull === 0}, pk: ${col.pk === 1})`);
          });
        }
        
        db.close();
      });
    });
  });
});