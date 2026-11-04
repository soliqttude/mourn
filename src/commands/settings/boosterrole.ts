import { ApplicationCommandOptionType, type GuildMember } from "discord.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { boosterRoles, boosterRoleConfig, boosterRoleShares, boostAutoRole, filterWhitelist } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { createBoosterRole, deleteBoosterRole, getBoosterRole } from "../../features/boosterRoles.js";

export const command: HybridCommand = {
  name: "boosterrole",
  aliases: ["boostrole", "br"],
  description: "Create and customize personal booster roles for server boosters.",
  category: "settings",
  guildOnly: true,
  usage: "boosterrole base <role> | color <color> [second_color] [name] | rename <name> | icon <url> | remove | award <set|view|remove> | list | cleanup",
  examples: [
    "boosterrole create",
    "boosterrole rename My Awesome Role",
    "boosterrole color #ff0099",
    "boosterrole icon 🌙",
    "boosterrole delete",
    "boosterrole setbase @Nitro Booster",
  ],
  options: [
    { type: ApplicationCommandOptionType.Subcommand, name: "base", description: "Set the role booster roles are placed below", options: [
      { type: ApplicationCommandOptionType.Role, name: "role", description: "Base role", required: true },
    ] },
    { type: ApplicationCommandOptionType.Subcommand, name: "color", description: "Create or update your custom booster role", options: [
      { type: ApplicationCommandOptionType.String, name: "color", description: "Hex code or color name", required: true },
      { type: ApplicationCommandOptionType.String, name: "second_color", description: "Optional second gradient color", required: false },
      { type: ApplicationCommandOptionType.String, name: "name", description: "Booster role name", required: false },
    ] },
    { type: ApplicationCommandOptionType.Subcommand, name: "rename", description: "Rename your booster role", options: [
      { type: ApplicationCommandOptionType.String, name: "name", description: "New role name", required: true },
    ] },
    { type: ApplicationCommandOptionType.Subcommand, name: "icon", description: "Set your booster role icon", options: [
      { type: ApplicationCommandOptionType.String, name: "url", description: "Emoji or image URL", required: true },
    ] },
    { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Remove your booster role" },
    { type: ApplicationCommandOptionType.Subcommand, name: "list", description: "View all booster roles" },
    { type: ApplicationCommandOptionType.Subcommand, name: "cleanup", description: "Clean up stale booster roles" },
    { type: ApplicationCommandOptionType.SubcommandGroup, name: "award", description: "Configure the role granted to boosters", options: [
      { type: ApplicationCommandOptionType.Subcommand, name: "set", description: "Set the boost reward role", options: [
        { type: ApplicationCommandOptionType.Role, name: "role", description: "Reward role", required: true },
      ] },
      { type: ApplicationCommandOptionType.Subcommand, name: "view", description: "View the current reward role" },
      { type: ApplicationCommandOptionType.Subcommand, name: "remove", description: "Remove the reward role" },
    ] },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const member = ctx.member as GuildMember;

    const action = (ctx.getSubcommandGroup() ?? ctx.getSubcommand() ?? ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();

    if (action === "limit") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to set the booster role limit.")] });
      const raw = ctx.getString("value") ?? ctx.args[1] ?? "";
      const limit = Number(raw);
      if (!Number.isInteger(limit) || limit < 1 || limit > 250) return ctx.reply({ embeds: [errorEmbed("Set a whole-number limit between 1 and 250.")] });
      await db.insert(boosterRoleConfig).values({ guildId: guild.id, baseRoleId: null, roleLimit: limit })
        .onConflictDoUpdate({ target: boosterRoleConfig.guildId, set: { roleLimit: limit } });
      return ctx.reply({ embeds: [successEmbed(`server booster role limit set to ${limit}.`, "settings")] });
    }

    if (action === "filter") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to manage booster role name filters.")] });
      const word = (ctx.args[1] ?? ctx.getString("value") ?? "").trim().toLowerCase();
      const rows = await db.select().from(filterWhitelist).where(and(eq(filterWhitelist.guildId, guild.id), eq(filterWhitelist.filterType, "boosterrole-name")));
      if (!word || word === "list") {
        return ctx.reply({ embeds: [brandEmbed({ title: "Booster role name blacklist", description: rows.length ? rows.map(row => `\`${row.value}\``).join("\n") : "No blocked words configured." })] });
      }
      const existing = rows.find(row => row.value === word);
      if (existing) {
        await db.delete(filterWhitelist).where(and(eq(filterWhitelist.guildId, guild.id), eq(filterWhitelist.filterType, "boosterrole-name"), eq(filterWhitelist.value, word)));
        return ctx.reply({ embeds: [successEmbed(`removed \`${word}\` from the booster role blacklist.`, "settings")] });
      }
      await db.insert(filterWhitelist).values({ guildId: guild.id, filterType: "boosterrole-name", value: word }).onConflictDoNothing();
      return ctx.reply({ embeds: [successEmbed(`added \`${word}\` to the booster role blacklist.`, "settings")] });
    }

    if (action === "award") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to configure the boost reward role.")] });
      const sub = (ctx.getSubcommand() ?? ctx.getString("subaction") ?? ctx.args[1] ?? "").toLowerCase();
      const [current] = await db.select().from(boostAutoRole).where(eq(boostAutoRole.guildId, guild.id));
      if (sub === "view") return ctx.reply({ embeds: [brandEmbed({ title: "Booster reward role", description: current?.roleId ? `<@&${current.roleId}>` : "No reward role configured." })] });
      if (sub === "unset" || sub === "remove") {
        await db.delete(boostAutoRole).where(eq(boostAutoRole.guildId, guild.id));
        return ctx.reply({ embeds: [successEmbed("Booster reward role removed.", "settings")] });
      }
      const roleArg = ctx.args[sub === "set" ? 2 : 1] ?? "";
      const role = ctx.getRole("role") ?? guild.roles.cache.get(roleArg.replace(/[<@&>]/g, ""));
      if (!role) return ctx.reply({ embeds: [errorEmbed("Provide a role, or use award view / award remove.")] });
      await db.insert(boostAutoRole).values({ guildId: guild.id, roleId: role.id })
        .onConflictDoUpdate({ target: boostAutoRole.guildId, set: { roleId: role.id } });
      return ctx.reply({ embeds: [successEmbed(`boosters will receive <@&${role.id}> when they start boosting.`, "settings")] });
    }

    if (action === "setbase" || action === "base") {
      if (!member.permissions.has("ManageGuild" as any))
        return ctx.reply({ embeds: [errorEmbed("You need Manage Server to set the base role.")] });
      const role = ctx.getRole("role") ?? guild.roles.cache.get((ctx.args[1] ?? "").replace(/[<@&>]/g, ""));
      if (!role) return ctx.reply({ embeds: [errorEmbed("Please specify the base **role**.")] });
      await db.insert(boosterRoleConfig).values({ guildId: guild.id, baseRoleId: role.id })
        .onConflictDoUpdate({ target: boosterRoleConfig.guildId, set: { baseRoleId: role.id } });
      return ctx.reply({ embeds: [successEmbed(`base role set to <@&${role.id}>. booster roles will be placed above it.`, "settings")] });
    }

    if (action === "list") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to list booster roles.")] });
      const rows = await db.select().from(boosterRoles).where(eq(boosterRoles.guildId, guild.id));
      const live = rows.filter((row) => guild.roles.cache.has(row.roleId));
      const body = live.length ? live.map((row) => `<@${row.userId}> — <@&${row.roleId}>`).join("\n") : "No active booster roles found.";
      return ctx.reply({ embeds: [brandEmbed({ description: `**Booster roles (${live.length})**\n${body}` })] });
    }

    if (action === "cleanup") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to clean up booster roles.")] });
      const rows = await db.select().from(boosterRoles).where(eq(boosterRoles.guildId, guild.id));
      const members = await guild.members.fetch().catch(() => null);
      if (!members) return ctx.reply({ embeds: [errorEmbed("I couldn't fetch the server member list, so cleanup was cancelled without deleting records.")] });
      let removed = 0;
      for (const row of rows) {
        if (!guild.roles.cache.has(row.roleId) || !members.has(row.userId)) {
          await db.delete(boosterRoles).where(and(eq(boosterRoles.guildId, guild.id), eq(boosterRoles.userId, row.userId)));
          removed++;
        }
      }
      const sharedRows = await db.select().from(boosterRoleShares).where(eq(boosterRoleShares.guildId, guild.id));
      let removedShares = 0;
      for (const row of sharedRows) {
        if (!guild.roles.cache.has(row.roleId) || !members.has(row.sharedUserId) || !members.has(row.ownerUserId)) {
          await db.delete(boosterRoleShares).where(and(eq(boosterRoleShares.guildId, guild.id), eq(boosterRoleShares.ownerUserId, row.ownerUserId), eq(boosterRoleShares.sharedUserId, row.sharedUserId)));
          removedShares++;
        }
      }
      return ctx.reply({ embeds: [successEmbed(`Cleaned ${removed} stale booster role record(s) and ${removedShares} stale share record(s).`, "settings")] });
    }

    if (action === "link") {
      if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server to link an existing booster role.")] });
      const target = (await ctx.getMember("member")) ?? (ctx.args[1] ? await guild.members.fetch(ctx.args[1].replace(/[<@!>]/g, "")).catch(() => null) : null);
      const linkedRole = ctx.getRole("role") ?? (ctx.args[2] ? guild.roles.cache.get(ctx.args[2].replace(/[<@&>]/g, "")) : null);
      if (!target || !linkedRole) return ctx.reply({ embeds: [errorEmbed("Provide both a member and an existing role.")] });
      const duplicate = await db.select().from(boosterRoles).where(and(eq(boosterRoles.guildId, guild.id), eq(boosterRoles.roleId, linkedRole.id)));
      if (duplicate.some(row => row.userId !== target.id)) return ctx.reply({ embeds: [errorEmbed("That role is already linked to another booster.")] });
      await db.insert(boosterRoles).values({ guildId: guild.id, userId: target.id, roleId: linkedRole.id })
        .onConflictDoUpdate({ target: [boosterRoles.guildId, boosterRoles.userId], set: { roleId: linkedRole.id } });
      return ctx.reply({ embeds: [successEmbed(`linked <@&${linkedRole.id}> to <@${target.id}>.`, "settings")] });
    }

    if (action === "share") {
      const sub = (ctx.getString("subaction") ?? ctx.args[1] ?? "").toLowerCase();
      if (sub === "remove") {
        const roleId = (ctx.args[2] ?? ctx.getRole("role")?.id ?? "").replace(/[<@&>]/g, "");
        if (!roleId) return ctx.reply({ embeds: [errorEmbed("Provide the shared role to leave.")] });
        const [share] = await db.select().from(boosterRoleShares).where(and(eq(boosterRoleShares.guildId, guild.id), eq(boosterRoleShares.sharedUserId, ctx.user.id), eq(boosterRoleShares.roleId, roleId)));
        if (!share) return ctx.reply({ embeds: [errorEmbed("You are not listed as a member of that shared booster role.")] });
        const role = guild.roles.cache.get(roleId);
        if (role) await member.roles.remove(role).catch(() => {});
        await db.delete(boosterRoleShares).where(and(eq(boosterRoleShares.guildId, guild.id), eq(boosterRoleShares.ownerUserId, share.ownerUserId), eq(boosterRoleShares.sharedUserId, ctx.user.id)));
        return ctx.reply({ embeds: [successEmbed("You left the shared booster role.", "settings")] });
      }
      if (sub === "list") {
        const ownRoleId = await getBoosterRole(guild.id, ctx.user.id);
        if (!ownRoleId) return ctx.reply({ embeds: [errorEmbed("Create your booster role first.")] });
        const rows = await db.select().from(boosterRoleShares).where(and(
          eq(boosterRoleShares.guildId, guild.id),
          eq(boosterRoleShares.ownerUserId, ctx.user.id),
          eq(boosterRoleShares.roleId, ownRoleId),
        ));
        return ctx.reply({ embeds: [brandEmbed({ title: "Your shared booster role", description: rows.length ? rows.map(row => `<@${row.sharedUserId}>`).join("\n") : "You have not shared your booster role with anyone." })] });
      }
      if (sub === "max" || sub === "limit") {
        if (!member.permissions.has("ManageGuild" as any)) return ctx.reply({ embeds: [errorEmbed("You need Manage Server for this share setting.")] });
        const [cfg] = await db.select().from(boosterRoleConfig).where(eq(boosterRoleConfig.guildId, guild.id));
        const amount = Number(ctx.args[2] ?? ctx.getString("value") ?? "");
        if (!Number.isInteger(amount) || amount < 1 || amount > 100) return ctx.reply({ embeds: [errorEmbed("Set a whole-number limit between 1 and 100.")] });
        const values = { guildId: guild.id, baseRoleId: cfg?.baseRoleId ?? null, roleLimit: cfg?.roleLimit ?? 0, maxSharedMembers: sub === "max" ? amount : cfg?.maxSharedMembers ?? 0, maxRolesPerMember: sub === "limit" ? amount : cfg?.maxRolesPerMember ?? 0 };
        await db.insert(boosterRoleConfig).values(values).onConflictDoUpdate({ target: boosterRoleConfig.guildId, set: { maxSharedMembers: values.maxSharedMembers, maxRolesPerMember: values.maxRolesPerMember } });
        return ctx.reply({ embeds: [successEmbed(`booster role share ${sub} set to ${amount}.`, "settings")] });
      }
      const target = (await ctx.getMember("member")) ?? (ctx.args[1] ? await guild.members.fetch(ctx.args[1].replace(/[<@!>]/g, "")).catch(() => null) : null);
      if (!target) return ctx.reply({ embeds: [errorEmbed("Mention a member to share your booster role with.")] });
      if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You already own this booster role.")] });
      const roleId = await getBoosterRole(guild.id, ctx.user.id);
      if (!roleId) return ctx.reply({ embeds: [errorEmbed("Create your booster role first.")] });
      const role = guild.roles.cache.get(roleId);
      if (!role) return ctx.reply({ embeds: [errorEmbed("Your booster role no longer exists.")] });
      const [cfg] = await db.select().from(boosterRoleConfig).where(eq(boosterRoleConfig.guildId, guild.id));
      const roleShares = await db.select().from(boosterRoleShares).where(and(eq(boosterRoleShares.guildId, guild.id), eq(boosterRoleShares.ownerUserId, ctx.user.id)));
      const memberShares = await db.select().from(boosterRoleShares).where(and(eq(boosterRoleShares.guildId, guild.id), eq(boosterRoleShares.sharedUserId, target.id)));
      if (cfg?.maxSharedMembers && roleShares.length >= cfg.maxSharedMembers) return ctx.reply({ embeds: [errorEmbed("Your booster role has reached its share-member limit.")] });
      if (cfg?.maxRolesPerMember && memberShares.length >= cfg.maxRolesPerMember) return ctx.reply({ embeds: [errorEmbed("That member has reached the maximum number of shared booster roles.")] });
      try { await target.roles.add(role); } catch { return ctx.reply({ embeds: [errorEmbed("I could not assign that role. Check my role hierarchy and Manage Roles permission.")] }); }
      await db.insert(boosterRoleShares).values({ guildId: guild.id, ownerUserId: ctx.user.id, sharedUserId: target.id, roleId })
        .onConflictDoUpdate({ target: [boosterRoleShares.guildId, boosterRoleShares.ownerUserId, boosterRoleShares.sharedUserId], set: { roleId } });
      return ctx.reply({ embeds: [successEmbed(`shared <@&${roleId}> with <@${target.id}>.`, "settings")] });
    }

    const isBoosting = member.premiumSince !== null;
    if (!isBoosting)
      return ctx.reply({ embeds: [errorEmbed("You must be a server **booster** to use **booster** **roles**.")] });

    if (action === "create") {
      const blockedNames = await db.select().from(filterWhitelist).where(and(eq(filterWhitelist.guildId, guild.id), eq(filterWhitelist.filterType, "boosterrole-name")));
      const blockedName = blockedNames.find(row => member.user.username.toLowerCase().includes(row.value));
      if (blockedName) return ctx.reply({ embeds: [errorEmbed("Your username contains a word blocked from booster role names.")] });
      const existing = await getBoosterRole(guild.id, ctx.user.id);
      if (existing)
        return ctx.reply({ embeds: [errorEmbed(`you already have a booster role (<@&${existing}>). delete it first.`)] });

      const roleId = await createBoosterRole(guild, member);
      if (!roleId) return ctx.reply({ embeds: [errorEmbed("Failed to create **booster** **role**.")] });

      return ctx.reply({ embeds: [successEmbed(`your booster role (<@&${roleId}>) has been created! use \`boosterrole rename\` and \`boosterrole color\` to customize it.`, "settings")] });
    }

    if (action === "color") {
      if (!member.premiumSince) return ctx.reply({ embeds: [errorEmbed("You must be boosting this server to create a booster role.")] });
      const colorInput = ctx.getString("color") ?? ctx.getString("value") ?? ctx.args[1] ?? "";
      const secondInput = ctx.getString("second_color") ?? ctx.args[2] ?? "";
      const requestedName = ctx.getString("name") ?? (ctx.source === "prefix" ? ctx.args.slice(secondInput ? 3 : 2).join(" ") : "");
      const named: Record<string, number> = { red: 0xff0000, green: 0x00ff00, blue: 0x0000ff, white: 0xffffff, black: 0x000000, orange: 0xffa500, purple: 0x800080, pink: 0xffc0cb, yellow: 0xffff00, cyan: 0x00ffff, magenta: 0xff00ff, gold: 0xffd700, silver: 0xc0c0c0, teal: 0x008080, navy: 0x000080, crimson: 0xdc143c, coral: 0xff7f50, violet: 0xee82ee, indigo: 0x4b0082, lime: 0x00ff00, maroon: 0x800000, olive: 0x808000, turquoise: 0x40e0d0, brown: 0xa52a2a, salmon: 0xfa8072, orchid: 0xda70d6, plum: 0xdda0dd };
      const parseColor = (value: string): number | null => { const v = value.trim().toLowerCase(); if (named[v] !== undefined) return named[v]; const h = v.replace(/^#/, ""); return /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : null; };
      const primary = parseColor(colorInput);
      const secondary = secondInput ? parseColor(secondInput) : null;
      if (primary === null || (secondInput && secondary === null)) return ctx.reply({ embeds: [errorEmbed("Provide a valid color name or six-digit hex code, such as `#3498db`.")] });
      const [cfg] = await db.select().from(boosterRoleConfig).where(eq(boosterRoleConfig.guildId, guild.id));
      if (!cfg?.baseRoleId) return ctx.reply({ embeds: [errorEmbed("The server has not configured a booster role base. Ask an administrator to run `/boosterrole base`.")] });
      const baseRole = guild.roles.cache.get(cfg.baseRoleId);
      if (!baseRole) return ctx.reply({ embeds: [errorEmbed("The configured base role no longer exists. Ask an administrator to set it again.")] });
      const name = (requestedName || `${member.user.username}'s role`).trim().slice(0, 100);
      const blocked = await db.select().from(filterWhitelist).where(and(eq(filterWhitelist.guildId, guild.id), eq(filterWhitelist.filterType, "boosterrole-name")));
      const blockedWord = blocked.find(row => name.toLowerCase().includes(row.value));
      if (blockedWord) return ctx.reply({ embeds: [errorEmbed(`That role name contains a blocked word: \`${blockedWord.value}\`.`)] });
      const existingId = await getBoosterRole(guild.id, ctx.user.id);
      let role = existingId ? guild.roles.cache.get(existingId) : null;
      if (!role) {
        if (cfg.roleLimit > 0) {
          const rows = await db.select().from(boosterRoles).where(eq(boosterRoles.guildId, guild.id));
          if (rows.filter(row => guild.roles.cache.has(row.roleId)).length >= cfg.roleLimit) return ctx.reply({ embeds: [errorEmbed("The server has reached its booster role limit.")] });
        }
        role = await guild.roles.create({ name, color: primary, reason: "Personal booster role" }).catch(() => null);
        if (!role) return ctx.reply({ embeds: [errorEmbed("I could not create the booster role. Check my Manage Roles permission and role hierarchy.")] });
        try {
          await role.setPosition(Math.max(1, baseRole.position - 1));
          await member.roles.add(role);
          await db.insert(boosterRoles).values({ guildId: guild.id, userId: ctx.user.id, roleId: role.id });
        } catch {
          await member.roles.remove(role).catch(() => {});
          await role.delete().catch(() => {});
          return ctx.reply({ embeds: [errorEmbed("The booster role could not be assigned or saved. Check role hierarchy and database connectivity.")] });
        }
      } else {
        await role.setName(name);
        await role.setColor(primary);
      }
      if (secondary !== null) {
        try {
          await guild.client.rest.patch(`/guilds/${guild.id}/roles/${role.id}` as any, { body: { colors: { primary_color: primary, secondary_color: secondary } } as any });
        } catch {
          return ctx.reply({ embeds: [errorEmbed("Discord rejected the second color. Gradient role colors may not be available to this server.")] });
        }
      }
      return ctx.reply({ embeds: [successEmbed(`Your booster role was assigned with hex code #${primary.toString(16).padStart(6, "0")}${secondary !== null ? ` and second color #${secondary.toString(16).padStart(6, "0")}` : ""}.`, "settings")] });
    }

    const roleId = await getBoosterRole(guild.id, ctx.user.id);
    if (!roleId)
      return ctx.reply({ embeds: [errorEmbed("You don't have a **booster** **role**. use `boosterrole create` first.")] });

    const role = guild.roles.cache.get(roleId);
    if (!role)
      return ctx.reply({ embeds: [errorEmbed("Your **booster** **role** no longer exists.")] });

    if (action === "delete" || action === "remove") {
      const deleted = await deleteBoosterRole(guild, ctx.user.id);
      if (!deleted) return ctx.reply({ embeds: [errorEmbed("I could not remove your booster role. Check my Manage Roles permission and try again.")] });
      return ctx.reply({ embeds: [successEmbed("Your booster role was successfully removed.", "settings")] });
    }

    if (action === "rename") {
      const name = ctx.getString("name") ?? ctx.getString("value") ?? ctx.args.slice(1).join(" ");
      if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a new name.")] });
      if (name.length > 100) return ctx.reply({ embeds: [errorEmbed("**Role** name must be 100 characters or less.")] });
      const blocked = await db.select().from(filterWhitelist).where(and(eq(filterWhitelist.guildId, guild.id), eq(filterWhitelist.filterType, "boosterrole-name")));
      const blockedWord = blocked.find(row => name.toLowerCase().includes(row.value));
      if (blockedWord) return ctx.reply({ embeds: [errorEmbed(`Your role name contains a blocked word: \`${blockedWord.value}\`.`)] });
      await role.setName(name).catch(() => null);
      return ctx.reply({ embeds: [successEmbed(`renamed your booster role to **${name}**.`, "settings")] });
    }

    if (action === "dominant") {
      try {
        const avatar = await loadImage(member.displayAvatarURL({ extension: "png", size: 256 }));
        const canvas = createCanvas(32, 32);
        const context = canvas.getContext("2d");
        context.drawImage(avatar, 0, 0, 32, 32);
        const pixels = context.getImageData(0, 0, 32, 32).data;
        const buckets = new Map<number, number>();
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3]! < 128) continue;
          const red = pixels[i]!, green = pixels[i + 1]!, blue = pixels[i + 2]!;
          const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
          if (max < 35 || min > 242 || max - min < 12) continue;
          const key = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }
        const dominant = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        if (dominant === undefined) return ctx.reply({ embeds: [errorEmbed("Could not find a distinct dominant color in your avatar.")] });
        const color = ((((dominant >> 8) & 15) * 17) << 16) | ((((dominant >> 4) & 15) * 17) << 8) | ((dominant & 15) * 17);
        await role.setColor(color);
        return ctx.reply({ embeds: [successEmbed("set your booster role color to your avatar dominant color (#" + color.toString(16).padStart(6, "0") + ").", "settings")] });
      } catch {
        return ctx.reply({ embeds: [errorEmbed("Could not read your avatar or update the role color.")] });
      }
    }
    if (action === "random") {
      const color = Math.floor(Math.random() * 0xffffff);
      await role.setColor(color);
      return ctx.reply({ embeds: [successEmbed("randomized your booster role color to #" + color.toString(16).padStart(6, "0") + ".", "settings")] });
    }

    if (action === "icon") {
      const icon = ctx.getString("url") ?? ctx.getString("value") ?? ctx.args.slice(1).join(" ");
      if (!icon) return ctx.reply({ embeds: [errorEmbed("Please provide an **emoji** or image url.")] });
      await role.setUnicodeEmoji(icon).catch(async () => {
        if (/^https?:\/\//.test(icon)) {
          await role.setIcon(icon).catch(() => {});
        }
      });
      return ctx.reply({ embeds: [successEmbed(`updated your booster role icon.`, "settings")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid action.")] });
  },
};
