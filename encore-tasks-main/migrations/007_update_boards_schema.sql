-- Миграция для обновления схемы таблицы boards
-- Добавляет недостающие столбцы: visibility, color, settings, created_by

-- Добавляем столбец visibility
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';

-- Добавляем ограничение для visibility
ALTER TABLE boards 
ADD CONSTRAINT boards_visibility_check 
CHECK (visibility IN ('private', 'public'));

-- Добавляем столбец color
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';

-- Добавляем столбец settings
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Добавляем столбец created_by
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS created_by INTEGER;

-- Добавляем внешний ключ для created_by
ALTER TABLE boards 
ADD CONSTRAINT fk_boards_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Обновляем существующие записи с дефолтными значениями
UPDATE boards 
SET 
    visibility = COALESCE(visibility, 'private'),
    color = COALESCE(color, '#3B82F6'),
    settings = COALESCE(settings, '{}'::jsonb)
WHERE visibility IS NULL OR color IS NULL OR settings IS NULL;