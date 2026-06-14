import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { PermissionFlagsBits, ChannelType } from "discord.js";
import { db } from "../../db/index.js";
import { guildSettings } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "setupmute",
  aliases: ["mutesetup"],
  description: "Create and configure the mute role, image-mute role, and reaction-mute role with proper channel overwrites.",
  category: "moderation",
  permission: "manage_guild",
  guildOnly: true,
  usage: "setupmute",
  examples: ["setupmute"],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const me = guild.members.me;
    if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ embeds: [errorEmbed("I need **manage roles** **permission**.")] });
    }

    await ctx.defer();

    const results: string[] = [];

    const ensureRole = async (name: string, color?: number) => {
      let role = guild.roles.cache.find((r) => r.name.toLowerCase() === name.toLowerCase());
      if (!role) {
        role = await guild.roles.create({
          name,
          color: color ?? 0x2f3136,
          permissions: [],
          reason: "setupmute",
        });
        results.push(`created **${name}**`);
      } else {
        results.push(`found existing **${name}**`);
      }
      return role;
    };

    const muteRole = await ensureRole("Muted", 0x2f3136);
    const imageMuteRole = await ensureRole("Image Muted", 0x4a4a4a);
    const reactionMuteRole = await ensureRole("Reaction Muted", 0x4a4a4a);

    const channels = [...guild.channels.cache.values()];
    let overwrote = 0;

    for (const ch of channels) {
      if (ch.type === ChannelType.GuildCategory || ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice) {
        await ch.permissionOverwrites.edit(muteRole, {
          SendMessages: false,
          AddReactions: false,
          Speak: false,
        }).catch(() => {});

        await ch.permissionOverwrites.edit(imageMuteRole, {
          AttachFiles: false,
          EmbedLinks: false,
        }).catch(() => {});

        await ch.permissionOverwrites.edit(reactionMuteRole, {
          AddReactions: false,
        }).catch(() => {});

        overwrote++;
      }
    }

    await db.insert(guildSettings).values({
      guildId: guild.id,
      muteRole: muteRole.id,
      imageMuteRole: imageMuteRole.id,
      reactionMuteRole: reactionMuteRole.id,
    }).onConflictDoUpdate({
      target: guildSettings.guildId,
      set: {
        muteRole: muteRole.id,
        imageMuteRole: imageMuteRole.id,
        reactionMuteRole: reactionMuteRole.id,
      },
    });

    results.push(`applied overwrites to **${overwrote}** channels`);

    return ctx.reply({
      embeds: [brandEmbed({
        description: `**mute roles configured**\n\n${results.map((r) => `— ${r}`).join("\n")}`,
        page: "moderation",
      })],
    });
  },
};
