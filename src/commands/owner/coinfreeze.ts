import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";
import { updateGuildSettings, getGuildSettings } from "../../db/settings.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "coinfreeze",
  description: "(Owner) Freeze or unfreeze all economy commands in a server.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "guild_id", description: "Guild ID to freeze/unfreeze", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) return ctx.reply({ content: "nope." });
    const guildId = ctx.getString("guild_id", true)!;
    const guild = ctx.client.guilds.cache.get(guildId);
    const settings = await getGuildSettings(guildId);
    const nowFrozen = !settings.economyFrozen;

    await updateGuildSettings(guildId, { economyFrozen: nowFrozen });

    if (nowFrozen) {
      ownerState.frozenGuilds.add(guildId);
    } else {
      ownerState.frozenGuilds.delete(guildId);
    }

    return ctx.reply({
      embeds: [successEmbed(`economy in **${guild?.name ?? guildId}** is now **${nowFrozen ? "🔒 frozen" : "🔓 unfrozen"}**.\n${nowFrozen ? "all economy commands are disabled for members." : "economy is back online."}`)],
      ephemeral: true,
    });
  },
};
