-- Исправление типов данных в таблице tasks для совместимости с UUID

-- 1. Удаляем существующие данные из таблицы tasks (если есть)
DELETE FROM tasks;

-- 2. Изменяем тип board_id с integer на UUID
ALTER TABLE tasks ALTER COLUMN board_id TYPE UUID USING board_id::text::UUID;

-- 3. Изменяем тип reporter_id с integer на UUID
ALTER TABLE tasks ALTER COLUMN reporter_id TYPE UUID USING reporter_id::text::UUID;

-- 4. Изменяем тип assignee_id с integer на UUID
ALTER TABLE tasks ALTER COLUMN assignee_id TYPE UUID USING assignee_id::text::UUID;

-- 5. Изменяем тип parent_task_id с integer на UUID (для поддержки подзадач)
ALTER TABLE tasks ALTER COLUMN parent_task_id TYPE UUID USING parent_task_id::text::UUID;

-- 6. Добавляем поле created_by типа UUID
ALTER TABLE tasks ADD COLUMN created_by UUID;

-- 7. Добавляем внешние ключи для обеспечения целостности данных

-- Внешний ключ для board_id
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_board_id 
FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;

-- Внешний ключ для reporter_id
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_reporter_id 
FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL;

-- Внешний ключ для assignee_id
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_assignee_id 
FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

-- Внешний ключ для created_by
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Внешний ключ для parent_task_id (самоссылка)
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_parent_task_id 
FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- 8. Устанавливаем значения по умолчанию для новых полей
ALTER TABLE tasks ALTER COLUMN created_by SET DEFAULT NULL;

-- 9. Добавляем индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);

-- Проверяем результат
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND column_name IN ('board_id', 'reporter_id', 'assignee_id', 'parent_task_id', 'created_by')
ORDER BY column_name;