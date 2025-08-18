-- =====================================================
-- СТРУКТУРА БАЗЫ ДАННЫХ ДЛЯ СИСТЕМЫ УПРАВЛЕНИЯ ЗАДАЧАМИ
-- =====================================================
-- Создание базы данных
CREATE DATABASE encore_tasks_db;
\c encore_tasks_db;

-- Включение расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    avatar TEXT,
    telegram_chat_id BIGINT,
    telegram_username VARCHAR(255),
    notification_settings JSONB DEFAULT '{
        "email": true,
        "telegram": false,
        "browser": true,
        "taskAssigned": true,
        "taskCompleted": true,
        "projectUpdates": true
    }',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для таблицы пользователей
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ТАБЛИЦА ПРОЕКТОВ
-- =====================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    telegram_chat_id BIGINT,
    telegram_topic_id INTEGER,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для таблицы проектов
CREATE INDEX idx_projects_creator_id ON projects(creator_id);
CREATE INDEX idx_projects_name ON projects USING gin(name gin_trgm_ops);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_is_archived ON projects(is_archived);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ТАБЛИЦА УЧАСТНИКОВ ПРОЕКТОВ
-- =====================================================
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Индексы для таблицы участников проектов
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- =====================================================
-- ТАБЛИЦА ДОСОК
-- =====================================================
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    icon VARCHAR(50) DEFAULT 'kanban',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы досок
CREATE INDEX idx_boards_project_id ON boards(project_id);
CREATE INDEX idx_boards_name ON boards USING gin(name gin_trgm_ops);
CREATE INDEX idx_boards_is_default ON boards(is_default);

-- =====================================================
-- ТАБЛИЦА КОЛОНОК
-- =====================================================
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6366f1',
    task_limit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы колонок
CREATE INDEX idx_columns_board_id ON columns(board_id);
CREATE INDEX idx_columns_position ON columns(position);
CREATE UNIQUE INDEX idx_columns_board_position ON columns(board_id, position);

-- =====================================================
-- ТАБЛИЦА ЗАДАЧ
-- =====================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'done')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    story_points INTEGER,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    deadline TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для таблицы задач
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_board_id ON tasks(board_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_reporter_id ON tasks(reporter_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_tasks_is_archived ON tasks(is_archived);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_title ON tasks USING gin(title gin_trgm_ops);
CREATE INDEX idx_tasks_description ON tasks USING gin(description gin_trgm_ops);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ТАБЛИЦА НАЗНАЧЕНИЙ ЗАДАЧ
-- =====================================================
CREATE TABLE task_assignees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(task_id, user_id)
);

-- Индексы для таблицы назначений задач
CREATE INDEX idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON task_assignees(user_id);
CREATE INDEX idx_task_assignees_assigned_by ON task_assignees(assigned_by);

-- =====================================================
-- ТАБЛИЦА ТЕГОВ
-- =====================================================
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, project_id)
);

-- Индексы для таблицы тегов
CREATE INDEX idx_tags_project_id ON tags(project_id);
CREATE INDEX idx_tags_name ON tags(name);

-- =====================================================
-- ТАБЛИЦА СВЯЗЕЙ ЗАДАЧ И ТЕГОВ
-- =====================================================
CREATE TABLE task_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(task_id, tag_id)
);

-- Индексы для таблицы связей задач и тегов
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);

-- =====================================================
-- ТАБЛИЦА ВЛОЖЕНИЙ
-- =====================================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы вложений
CREATE INDEX idx_attachments_task_id ON attachments(task_id);
CREATE INDEX idx_attachments_uploader_id ON attachments(uploader_id);
CREATE INDEX idx_attachments_uploaded_at ON attachments(uploaded_at);

-- =====================================================
-- ТАБЛИЦА КОММЕНТАРИЕВ
-- =====================================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для таблицы комментариев
CREATE INDEX idx_comments_task_id ON comments(task_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comments_deleted_at ON comments(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================
-- ТАБЛИЦА УВЕДОМЛЕНИЙ
-- =====================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'task_updated', 'project_updated', 'comment_added', 'deadline_reminder')),
    related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_telegram BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Индексы для таблицы уведомлений
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_related_task_id ON notifications(related_task_id);
CREATE INDEX idx_notifications_related_project_id ON notifications(related_project_id);

-- =====================================================
-- ТАБЛИЦА ЖУРНАЛА ДЕЙСТВИЙ
-- =====================================================
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('user', 'project', 'board', 'task', 'comment', 'attachment')),
    entity_id UUID NOT NULL,
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы журнала действий
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX idx_activity_log_task_id ON activity_log(task_id);
CREATE INDEX idx_activity_log_session_id ON activity_log(session_id);

-- Составной индекс для быстрого поиска по пользователю и времени
CREATE INDEX idx_activity_log_user_created ON activity_log(user_id, created_at DESC);

-- =====================================================
-- ТАБЛИЦА СЕССИЙ
-- =====================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы сессий
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity_at);

-- =====================================================
-- ТАБЛИЦА НАСТРОЕК СИСТЕМЫ
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для таблицы настроек системы
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);

-- =====================================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ ВРЕМЕНИ
-- =====================================================

-- Функция для обновления поля updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_columns_updated_at BEFORE UPDATE ON columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ТРИГГЕРЫ ДЛЯ ЖУРНАЛИРОВАНИЯ ДЕЙСТВИЙ
-- =====================================================

-- Функция для логирования изменений в задачах
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, new_values, project_id, board_id, task_id)
        VALUES ('task_created', 'task', NEW.id, 'Создана новая задача: ' || NEW.title, to_jsonb(NEW), NEW.project_id, NEW.board_id, NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, new_values, project_id, board_id, task_id)
        VALUES ('task_updated', 'task', NEW.id, 'Обновлена задача: ' || NEW.title, to_jsonb(OLD), to_jsonb(NEW), NEW.project_id, NEW.board_id, NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, project_id, board_id, task_id)
        VALUES ('task_deleted', 'task', OLD.id, 'Удалена задача: ' || OLD.title, to_jsonb(OLD), OLD.project_id, OLD.board_id, OLD.id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Триггер для логирования изменений задач
CREATE TRIGGER log_task_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_changes();

-- Функция для логирования изменений в проектах
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, new_values, project_id)
        VALUES ('project_created', 'project', NEW.id, 'Создан новый проект: ' || NEW.name, to_jsonb(NEW), NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, new_values, project_id)
        VALUES ('project_updated', 'project', NEW.id, 'Обновлен проект: ' || NEW.name, to_jsonb(OLD), to_jsonb(NEW), NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, project_id)
        VALUES ('project_deleted', 'project', OLD.id, 'Удален проект: ' || OLD.name, to_jsonb(OLD), OLD.id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Триггер для логирования изменений проектов
CREATE TRIGGER log_project_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_project_changes();

-- =====================================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ УДОБНОГО ДОСТУПА К ДАННЫМ
-- =====================================================

-- Представление для задач с полной информацией
CREATE VIEW tasks_full AS
SELECT 
    t.*,
    p.name as project_name,
    b.name as board_name,
    c.title as column_title,
    r.name as reporter_name,
    r.email as reporter_email,
    pt.title as parent_task_title,
    COALESCE(assignee_list.assignees, '[]'::jsonb) as assignees,
    COALESCE(tag_list.tags, '[]'::jsonb) as tags,
    COALESCE(attachment_count.count, 0) as attachment_count,
    COALESCE(comment_count.count, 0) as comment_count,
    COALESCE(subtask_count.count, 0) as subtask_count
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN boards b ON t.board_id = b.id
LEFT JOIN columns c ON t.column_id = c.id
LEFT JOIN users r ON t.reporter_id = r.id
LEFT JOIN tasks pt ON t.parent_task_id = pt.id
LEFT JOIN (
    SELECT 
        ta.task_id,
        jsonb_agg(jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email)) as assignees
    FROM task_assignees ta
    JOIN users u ON ta.user_id = u.id
    GROUP BY ta.task_id
) assignee_list ON t.id = assignee_list.task_id
LEFT JOIN (
    SELECT 
        tt.task_id,
        jsonb_agg(jsonb_build_object('id', tg.id, 'name', tg.name, 'color', tg.color)) as tags
    FROM task_tags tt
    JOIN tags tg ON tt.tag_id = tg.id
    GROUP BY tt.task_id
) tag_list ON t.id = tag_list.task_id
LEFT JOIN (
    SELECT task_id, COUNT(*) as count
    FROM attachments
    GROUP BY task_id
) attachment_count ON t.id = attachment_count.task_id
LEFT JOIN (
    SELECT task_id, COUNT(*) as count
    FROM comments
    WHERE deleted_at IS NULL
    GROUP BY task_id
) comment_count ON t.id = comment_count.task_id
LEFT JOIN (
    SELECT parent_task_id, COUNT(*) as count
    FROM tasks
    WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY parent_task_id
) subtask_count ON t.id = subtask_count.parent_task_id
WHERE t.deleted_at IS NULL;

-- Представление для статистики проектов
CREATE VIEW project_statistics AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.color,
    p.created_at,
    u.name as creator_name,
    COALESCE(member_count.count, 0) as member_count,
    COALESCE(board_count.count, 0) as board_count,
    COALESCE(task_stats.total_tasks, 0) as total_tasks,
    COALESCE(task_stats.completed_tasks, 0) as completed_tasks,
    COALESCE(task_stats.in_progress_tasks, 0) as in_progress_tasks,
    COALESCE(task_stats.todo_tasks, 0) as todo_tasks,
    CASE 
        WHEN COALESCE(task_stats.total_tasks, 0) > 0 
        THEN ROUND((COALESCE(task_stats.completed_tasks, 0)::decimal / task_stats.total_tasks) * 100, 2)
        ELSE 0
    END as completion_percentage
FROM projects p
LEFT JOIN users u ON p.creator_id = u.id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM project_members
    GROUP BY project_id
) member_count ON p.id = member_count.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM boards
    GROUP BY project_id
) board_count ON p.id = board_count.project_id
LEFT JOIN (
    SELECT 
        project_id,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'todo') as todo_tasks
    FROM tasks
    WHERE deleted_at IS NULL AND is_archived = FALSE
    GROUP BY project_id
) task_stats ON p.id = task_stats.project_id
WHERE p.deleted_at IS NULL;

-- =====================================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С ДАННЫМИ
-- =====================================================

-- Функция для получения задач пользователя
CREATE OR REPLACE FUNCTION get_user_tasks(
    p_user_id UUID,
    p_project_id UUID DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    task_id UUID,
    title VARCHAR,
    description TEXT,
    status VARCHAR,
    priority VARCHAR,
    project_name VARCHAR,
    board_name VARCHAR,
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        p.name,
        b.name,
        t.deadline,
        t.created_at
    FROM tasks t
    JOIN task_assignees ta ON t.id = ta.task_id
    JOIN projects p ON t.project_id = p.id
    JOIN boards b ON t.board_id = b.id
    WHERE ta.user_id = p_user_id
        AND t.deleted_at IS NULL
        AND (p_project_id IS NULL OR t.project_id = p_project_id)
        AND (p_status IS NULL OR t.status = p_status)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Функция для очистки старых сессий
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================

-- Создание администратора по умолчанию
INSERT INTO users (id, name, email, password_hash, role, approval_status) 
VALUES (
    uuid_generate_v4(),
    'Администратор',
    'admin@encore-tasks.com',
    '$2b$10$example_hash_here', -- Замените на реальный хеш пароля
    'admin',
    'approved'
);

-- Настройки системы по умолчанию
INSERT INTO system_settings (key, value, description, is_public) VALUES
('app_name', '"Encore Tasks"', 'Название приложения', true),
('app_version', '"1.0.0"', 'Версия приложения', true),
('max_file_size', '10485760', 'Максимальный размер файла в байтах (10MB)', false),
('allowed_file_types', '["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt"]', 'Разрешенные типы файлов', false),
('session_timeout', '86400', 'Время жизни сессии в секундах (24 часа)', false),
('notification_batch_size', '100', 'Размер пакета для отправки уведомлений', false);

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ (RLS)
-- =====================================================

-- Включение RLS для критических таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Политика для пользователей: пользователи могут видеть только свои данные
CREATE POLICY users_policy ON users
    FOR ALL
    USING (id = current_setting('app.current_user_id')::UUID OR 
           EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id')::UUID AND role = 'admin'));

-- Политика для проектов: пользователи видят только проекты, в которых участвуют
CREATE POLICY projects_policy ON projects
    FOR ALL
    USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = id AND pm.user_id = current_setting('app.current_user_id')::UUID) OR
           EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id')::UUID AND role = 'admin'));

-- Политика для задач: пользователи видят задачи из своих проектов
CREATE POLICY tasks_policy ON tasks
    FOR ALL
    USING (EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = project_id AND pm.user_id = current_setting('app.current_user_id')::UUID) OR
           EXISTS (SELECT 1 FROM users WHERE id = current_setting('app.current_user_id')::UUID AND role = 'admin'));

-- =====================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- =====================================================

COMMENT ON TABLE users IS 'Таблица пользователей системы';
COMMENT ON TABLE projects IS 'Таблица проектов';
COMMENT ON TABLE project_members IS 'Таблица участников проектов';
COMMENT ON TABLE boards IS 'Таблица досок канбан';
COMMENT ON TABLE columns IS 'Таблица колонок досок';
COMMENT ON TABLE tasks IS 'Таблица задач';
COMMENT ON TABLE task_assignees IS 'Таблица назначений задач пользователям';
COMMENT ON TABLE tags IS 'Таблица тегов';
COMMENT ON TABLE task_tags IS 'Таблица связей задач и тегов';
COMMENT ON TABLE attachments IS 'Таблица вложений к задачам';
COMMENT ON TABLE comments IS 'Таблица комментариев к задачам';
COMMENT ON TABLE notifications IS 'Таблица уведомлений пользователей';
COMMENT ON TABLE activity_log IS 'Журнал всех действий в системе';
COMMENT ON TABLE user_sessions IS 'Таблица пользовательских сессий';
COMMENT ON TABLE system_settings IS 'Таблица настроек системы';

-- =====================================================
-- ЗАВЕРШЕНИЕ СОЗДАНИЯ СХЕМЫ
-- =====================================================

-- Анализ таблиц для оптимизации планировщика запросов
ANALYZE;

-- Вывод информации о созданной схеме
SELECT 'База данных успешно создана!' as status;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;