import { query } from "./db"

export type UserSettingsRow = {
  ai_provider: string | null
  groq_api_key: string | null
  ollama_endpoint: string | null
  ai_model: string | null
  commit_provider: string | null
  commit_model: string | null
  pr_provider: string | null
  pr_model: string | null
  pr_template: string | null
  use_caveman: boolean | null
}

export async function ensureUserExists(user: { id: string; email?: string | null; name?: string | null; image?: string | null }) {
  await query(
    `
      INSERT INTO users (id, email, name, avatar_url, google_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, users.email),
        name = COALESCE(EXCLUDED.name, users.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        google_id = COALESCE(EXCLUDED.google_id, users.google_id)
    `,
    [user.id, user.email ?? null, user.name ?? null, user.image ?? null, user.id],
  )
}

export async function getUserSettings(userId: string): Promise<UserSettingsRow | null> {
  const { rows } = await query<UserSettingsRow>(
    `
      SELECT
        ai_provider,
        groq_api_key,
        ollama_endpoint,
        ai_model,
        commit_provider,
        commit_model,
        pr_provider,
        pr_model,
        pr_template,
        use_caveman
      FROM user_settings
      WHERE user_id = $1
    `,
    [userId],
  )

  return rows[0] ?? null
}

export async function upsertUserSettings(
  userId: string,
  settings: UserSettingsRow,
): Promise<UserSettingsRow> {
  const { rows } = await query<UserSettingsRow>(
    `
      INSERT INTO user_settings (
        user_id,
        ai_provider,
        groq_api_key,
        ollama_endpoint,
        ai_model,
        commit_provider,
        commit_model,
        pr_provider,
        pr_model,
        pr_template,
        use_caveman
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id)
      DO UPDATE SET
        ai_provider = EXCLUDED.ai_provider,
        groq_api_key = EXCLUDED.groq_api_key,
        ollama_endpoint = EXCLUDED.ollama_endpoint,
        ai_model = EXCLUDED.ai_model,
        commit_provider = EXCLUDED.commit_provider,
        commit_model = EXCLUDED.commit_model,
        pr_provider = EXCLUDED.pr_provider,
        pr_model = EXCLUDED.pr_model,
        pr_template = EXCLUDED.pr_template,
        use_caveman = EXCLUDED.use_caveman
      RETURNING
        ai_provider,
        groq_api_key,
        ollama_endpoint,
        ai_model,
        commit_provider,
        commit_model,
        pr_provider,
        pr_model,
        pr_template,
        use_caveman
    `,
    [
      userId,
      settings.ai_provider,
      settings.groq_api_key,
      settings.ollama_endpoint,
      settings.ai_model,
      settings.commit_provider,
      settings.commit_model,
      settings.pr_provider,
      settings.pr_model,
      settings.pr_template,
      settings.use_caveman ?? false,
    ],
  )

  return rows[0]
}

export type PromptRecord = {
  id: string
  original_prompt: string
  enhanced_prompt: string
  created_at: string
}

export async function insertPrompt(
  userId: string,
  originalPrompt: string,
  enhancedPrompt: string,
): Promise<PromptRecord> {
  const { rows } = await query<PromptRecord>(
    `
      INSERT INTO prompts (user_id, original_prompt, enhanced_prompt)
      VALUES ($1, $2, $3)
      RETURNING id, original_prompt, enhanced_prompt, created_at
    `,
    [userId, originalPrompt, enhancedPrompt],
  )

  return rows[0]
}

export async function getUserPrompts(userId: string): Promise<PromptRecord[]> {
  const { rows } = await query<PromptRecord>(
    `
      SELECT id, original_prompt, enhanced_prompt, created_at
      FROM prompts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  )

  return rows
}

export async function deleteUserPrompt(userId: string, promptId: string): Promise<boolean> {
  const { rowCount } = await query(
    `
      DELETE FROM prompts
      WHERE id = $1 AND user_id = $2
    `,
    [promptId, userId],
  )

  return (rowCount ?? 0) > 0
}
