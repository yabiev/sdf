-- Проверка прав доступа к таблице task_assignees
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'task_assignees'
  AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Если нет прав, добавляем их
GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_assignees TO authenticated;

-- Проверяем снова
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name = 'task_assignees'
  AND grantee IN ('anon', 'authenticated')