-- Ensure model columns have sane defaults and existing rows are usable.
-- Recommended convention: store 'auto' to let the app choose the best available model at runtime.

ALTER TABLE IF EXISTS user_settings
  ALTER COLUMN ai_model SET DEFAULT 'auto';

ALTER TABLE IF EXISTS user_settings
  ALTER COLUMN commit_model SET DEFAULT 'auto';

ALTER TABLE IF EXISTS user_settings
  ALTER COLUMN pr_model SET DEFAULT 'auto';

UPDATE user_settings
SET ai_model = 'auto'
WHERE ai_model IS NULL OR btrim(ai_model) = '';

UPDATE user_settings
SET commit_model = 'auto'
WHERE commit_model IS NULL OR btrim(commit_model) = '';

UPDATE user_settings
SET pr_model = 'auto'
WHERE pr_model IS NULL OR btrim(pr_model) = '';
