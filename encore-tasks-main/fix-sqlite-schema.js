const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'database.sqlite');

async function addMissingColumns() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Ошибка подключения к SQLite:', err.message);
        reject(err);
        return;
      }
      console.log('Подключение к SQLite базе данных успешно');
    });

    // Проверяем текущую схему таблицы columns
    db.get("PRAGMA table_info(columns)", (err, rows) => {
      if (err) {
        console.error('Ошибка получения схемы таблицы:', err.message);
        reject(err);
        return;
      }
      
      console.log('Текущая схема таблицы columns:');
    });

    // Получаем все колонки таблицы columns
    db.all("PRAGMA table_info(columns)", (err, rows) => {
      if (err) {
        console.error('Ошибка получения информации о таблице:', err.message);
        reject(err);
        return;
      }

      console.log('Существующие колонки в таблице columns:');
      rows.forEach(row => {
        console.log(`- ${row.name} (${row.type})`);
      });

      const existingColumns = rows.map(row => row.name);
      const needsSettings = !existingColumns.includes('settings');
      const needsCreatedBy = !existingColumns.includes('created_by');

      if (!needsSettings && !needsCreatedBy) {
        console.log('Все необходимые колонки уже существуют');
        db.close();
        resolve();
        return;
      }

      // Добавляем недостающие колонки
      const alterQueries = [];
      
      if (needsSettings) {
        alterQueries.push("ALTER TABLE columns ADD COLUMN settings TEXT DEFAULT '{}'");
      }
      
      if (needsCreatedBy) {
        alterQueries.push("ALTER TABLE columns ADD COLUMN created_by TEXT");
      }

      let completed = 0;
      const total = alterQueries.length;

      alterQueries.forEach((query, index) => {
        db.run(query, (err) => {
          if (err) {
            console.error(`Ошибка выполнения запроса ${index + 1}:`, err.message);
            reject(err);
            return;
          }
          
          console.log(`✓ Выполнен запрос ${index + 1}/${total}: ${query}`);
          completed++;
          
          if (completed === total) {
            console.log('Все изменения применены успешно!');
            
            // Проверяем обновленную схему
            db.all("PRAGMA table_info(columns)", (err, updatedRows) => {
              if (err) {
                console.error('Ошибка проверки обновленной схемы:', err.message);
                reject(err);
                return;
              }
              
              console.log('\nОбновленная схема таблицы columns:');
              updatedRows.forEach(row => {
                console.log(`- ${row.name} (${row.type})`);
              });
              
              db.close((err) => {
                if (err) {
                  console.error('Ошибка закрытия базы данных:', err.message);
                  reject(err);
                } else {
                  console.log('База данных закрыта успешно');
                  resolve();
                }
              });
            });
          }
        });
      });
    });
  });
}

addMissingColumns().catch(console.error);