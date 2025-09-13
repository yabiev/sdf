-- Добавление колонки settings в таблицу columns если она не существует
ALTER TABLE columns 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Обновление существующих записей с пустым JSON объектом
UPDATE columns 
SET settings = '{}' 
WHERE settings IS NULL;