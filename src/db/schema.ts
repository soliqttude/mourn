import {
  pgTable, text, bigint, integer, boolean, timestamp, jsonb,
  serial, primaryKey, index, real,
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
  antinukeThreshold: integer("antinuke_threshold").default(3).notNull(),
  antinukeLogChannel: text("antinuke_log_channel"),
  antiraidEnabled: boolean("antiraid_enabled").default(false).notNull(),
  antiraidThreshold: integer("antiraid_threshold").default(8).notNull(),
  antiraidJoinAge: integer("antiraid_join_age").default(7).notNull(),
  antiraidAction: text("antiraid_action").default("kick").notNull(),
  antiraidLogChannel: text("antiraid_log_channel"),
  antiraidLockOnRaid: boolean("antiraid_lock_on_raid").default(false).notNull(),
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
  ticketCount: integer("ticket_count").default(0).notNull(),
  ticketTopics: jsonb("ticket_topics").$type<Array<{ name: string; emoji?: string; description?: string }>>().default([]).notNull(),
  levelsEnabled: boolean("levels_enabled").default(true).notNull(),
  levelUpChannel: text("level_up_channel"),
  jailRole: text("jail_role"),
  muteRole: text("mute_role"),
  autoroleId: text("autorole_id"),
  confessionChannel: text("confession_channel"),
  reportChannel: text("report_channel"),
  suggestionsChannel: text("suggestions_channel"),
  birthdayChannel: text("birthday_channel"),
  countingChannel: text("counting_channel"),
  verificationChannel: text("verification_channel"),
  verificationRole: text("verification_role"),
  bumpChannel: text("bump_channel"),
  bumpRoleId: text("bump_role_id"),
  serverType: text("server_type"),
  dropChannel: text("drop_channel"),
  economyFrozen: boolean("economy_frozen").default(false).notNull(),
  // ── New columns ──────────────────────────────────────────────────────────────
  imageMuteRole: text("image_mute_role"),
  reactionMuteRole: text("reaction_mute_role"),
  staffRoleIds: jsonb("staff_role_ids").$type<string[]>().default([]).notNull(),
  // Bot customization per guild
  customizeAvatar: text("customize_avatar"),
  customizeBanner: text("customize_banner"),
  customizeBio: text("customize_bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const antinukeWhitelist = pgTable("antinuke_whitelist",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) }),
);

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
export const shameMessages = pgTable("shame_messages", {
  originalMessageId: text("original_message_id").primaryKey(),
  guildId: text("guild_id").notNull(),
  shameMessageId: text("shame_message_id").notNull(),
  count: integer("count").default(0).notNull(),
});
export const shameConfig = pgTable("shame_config", {
  guildId: text("guild_id").primaryKey(),
  channelId: text("channel_id").notNull(),
  threshold: integer("threshold").default(3).notNull(),
});
export const voicemasterChannels = pgTable("voicemaster_channels", {
  channelId: text("channel_id").primaryKey(), guildId: text("guild_id").notNull(), ownerId: text("owner_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  openerId: text("opener_id").notNull(),
  claimerId: text("claimer_id"),
  status: text("status").default("open").notNull(),
  topic: text("topic"),
  number: integer("number").default(0).notNull(),
  managementMessageId: text("management_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});
export const afk = pgTable("afk",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), message: text("message").notNull(), since: timestamp("since", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);
export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull(), channelId: text("channel_id").notNull(), guildId: text("guild_id"), message: text("message").notNull(), remindAt: timestamp("remind_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const economy = pgTable("economy",
  {
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    balance: bigint("balance", { mode: "number" }).default(0).notNull(),
    bank: bigint("bank", { mode: "number" }).default(0).notNull(),
    lastDaily: timestamp("last_daily", { withTimezone: true }),
    lastRob: timestamp("last_rob", { withTimezone: true }),
    streak: integer("streak").default(0).notNull(),
    streakUpdatedAt: timestamp("streak_updated_at", { withTimezone: true }),
    prestige: integer("prestige").default(0).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);

export const userRep = pgTable("user_rep",
  {
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    repCount: integer("rep_count").default(0).notNull(),
    lastRepGiven: timestamp("last_rep_given", { withTimezone: true }),
    lastRepRecipient: text("last_rep_recipient"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);

export const activeBuffs = pgTable("active_buffs", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  userId: text("user_id").notNull(),
  buffType: text("buff_type").notNull(),
  multiplier: real("multiplier").default(1.5).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
  (t) => ({ guildUserIdx: index("active_buffs_guild_user_idx").on(t.guildId, t.userId) })
);

export const userMood = pgTable("user_mood",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), mood: text("mood").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() },
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
  id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), invitedUserId: text("invited_user_id").notNull(), inviterId: text("inviter_id"), code: text("code"), joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(), leftAt: timestamp("left_at", { withTimezone: true }), isFake: boolean("is_fake").default(false).notNull(),
});
export const inviteBonus = pgTable("invite_bonus",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), bonus: integer("bonus").default(0).notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);
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
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    prize: text("prize").notNull(),
    winnersCount: integer("winners_count").default(1).notNull(),
    hostId: text("host_id").notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    ended: boolean("ended").default(false).notNull(),
    winners: jsonb("winners").$type<string[]>().default([]).notNull(),
    // New fields
    description: text("description"),
    thumbnail: text("thumbnail"),
    imageUrl: text("image_url"),
    requiredRoleIds: jsonb("required_role_ids").$type<string[]>().default([]).notNull(),
    minLevel: integer("min_level"),
    maxLevel: integer("max_level"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
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
export const marriages = pgTable("marriages",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), user1Id: text("user1_id").notNull(), user2Id: text("user2_id").notNull(), marriedAt: timestamp("married_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildIdx: index("marriages_guild_idx").on(t.guildId) })
);
export const birthdays = pgTable("birthdays",
  { userId: text("user_id").notNull(), guildId: text("guild_id").notNull(), month: integer("month").notNull(), day: integer("day").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.guildId] }) })
);
export const suggestions = pgTable("suggestions",
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), messageId: text("message_id").notNull(), channelId: text("channel_id").notNull(), content: text("content").notNull(), upvotes: integer("upvotes").default(0).notNull(), downvotes: integer("downvotes").default(0).notNull(), status: text("status").default("pending").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ guildIdx: index("suggestions_guild_idx").on(t.guildId) })
);
export const countingData = pgTable("counting_data",
  { guildId: text("guild_id").primaryKey(), count: integer("count").default(0).notNull(), lastUserId: text("last_user_id"), highScore: integer("high_score").default(0).notNull() }
);
export const highlights = pgTable("highlights",
  { id: serial("id").primaryKey(), userId: text("user_id").notNull(), guildId: text("guild_id").notNull(), keyword: text("keyword").notNull() },
  (t) => ({ guildUserIdx: index("highlights_guild_user_idx").on(t.guildId, t.userId) })
);
export const autopublishChannels = pgTable("autopublish_channels",
  { guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.channelId] }) })
);
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  bio: text("bio"),
  socials: jsonb("socials").$type<Record<string, string>>().default({}).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Reaction Triggers ─────────────────────────────────────────────────────────
export const reactionTriggers = pgTable("reaction_triggers",
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    trigger: text("trigger").notNull(),
    emoji: text("emoji").notNull(),
  },
  (t) => ({ guildIdx: index("reaction_triggers_guild_idx").on(t.guildId) })
);

// ── Fake Permissions ──────────────────────────────────────────────────────────
export const fakePermissions = pgTable("fake_permissions",
  {
    guildId: text("guild_id").notNull(),
    roleId: text("role_id").notNull(),
    permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.roleId] }) })
);

// ── Auto Messages (Timers) ───────────────────────────────────────────────────
export const autoMessages = pgTable("auto_messages",
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    intervalMs: bigint("interval_ms", { mode: "number" }).notNull(),
    message: text("message").notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ guildIdx: index("auto_messages_guild_idx").on(t.guildId) })
);

// ── Command Aliases ───────────────────────────────────────────────────────────
export const commandAliases = pgTable("command_aliases",
  {
    guildId: text("guild_id").notNull(),
    alias: text("alias").notNull(),
    command: text("command").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.alias] }) })
);

// ── Booster Roles ─────────────────────────────────────────────────────────────
export const boosterRoles = pgTable("booster_roles",
  {
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    roleId: text("role_id").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);
export const boosterRoleConfig = pgTable("booster_role_config", {
  guildId: text("guild_id").primaryKey(),
  baseRoleId: text("base_role_id"),
});

// ── Invoke Messages ───────────────────────────────────────────────────────────
export const invokeMessages = pgTable("invoke_messages",
  {
    guildId: text("guild_id").notNull(),
    command: text("command").notNull(),
    type: text("type").notNull(),
    content: text("content").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.command, t.type] }) })
);

// ── Counters ─────────────────────────────────────────────────────────────────
export const counters = pgTable("counters",
  {
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    type: text("type").notNull(),
    template: text("template").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.type] }) })
);

// ── Last.fm Accounts ─────────────────────────────────────────────────────────
export const lastfmAccounts = pgTable('lastfm_accounts', {
  userId:   text('user_id').primaryKey(),
  username: text('username').notNull(),
});
