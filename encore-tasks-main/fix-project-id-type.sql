-- Исправление типа project_id в таблице tasks
-- Изменяем тип с integer на uuid для совместимости с таблицей projects

BEGIN;

-- Удаляем существующие данные из tasks (если есть)
DELETE FROM tasks;

-- Изменяем тип столбца project_id с integer на uuid
ALTER TABLE tasks ALTER COLUMN project_id TYPE uuid USING project_id::text::uuid;

-- Добавляем внешний ключ для связи с таблицей projects
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project_id 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

COMMIT;

-- Проверяем результат
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'project_id';