import { pool } from './index.js';
import { logger } from '../lib/logger.js';

const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT ',',
    mod_log_channel TEXT, msg_log_channel TEXT, join_log_channel TEXT, voice_log_channel TEXT,
    welcome_channel TEXT, welcome_message TEXT, goodbye_channel TEXT, goodbye_message TEXT,
    boost_channel TEXT, boost_message TEXT,
    antinuke_enabled BOOLEAN NOT NULL DEFAULT false, antinuke_action TEXT NOT NULL DEFAULT 'ban',
    antinuke_threshold INTEGER NOT NULL DEFAULT 3, antinuke_log_channel TEXT,
    antiraid_enabled BOOLEAN NOT NULL DEFAULT false, antiraid_threshold INTEGER NOT NULL DEFAULT 8,
    antiraid_join_age INTEGER NOT NULL DEFAULT 7,
    antiraid_action TEXT NOT NULL DEFAULT 'kick', antiraid_log_channel TEXT,
    antiraid_lock_on_raid BOOLEAN NOT NULL DEFAULT false,
    automod_enabled BOOLEAN NOT NULL DEFAULT false,
    link_filter_enabled BOOLEAN NOT NULL DEFAULT false, invite_filter_enabled BOOLEAN NOT NULL DEFAULT false,
    starboard_channel TEXT, starboard_emoji TEXT NOT NULL DEFAULT '⭐', starboard_threshold INTEGER NOT NULL DEFAULT 3,
    voicemaster_hub TEXT, voicemaster_category TEXT,
    ticket_category TEXT, ticket_support_role TEXT, ticket_log_channel TEXT,
    levels_enabled BOOLEAN NOT NULL DEFAULT true,
    jail_role TEXT, mute_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Existing column additions (idempotent)
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS autorole_id TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS confession_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS report_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS level_up_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS suggestions_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS birthday_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS counting_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS verification_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS verification_role TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS bump_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS bump_role_id TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS server_type TEXT`,
  // New anti-nuke / anti-raid columns (safe on existing DBs)
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS antinuke_threshold INTEGER NOT NULL DEFAULT 3`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS antinuke_log_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS antiraid_action TEXT NOT NULL DEFAULT 'kick'`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS antiraid_log_channel TEXT`,
  `ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS antiraid_lock_on_raid BOOLEAN NOT NULL DEFAULT false`,
  // Anti-nuke whitelist table
  `CREATE TABLE IF NOT EXISTS antinuke_whitelist (
    guild_id TEXT NOT NULL,
    user_id  TEXT NOT NULL,
    PRIMARY KEY (guild_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS warnings (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL, reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS warnings_guild_user_idx ON warnings (guild_id, user_id)`,
  `CREATE TABLE IF NOT EXISTS tags (
    guild_id TEXT NOT NULL, name TEXT NOT NULL, response TEXT NOT NULL,
    created_by TEXT NOT NULL, uses INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (guild_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS autoresponders (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, trigger TEXT NOT NULL,
    response TEXT NOT NULL, match_type TEXT NOT NULL DEFAULT 'contains',
    created_by TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS ar_guild_idx ON autoresponders (guild_id)`,
  `CREATE TABLE IF NOT EXISTS reaction_roles (
    guild_id TEXT NOT NULL, message_id TEXT NOT NULL, emoji TEXT NOT NULL,
    role_id TEXT NOT NULL, channel_id TEXT NOT NULL, PRIMARY KEY (message_id, emoji)
  )`,
  `CREATE INDEX IF NOT EXISTS rr_guild_idx ON reaction_roles (guild_id)`,
  `CREATE TABLE IF NOT EXISTS reaction_role_messages (
    message_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS starboard_messages (
    guild_id TEXT NOT NULL, original_message_id TEXT PRIMARY KEY,
    starboard_message_id TEXT NOT NULL, stars INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS voicemaster_channels (
    channel_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, owner_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL,
    opener_id TEXT NOT NULL, claimer_id TEXT, status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ
  )`,
  `CREATE TABLE IF NOT EXISTS ticket_panels (
    guild_id TEXT NOT NULL, message_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS afk (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, message TEXT NOT NULL,
    since TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (guild_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, channel_id TEXT NOT NULL,
    guild_id TEXT, message TEXT NOT NULL, remind_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS economy (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0, bank BIGINT NOT NULL DEFAULT 0,
    last_daily TIMESTAMPTZ, PRIMARY KEY (guild_id, user_id)
  )`,
  `ALTER TABLE economy ADD COLUMN IF NOT EXISTS last_rob TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS levels (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ, PRIMARY KEY (guild_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS level_rewards (
    guild_id TEXT NOT NULL, level INTEGER NOT NULL, role_id TEXT NOT NULL,
    PRIMARY KEY (guild_id, level)
  )`,
  `CREATE TABLE IF NOT EXISTS invite_cache (
    guild_id TEXT NOT NULL, code TEXT NOT NULL, uses INTEGER NOT NULL DEFAULT 0,
    inviter_id TEXT, PRIMARY KEY (guild_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS invite_uses (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, invited_user_id TEXT NOT NULL,
    inviter_id TEXT, code TEXT, joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS blacklist (
    user_id TEXT PRIMARY KEY, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS giveaways (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL,
    message_id TEXT, prize TEXT NOT NULL, winners_count INTEGER NOT NULL DEFAULT 1,
    host_id TEXT NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
    ended BOOLEAN NOT NULL DEFAULT false, winners JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS giveaways_guild_idx ON giveaways (guild_id)`,
  `CREATE TABLE IF NOT EXISTS word_filter (
    guild_id TEXT NOT NULL, word TEXT NOT NULL, PRIMARY KEY (guild_id, word)
  )`,
  `CREATE TABLE IF NOT EXISTS mod_notes (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL, note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS mod_notes_guild_user_idx ON mod_notes (guild_id, user_id)`,
  `CREATE TABLE IF NOT EXISTS mod_cases (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL, action TEXT NOT NULL, reason TEXT NOT NULL,
    duration TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS mod_cases_guild_user_idx ON mod_cases (guild_id, user_id)`,
  `CREATE TABLE IF NOT EXISTS temp_bans (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL, reason TEXT NOT NULL, unban_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS temp_bans_guild_idx ON temp_bans (guild_id)`,
  `CREATE TABLE IF NOT EXISTS shop_items (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '', price BIGINT NOT NULL DEFAULT 100,
    role_id TEXT, stock INTEGER NOT NULL DEFAULT -1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS shop_items_guild_idx ON shop_items (guild_id)`,
  `CREATE TABLE IF NOT EXISTS user_items (
    guild_id TEXT NOT NULL, user_id TEXT NOT NULL, item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (guild_id, user_id, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, reporter_id TEXT NOT NULL,
    target_id TEXT NOT NULL, reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS reports_guild_idx ON reports (guild_id)`,
  `CREATE TABLE IF NOT EXISTS marriages (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL, married_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS marriages_guild_idx ON marriages (guild_id)`,
  `CREATE TABLE IF NOT EXISTS birthdays (
    user_id TEXT NOT NULL, guild_id TEXT NOT NULL,
    month INTEGER NOT NULL, day INTEGER NOT NULL, PRIMARY KEY (user_id, guild_id)
  )`,
  `CREATE TABLE IF NOT EXISTS suggestions (
    id SERIAL PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
    message_id TEXT NOT NULL, channel_id TEXT NOT NULL, content TEXT NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0, downvotes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS suggestions_guild_idx ON suggestions (guild_id)`,
  `CREATE TABLE IF NOT EXISTS counting_data (
    guild_id TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0,
    last_user_id TEXT, high_score INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS highlights (
    id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, guild_id TEXT NOT NULL, keyword TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS highlights_guild_user_idx ON highlights (guild_id, user_id)`,
  `CREATE TABLE IF NOT EXISTS autopublish_channels (
    guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, PRIMARY KEY (guild_id, channel_id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    bio TEXT,
    socials JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
];

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    for (const sql of STATEMENTS) {
      await client.query(sql);
    }
  } finally {
    client.release();
  }
  logger.info('Database migrations complete.');
}
