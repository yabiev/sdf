-- Add missing telegram columns to projects table
ALTER TABLE projects ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE projects ADD COLUMN telegram_topic_id TEXT;

-- Verify the changes
PRAGMA table_info(projects);