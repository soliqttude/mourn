-- mourn migration: add new columns and tables
-- Run once on your production database:
--   psql $DATABASE_URL -f migrate.sql
-- OR with your DB tool of choice.

-- guild_settings: new filter + antiraid + ticket columns
ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS antiraid_require_avatar   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS antiraid_manual_state      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS caps_filter_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS spoilers_filter_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mass_mention_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS emoji_filter_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS music_files_filter_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ticket_trainee_role        TEXT,
  ADD COLUMN IF NOT EXISTS ticket_inactivity_hours    INTEGER,
  ADD COLUMN IF NOT EXISTS ticket_naming_template     TEXT;

-- autoresponders: exclusive channel/role + role rewards
ALTER TABLE autoresponders
  ADD COLUMN IF NOT EXISTS exclusive_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS exclusive_role_id    TEXT,
  ADD COLUMN IF NOT EXISTS reward_role_add      TEXT,
  ADD COLUMN IF NOT EXISTS reward_role_remove   TEXT;

-- tickets: close reason + last activity tracking
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS close_reason     TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- suggestions: staff note + review message tracking
ALTER TABLE suggestions
  ADD COLUMN IF NOT EXISTS review_message_id TEXT,
  ADD COLUMN IF NOT EXISTS staff_note        TEXT;

-- antinuke_admins: delegated antinuke management
CREATE TABLE IF NOT EXISTS antinuke_admins (
  guild_id TEXT NOT NULL,
  user_id  TEXT NOT NULL,
  PRIMARY KEY (guild_id, user_id)
);

-- ticket_forms: per-topic modal form fields
CREATE TABLE IF NOT EXISTS ticket_forms (
  id       SERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  topic    TEXT,
  fields   JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS ticket_forms_guild_idx ON ticket_forms (guild_id);

-- suggest_extended: threads toggle, custom emojis, review channel, ignore list
CREATE TABLE IF NOT EXISTS suggest_extended (
  guild_id        TEXT PRIMARY KEY,
  threads_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  upvote_emoji    TEXT    NOT NULL DEFAULT '👍',
  downvote_emoji  TEXT    NOT NULL DEFAULT '👎',
  review_channel  TEXT,
  review_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  ignore_ids      JSONB   NOT NULL DEFAULT '[]'
);

-- moderation setup: jail channel tracking
ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS jail_channel TEXT;

-- antinuke: per-module configuration
CREATE TABLE IF NOT EXISTS antinuke_modules (
  guild_id       TEXT    NOT NULL,
  module         TEXT    NOT NULL,
  enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  threshold      INTEGER NOT NULL DEFAULT 3,
  punishment     TEXT    NOT NULL DEFAULT 'ban',
  count_commands BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (guild_id, module)
);
