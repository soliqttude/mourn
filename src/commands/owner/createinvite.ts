import { ApplicationCommandOptionType, ChannelType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { isBotOwner } from "../../lib/permissions.js";

export const command: HybridCommand = {
  name: "createinvite",
  description: "(Owner) Generate an invite link for any server the bot is in.",
  usage: "createinvite <guild_id>",
  examples: ["createinvite 123456789012345678"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "ID of the server to create an invite for", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (!isBotOwner(ctx.user.id)) return ctx.reply({ content: "nope.", ephemeral: true } as any);

    const guildId = ctx.getString("guild_id") ?? ctx.args[0];
    if (!guildId) return ctx.reply({ embeds: [errorEmbed("Provide a guild ID.")], ephemeral: true } as any);

    const guild = ctx.client.guilds.cache.get(guildId);
    if (!guild) return ctx.reply({ embeds: [errorEmbed(`Bot is not in guild \`${guildId}\`.`)], ephemeral: true } as any);

    // 1. Try to reuse an existing active invite
    try {
      const existing = await guild.invites.fetch();
      const pick = existing.find(i =>
        !!i.code &&
        i.url &&
        (i.maxAge === 0 || (i.expiresTimestamp ?? 0) > Date.now()) &&
        (i.maxUses === 0 || (i.uses ?? 0) < (i.maxUses ?? Infinity)),
      );
      if (pick?.url) {
        const code = pick.code;
        return ctx.reply({
          embeds: [successEmbed(
            `**${guild.name}** (\`${guild.id}\`)\n\n` +
            `[discord.gg/${code}](${pick.url})\n\n` +
            `-# Reused existing invite`,
          )],
        } as any);
      }
    } catch {
      // No ManageGuild — fall through to create
    }

    // 2. Create a fresh invite
    await guild.channels.fetch().catch(() => null);
    const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
    if (!me) return ctx.reply({ embeds: [errorEmbed("Could not resolve bot member in that server.")], ephemeral: true } as any);

    const candidates = guild.channels.cache.filter(
      c =>
        (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
        !!(c as any).permissionsFor?.(me)?.has("CreateInstantInvite"),
    );

    if (!candidates.size) {
      return ctx.reply({
        embeds: [errorEmbed(
          `No usable channel in **${guild.name}** — bot lacks \`CreateInstantInvite\` permission everywhere.`,
        )],
        ephemeral: true,
      } as any);
    }

    let lastErr: string | null = null;
    for (const channel of candidates.values()) {
      try {
        const invite = await (channel as any).createInvite({
          maxAge: 0,
          maxUses: 0,
          unique: true,
          reason: "Owner createinvite command",
        });
        if (invite?.url) {
          return ctx.reply({
            embeds: [successEmbed(
              `**${guild.name}** (\`${guild.id}\`)\n\n` +
              `[discord.gg/${invite.code}](${invite.url})\n\n` +
              `-# Unlimited uses · Never expires`,
            )],
          } as any);
        }
      } catch (err: any) {
        lastErr = err?.message ?? String(err);
        continue;
      }
    }

    return ctx.reply({
      embeds: [errorEmbed(
        `Failed to create an invite for **${guild.name}**.` +
        (lastErr ? `\n\`${lastErr}\`` : ""),
      )],
      ephemeral: true,
    } as any);
  },
};
