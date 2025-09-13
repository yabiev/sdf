-- Добавляем поле icon в таблицу projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'folder';

-- Добавляем поле deleted_at для мягкого удаления
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Обновляем существующие записи, если они есть
UPDATE projects SET icon = 'folder' WHERE icon IS NULL;