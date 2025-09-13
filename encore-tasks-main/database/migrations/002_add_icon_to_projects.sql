-- Добавление колонки icon в таблицу projects
-- =====================================================

ALTER TABLE projects ADD COLUMN icon VARCHAR(50) DEFAULT '📋';

-- Обновляем существующие проекты, устанавливая иконку по умолчанию
UPDATE projects SET icon = '📋' WHERE icon IS NULL;

-- Добавляем комментарий к колонке
COMMENT ON COLUMN projects.icon IS 'Иконка проекта (эмодзи или название иконки)';