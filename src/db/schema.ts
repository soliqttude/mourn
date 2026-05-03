import {
  pgTable, text, bigint, integer, boolean, timestamp, jsonb,
  serial, primaryKey, index,
} from "drizzle-orm/pg-core";

export const guildSettings = pgTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  prefix: text("prefix").default(",").notNull(),
  modLogChannel: text("mod_log_channel"),
  msgLogChannel: text("msg_log_channel"),
  joinLogChannel: text("join_log_channel"),
  voiceLogChannel: text("voice_log_channel"),
  welcomeChannel: text("welcome_channel"),
  welcomeMessage: text("welcome_message"),
  goodbyeChannel: text("goodbye_channel"),
  goodbyeMessage: text("goodbye_message"),
  boostChannel: text("boost_channel"),
  boostMessage: text("boost_message"),
  antinukeEnabled: boolean("antinuke_enabled").default(false).notNull(),
  antinukeAction: text("antinuke_action").default("ban").notNull(),
  antiraidEnabled: boolean("antiraid_enabled").default(false).notNull(),
  antiraidThreshold: integer("antiraid_threshold").default(8).notNull(),
  antiraidJoinAge: integer("antiraid_join_age").default(7).notNull(),
  automodEnabled: boolean("automod_enabled").default(false).notNull(),
  linkFilterEnabled: boolean("link_filter_enabled").default(false).notNull(),
  inviteFilterEnabled: boolean("invite_filter_enabled").default(false).notNull(),
  starboardChannel: text("starboard_channel"),
  starboardEmoji: text("starboard_emoji").default("⭐").notNull(),
  starboardThreshold: integer("starboard_threshold").default(3).notNull(),
  voicemasterHub: text("voicemaster_hub"),
  voicemasterCategory: text("voicemaster_category"),
  ticketCategory: text("ticket_category"),
  ticketSupportRole: text("ticket_support_role"),
  ticketLogChannel: text("ticket_log_channel"),
  levelsEnabled: boolean("levels_enabled").default(true).notNull(),
  jailRole: text("jail_role"),
  muteRole: text("mute_role"),
  autoroleId: text("autorole_id"),
  confessionChannel: text("confession_channel"),
  reportChannel: text("report_channel"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const warnings = pgTable("warnings",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), moderatorId: text("moderator_id").notNull(), reason: text("reason").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildUserIdx: index("warnings_guild_user_idx").on(t.guildId, t.userId) })
);

export const tags = pgTable("tags",
  { guildId: text("guild_id").notNull(), name: text("name").notNull(), response: text("response").notNull(), createdBy: text("created_by").notNull(), uses: integer("uses").default(0).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.name] }) })
);

export const autoresponders = pgTable("autoresponders",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), trigger: text("trigger").notNull(), response: text("response").notNull(), matchType: text("match_type").default("contains").notNull(), createdBy: text("created_by").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildIdx: index("ar_guild_idx").on(t.guildId) })
);

export const reactionRoles = pgTable("reaction_roles",
  { guildId: text("guild_id").notNull(), messageId: text("message_id").notNull(), emoji: text("emoji").notNull(), roleId: text("role_id").notNull(), channelId: text("channel_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.messageId, t.emoji] }), guildIdx: index("rr_guild_idx").on(t.guildId) })
);

export const starboardMessages = pgTable("starboard_messages", {
  guildId: text("guild_id").notNull(), originalMessageId: text("original_message_id").primaryKey(), starboardMessageId: text("starboard_message_id").notNull(), stars: integer("stars").default(0).notNull(),
});

export const voicemasterChannels = pgTable("voicemaster_channels", {
  channelId: text("channel_id").primaryKey(), guildId: text("guild_id").notNull(), ownerId: text("owner_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(), openerId: text("opener_id").notNull(), claimerId: text("claimer_id"), status: text("status").default("open").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), closedAt: timestamp("closed_at", { withTimezone: true }),
});

export const afk = pgTable("afk",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), message: text("message").notNull(), since: timestamp("since", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull(), channelId: text("channel_id").notNull(), guildId: text("guild_id"), message: text("message").notNull(), remindAt: timestamp("remind_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const economy = pgTable("economy",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), balance: bigint("balance", { mode: "number" }).default(0).notNull(), bank: bigint("bank", { mode: "number" }).default(0).notNull(), lastDaily: timestamp("last_daily", { withTimezone: true }), lastRob: timestamp("last_rob", { withTimezone: true }) },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);

export const levels = pgTable("levels",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), xp: integer("xp").default(0).notNull(), level: integer("level").default(0).notNull(), lastMessageAt: timestamp("last_message_at", { withTimezone: true }) },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);

export const levelRewards = pgTable("level_rewards",
  { guildId: text("guild_id").notNull(), level: integer("level").notNull(), roleId: text("role_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.level] }) })
);

export const inviteCache = pgTable("invite_cache",
  { guildId: text("guild_id").notNull(), code: text("code").notNull(), uses: integer("uses").default(0).notNull(), inviterId: text("inviter_id") },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.code] }) })
);

export const inviteUses = pgTable("invite_uses", {
  id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), invitedUserId: text("invited_user_id").notNull(), inviterId: text("inviter_id"), code: text("code"), joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

export const blacklist = pgTable("blacklist", {
  userId: text("user_id").primaryKey(), reason: text("reason"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ticketPanels = pgTable("ticket_panels", {
  guildId: text("guild_id").notNull(), messageId: text("message_id").primaryKey(), channelId: text("channel_id").notNull(),
});

export const reactionRoleMessages = pgTable("reaction_role_messages", {
  messageId: text("message_id").primaryKey(), guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(),
});

export const giveaways = pgTable("giveaways",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(), messageId: text("message_id"), prize: text("prize").notNull(), winnersCount: integer("winners_count").default(1).notNull(), hostId: text("host_id").notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), ended: boolean("ended").default(false).notNull(), winners: jsonb("winners").$type<string[]>().default([]).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildIdx: index("giveaways_guild_idx").on(t.guildId) })
);

export const wordFilter = pgTable("word_filter",
  { guildId: text("guild_id").notNull(), word: text("word").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.word] }) })
);

export const modNotes = pgTable("mod_notes",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), moderatorId: text("moderator_id").notNull(), note: text("note").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildUserIdx: index("mod_notes_guild_user_idx").on(t.guildId, t.userId) })
);

export const modCases = pgTable("mod_cases",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), moderatorId: text("moderator_id").notNull(), action: text("action").notNull(), reason: text("reason").notNull(), duration: text("duration"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildUserIdx: index("mod_cases_guild_user_idx").on(t.guildId, t.userId) })
);

export const tempBans = pgTable("temp_bans",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), moderatorId: text("moderator_id").notNull(), reason: text("reason").notNull(), unbanAt: timestamp("unban_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildIdx: index("temp_bans_guild_idx").on(t.guildId) })
);

export const shopItems = pgTable("shop_items",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), name: text("name").notNull(), description: text("description").default("").notNull(), price: bigint("price", { mode: "number" }).default(100).notNull(), roleId: text("role_id"), stock: integer("stock").default(-1).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildIdx: index("shop_items_guild_idx").on(t.guildId) })
);

export const userItems = pgTable("user_items",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), itemId: integer("item_id").notNull(), quantity: integer("quantity").default(1).notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId, t.itemId] }) })
);

export const reports = pgTable("reports",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), reporterId: text("reporter_id").notNull(), targetId: text("target_id").notNull(), reason: text("reason").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildIdx: index("reports_guild_idx").on(t.guildId) })
);
