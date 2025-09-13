-- Добавление недостающих колонок в таблицу tasks
ALTER TABLE tasks ADD COLUMN board_id TEXT;
ALTER TABLE tasks ADD COLUMN project_id TEXT;
ALTER TABLE tasks ADD COLUMN reporter_id TEXT;

-- Добавление внешних ключей
-- Примечание: SQLite не поддерживает добавление внешних ключей к существующим таблицам
-- Поэтому добавляем только колонки без ограничений