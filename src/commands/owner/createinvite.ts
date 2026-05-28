import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "createinvite",
  description: "(Owner) Generate an invite link for any server the bot is in.",
  usage: "createinvite [guild_id]",
  examples: ["createinvite"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "ID of the server to create an invite for", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope.", ephemeral: true } as any);

    const guildId = ctx.getString("guild_id") ?? ctx.args[0];
    if (!guildId) return ctx.reply({ embeds: [errorEmbed("Provide a guild ID.")], ephemeral: true } as any);

    const guild = ctx.client.guilds.cache.get(guildId);
    if (!guild) return ctx.reply({ embeds: [errorEmbed(`Bot is not in guild \`${guildId}\`.`)], ephemeral: true } as any);

    // Force fresh channel fetch so we don't rely on stale/partial cache
    await guild.channels.fetch().catch(() => null);

    // Ensure bot member is cached so permissionsFor works correctly
    const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);

    // Prefer system channel, then rules channel, then any text channel we can create invites in
    const channel =
      guild.systemChannel ??
      guild.rulesChannel ??
      guild.channels.cache.find(
        c =>
          (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
          !!me &&
          (c as any).permissionsFor?.(me)?.has("CreateInstantInvite"),
      ) ??
      null;

    if (!channel) return ctx.reply({ embeds: [errorEmbed(`No usable channel found in **${guild.name}** to create an invite.`)], ephemeral: true } as any);

    try {
      // maxUses: 0 = unlimited uses, maxAge: 86400 = expires after 24h
      const invite = await (channel as any).createInvite({ maxAge: 86400, maxUses: 0, unique: true, reason: "Owner createinvite command" });
      return ctx.reply({
        embeds: [
          successEmbed(`**${guild.name}** — \`${guild.id}\`\n\n🔗 **${invite.url}**\n\n-# Unlimited uses · Expires in 24h`),
        ],
        ephemeral: true,
      } as any);
    } catch (err: any) {
      return ctx.reply({ embeds: [errorEmbed(`Failed to create invite: ${err.message}`)], ephemeral: true } as any);
    }
  },
};
