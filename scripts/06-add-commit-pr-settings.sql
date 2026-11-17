-- Add workflow-specific settings so each feature can use its best provider/model
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS commit_provider VARCHAR(50) DEFAULT 'ollama',
  ADD COLUMN IF NOT EXISTS commit_model TEXT,
  ADD COLUMN IF NOT EXISTS pr_provider VARCHAR(50) DEFAULT 'groq',
  ADD COLUMN IF NOT EXISTS pr_model TEXT,
  ADD COLUMN IF NOT EXISTS pr_template TEXT;
