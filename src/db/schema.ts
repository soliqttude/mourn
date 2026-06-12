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
  roleLogChannel: text("role_log_channel"),
  serverLogChannel: text("server_log_channel"),
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
  antiraidRequireAvatar: boolean("antiraid_require_avatar").default(false).notNull(),
  antiraidManualState: boolean("antiraid_manual_state").default(false).notNull(),
  automodEnabled: boolean("automod_enabled").default(false).notNull(),
  linkFilterEnabled: boolean("link_filter_enabled").default(false).notNull(),
  inviteFilterEnabled: boolean("invite_filter_enabled").default(false).notNull(),
  capsFilterEnabled: boolean("caps_filter_enabled").default(false).notNull(),
  spoilersFilterEnabled: boolean("spoilers_filter_enabled").default(false).notNull(),
  massMentionEnabled: boolean("mass_mention_enabled").default(false).notNull(),
  emojiFilterEnabled: boolean("emoji_filter_enabled").default(false).notNull(),
  musicFilesFilterEnabled: boolean("music_files_filter_enabled").default(false).notNull(),
  starboardChannel: text("starboard_channel"),
  starboardEmoji: text("starboard_emoji").default("⭐").notNull(),
  starboardThreshold: integer("starboard_threshold").default(3).notNull(),
  voicemasterHub: text("voicemaster_hub"),
  voicemasterCategory: text("voicemaster_category"),
  ticketCategory: text("ticket_category"),
  ticketSupportRole: text("ticket_support_role"),
  ticketTraineeRole: text("ticket_trainee_role"),
  ticketLogChannel: text("ticket_log_channel"),
  ticketCount: integer("ticket_count").default(0).notNull(),
  ticketTopics: jsonb("ticket_topics").$type<Array<{ name: string; emoji?: string; description?: string }>>().default([]).notNull(),
  ticketInactivityHours: integer("ticket_inactivity_hours"),
  ticketNamingTemplate: text("ticket_naming_template"),
  levelsEnabled: boolean("levels_enabled").default(true).notNull(),
  levelUpChannel: text("level_up_channel"),
  jailRole: text("jail_role"),
  jailChannel: text("jail_channel"),
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
  imageMuteRole: text("image_mute_role"),
  reactionMuteRole: text("reaction_mute_role"),
  staffRoleIds: jsonb("staff_role_ids").$type<string[]>().default([]).notNull(),
  customizeAvatar: text("customize_avatar"),
  customizeBanner: text("customize_banner"),
  customizeBio: text("customize_bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const antinukeWhitelist = pgTable("antinuke_whitelist",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) }),
);

export const antinukeAdmins = pgTable("antinuke_admins",
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
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    trigger: text("trigger").notNull(),
    response: text("response").notNull(),
    matchType: text("match_type").default("contains").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    exclusiveChannelId: text("exclusive_channel_id"),
    exclusiveRoleId: text("exclusive_role_id"),
    rewardRoleAdd: text("reward_role_add"),
    rewardRoleRemove: text("reward_role_remove"),
  },
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
  closeReason: text("close_reason"),
  number: integer("number").default(0).notNull(),
  managementMessageId: text("management_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow(),
});

export const ticketForms = pgTable("ticket_forms",
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    topic: text("topic"),
    fields: jsonb("fields").$type<Array<{
      label: string;
      style: "short" | "paragraph";
      required?: boolean;
      placeholder?: string;
      minLength?: number;
      maxLength?: number;
    }>>().default([]).notNull(),
  },
  (t) => ({ guildIdx: index("ticket_forms_guild_idx").on(t.guildId) })
);

export const afk = pgTable("afk",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), message: text("message").notNull(), since: timestamp("since", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);
export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(), userId: text("user_id").notNull(), channelId: text("channel_id").notNull(), guildId: text("guild_id"), message: text("message").notNull(), remindAt: timestamp("remind_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  { id: serial("id").primaryKey(), guildId: text("guild_id").notNull(), userId: text("user_id").notNull(), messageId: text("message_id").notNull(), channelId: text("channel_id").notNull(), content: text("content").notNull(), upvotes: integer("upvotes").default(0).notNull(), downvotes: integer("downvotes").default(0).notNull(), status: text("status").default("pending").notNull(), reviewMessageId: text("review_message_id"), staffNote: text("staff_note"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
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

export const reactionTriggers = pgTable("reaction_triggers",
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    trigger: text("trigger").notNull(),
    emoji: text("emoji").notNull(),
  },
  (t) => ({ guildIdx: index("reaction_triggers_guild_idx").on(t.guildId) })
);

export const fakePermissions = pgTable("fake_permissions",
  {
    guildId: text("guild_id").notNull(),
    roleId: text("role_id").notNull(),
    permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.roleId] }) })
);

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

export const commandAliases = pgTable("command_aliases",
  {
    guildId: text("guild_id").notNull(),
    alias: text("alias").notNull(),
    command: text("command").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.alias] }) })
);

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

export const invokeMessages = pgTable("invoke_messages",
  {
    guildId: text("guild_id").notNull(),
    command: text("command").notNull(),
    type: text("type").notNull(),
    content: text("content").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.command, t.type] }) })
);

export const counters = pgTable("counters",
  {
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    type: text("type").notNull(),
    template: text("template").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.type] }) })
);

export const lastfmAccounts = pgTable('lastfm_accounts', {
  userId:   text('user_id').primaryKey(),
  username: text('username').notNull(),
});

export const vanityConfig = pgTable("vanity_config", {
  guildId: text("guild_id").primaryKey(),
  vanity: text("vanity").notNull(),
  channelId: text("channel_id"),
  message: text("message"),
});
export const vanityRoles = pgTable("vanity_roles",
  { guildId: text("guild_id").notNull(), roleId: text("role_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.roleId] }) })
);
export const vanityMembers = pgTable("vanity_members",
  { guildId: text("guild_id").notNull(), userId: text("user_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.userId] }) })
);

export const socialSubscriptions = pgTable("social_subscriptions",
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    platform: text("platform").notNull(),
    target: text("target").notNull(),
    message: text("message"),
    lastPostId: text("last_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ guildIdx: index("social_subs_guild_idx").on(t.guildId) })
);

export const paginatedEmbeds = pgTable("paginated_embeds",
  {
    messageId: text("message_id").primaryKey(),
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull(),
    pages: jsonb("pages").$type<string[]>().default([]).notNull(),
    currentPage: integer("current_page").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const eventsSettings = pgTable("events_settings",
  {
    guildId: text("guild_id").notNull(),
    event: text("event").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.event] }) })
);

export const managedWebhooks = pgTable("managed_webhooks",
  {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    identifier: text("identifier").notNull(),
    webhookId: text("webhook_id").notNull(),
    webhookToken: text("webhook_token").notNull(),
    channelId: text("channel_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ guildIdentIdx: index("webhook_guild_ident_idx").on(t.guildId, t.identifier) })
);

export const musicSettings = pgTable("music_settings", {
  guildId: text("guild_id").primaryKey(),
  djRoleId: text("dj_role_id"),
  autoplay: boolean("autoplay").default(false).notNull(),
});

export const fortniteWatches = pgTable("fortnite_watches",
  { userId: text("user_id").notNull(), cosmetic: text("cosmetic").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.cosmetic] }) })
);

export const stickyMessages = pgTable("sticky_messages",
  { guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(), message: text("message").notNull(), lastMessageId: text("last_message_id") },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.channelId] }) })
);

export const imgonlyChannels = pgTable("imgonly_channels",
  { guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.channelId] }) })
);

export const pinsConfig = pgTable("pins_config", {
  guildId: text("guild_id").primaryKey(),
  archiveChannel: text("archive_channel"),
  enabled: boolean("enabled").default(false).notNull(),
  unpinOnArchive: boolean("unpin_on_archive").default(false).notNull(),
});

export const globalIgnores = pgTable("global_ignores",
  { guildId: text("guild_id").notNull(), targetId: text("target_id").notNull(), targetType: text("target_type").default("member").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.targetId] }) })
);

export const disabledCommands = pgTable("disabled_commands",
  { guildId: text("guild_id").notNull(), targetId: text("target_id").notNull(), targetType: text("target_type").default("channel").notNull(), command: text("command").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.targetId, t.command] }) })
);

export const disabledModules = pgTable("disabled_modules",
  { guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(), module: text("module").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.channelId, t.module] }) })
);

export const boosterRoleShares = pgTable("booster_role_shares",
  { guildId: text("guild_id").notNull(), ownerId: text("owner_id").notNull(), sharedWithId: text("shared_with_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.ownerId, t.sharedWithId] }) })
);

export const boosterRoleFilter = pgTable("booster_role_filter",
  { guildId: text("guild_id").notNull(), word: text("word").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.word] }) })
);

export const logIgnores = pgTable("log_ignores",
  { guildId: text("guild_id").notNull(), targetId: text("target_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.targetId] }) })
);

export const welcomeChannels = pgTable("welcome_channels",
  { guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(), message: text("message").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.channelId] }) })
);

export const goodbyeChannels = pgTable("goodbye_channels",
  { guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(), message: text("message").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.channelId] }) })
);

export const boostChannels = pgTable("boost_channels",
  { guildId: text("guild_id").notNull(), channelId: text("channel_id").notNull(), message: text("message").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.channelId] }) })
);

export const suggestExtended = pgTable("suggest_extended", {
  guildId: text("guild_id").primaryKey(),
  threadsEnabled: boolean("threads_enabled").default(false).notNull(),
  upvoteEmoji: text("upvote_emoji").default("👍").notNull(),
  downvoteEmoji: text("downvote_emoji").default("👎").notNull(),
  reviewChannel: text("review_channel"),
  reviewEnabled: boolean("review_enabled").default(false).notNull(),
  ignoreIds: jsonb("ignore_ids").$type<string[]>().default([]).notNull(),
});

export const badgeConfig = pgTable("badge_config", {
  guildId: text("guild_id").primaryKey(),
  channelId: text("channel_id"),
  message: text("message"),
  enabled: boolean("enabled").default(false).notNull(),
});

export const badgeRoles = pgTable("badge_roles",
  { guildId: text("guild_id").notNull(), roleId: text("role_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.roleId] }) })
);

export const reposterConfig = pgTable("reposter_config", {
  guildId: text("guild_id").primaryKey(),
  prefixEnabled: boolean("prefix_enabled").default(true).notNull(),
  suppressEmbeds: boolean("suppress_embeds").default(false).notNull(),
  showEmbed: boolean("show_embed").default(true).notNull(),
  strictMode: boolean("strict_mode").default(false).notNull(),
  deleteOriginal: boolean("delete_original").default(false).notNull(),
});

export const userPrefixes = pgTable("user_prefixes", {
  userId: text("user_id").primaryKey(),
  prefix: text("prefix").notNull(),
});

export const filterExempts = pgTable("filter_exempts",
  { guildId: text("guild_id").notNull(), filterType: text("filter_type").notNull(), roleId: text("role_id").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.filterType, t.roleId] }) })
);

export const filterWhitelist = pgTable("filter_whitelist",
  { guildId: text("guild_id").notNull(), filterType: text("filter_type").notNull(), value: text("value").notNull() },
  (t) => ({ pk: primaryKey({ columns: [t.guildId, t.filterType, t.value] }) })
);
