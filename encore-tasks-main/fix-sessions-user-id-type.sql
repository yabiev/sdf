-- Исправление типа данных user_id в таблице sessions
-- Изменение с integer на UUID для соответствия типу id в таблице users

BEGIN;

-- Удаляем все существующие записи из sessions (если есть)
-- так как изменение типа данных может вызвать проблемы с существующими данными
DELETE FROM sessions;

-- Изменяем тип столбца user_id с integer на UUID
ALTER TABLE sessions 
ALTER COLUMN user_id TYPE UUID USING user_id::text::UUID;

-- Добавляем внешний ключ для обеспечения целостности данных
ALTER TABLE sessions 
ADD CONSTRAINT fk_sessions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;

-- Проверяем результат
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sessions' AND column_name = 'user_id';