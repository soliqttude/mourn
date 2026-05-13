import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";

const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "createinvite",
  description: "(Owner) Generate an invite link for any server the bot is in.",
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

    const channel = guild.channels.cache.find(
      c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) && (c as any).permissionsFor?.(guild.members.me!)?.has("CreateInstantInvite"),
    );

    if (!channel) return ctx.reply({ embeds: [errorEmbed(`No usable channel found in **${guild.name}** to create an invite.`)], ephemeral: true } as any);

    try {
      const invite = await (channel as any).createInvite({ maxAge: 0, maxUses: 1, unique: true, reason: "Owner createinvite command" });
      return ctx.reply({
        embeds: [
          successEmbed(`**${guild.name}** — \`${guild.id}\`\n\n🔗 **${invite.url}**\n\n-# One-time use · Never expires`),
        ],
        ephemeral: true,
      } as any);
    } catch (err: any) {
      return ctx.reply({ embeds: [errorEmbed(`Failed to create invite: ${err.message}`)], ephemeral: true } as any);
    }
  },
};
