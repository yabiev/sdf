-- Add missing columns to projects table
ALTER TABLE projects ADD COLUMN creator_id TEXT;
ALTER TABLE projects ADD COLUMN color TEXT;
ALTER TABLE projects ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE projects ADD COLUMN telegram_topic_id TEXT;

-- Update existing projects to have creator_id same as owner_id
UPDATE projects SET creator_id = owner_id WHERE creator_id IS NULL;