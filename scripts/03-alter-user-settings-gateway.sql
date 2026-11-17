ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS ai_gateway_api_key TEXT;
