import { PermissionFlagsBits, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { updateGuildSettings } from "../../db/settings.js";

export const command: HybridCommand = {
  name: "setupmod",
  aliases: ["modsetup", "setupmoderation"],
  description: "Create case logs channel, jail channel, and Jailed role with proper overwrites.",
  category: "moderation",
  permission: "manage_guild",
  guildOnly: true,
  usage: "setupmod",
  examples: ["setupmod"],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const me = guild.members.me;
    if (
      !me?.permissions.has(PermissionFlagsBits.ManageRoles) ||
      !me.permissions.has(PermissionFlagsBits.ManageChannels)
    ) {
      return ctx.reply({
        embeds: [errorEmbed("I need **Manage Roles** and **Manage Channels** permissions.")],
      });
    }

    await ctx.defer();

    const results: string[] = [];

    // 1. Jailed role
    let jailRole = guild.roles.cache.find((r) => r.name.toLowerCase() === "jailed");
    if (!jailRole) {
      jailRole = await guild.roles.create({
        name: "Jailed",
        color: 0x2f3136,
        permissions: [],
        reason: "setupmod",
      });
      results.push("created role **Jailed**");
    } else {
      results.push("found existing role **Jailed**");
    }

    // 2. Deny ViewChannel for Jailed in every text / category channel
    let overwrote = 0;
    for (const ch of guild.channels.cache.values()) {
      if (
        ch.type === ChannelType.GuildText ||
        ch.type === ChannelType.GuildVoice ||
        ch.type === ChannelType.GuildCategory ||
        ch.type === ChannelType.GuildAnnouncement
      ) {
        await ch.permissionOverwrites
          .edit(jailRole, { ViewChannel: false })
          .catch(() => {});
        overwrote++;
      }
    }
    results.push(`applied deny-view overwrites to **${overwrote}** channels`);

    // 3. #jail channel
    let jailChannel = guild.channels.cache.find(
      (c) => c.name === "jail" && c.type === ChannelType.GuildText,
    ) as any;
    if (!jailChannel) {
      jailChannel = await guild.channels.create({
        name: "jail",
        type: ChannelType.GuildText,
        topic: "Jailed members are restricted to this channel.",
        reason: "setupmod",
      });
      results.push(`created channel <#${jailChannel.id}>`);
    } else {
      results.push(`found existing channel <#${jailChannel.id}>`);
    }
    // Allow Jailed role to read/write only in #jail
    await jailChannel.permissionOverwrites
      .edit(jailRole, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: false,
        EmbedLinks: false,
      })
      .catch(() => {});

    // 4. #jail-log channel
    let jailLogChannel = guild.channels.cache.find(
      (c) => c.name === "jail-log" && c.type === ChannelType.GuildText,
    ) as any;
    if (!jailLogChannel) {
      jailLogChannel = await guild.channels.create({
        name: "jail-log",
        type: ChannelType.GuildText,
        topic: "Case logs for all moderation actions.",
        reason: "setupmod",
      });
      results.push(`created channel <#${jailLogChannel.id}>`);
    } else {
      results.push(`found existing channel <#${jailLogChannel.id}>`);
    }
    // Staff-only: deny @everyone from viewing jail-log
    await jailLogChannel.permissionOverwrites
      .edit(guild.roles.everyone, { ViewChannel: false })
      .catch(() => {});
    // Deny Jailed from jail-log
    await jailLogChannel.permissionOverwrites
      .edit(jailRole, { ViewChannel: false })
      .catch(() => {});

    // 5. Save to DB
    await updateGuildSettings(guild.id, {
      jailRole: jailRole.id,
      modLogChannel: jailLogChannel.id,
    });

    return ctx.reply({
      embeds: [
        brandEmbed({
          description: [
            "**moderation setup complete**",
            "",
            ...results.map((r) => `\u2014 ${r}`),
            "",
            "Run `,setupmute` to create the mute roles.",
          ].join("\n"),
        }),
      ],
    });
  },
};
