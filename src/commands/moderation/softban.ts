import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { cleanError, REASON_DEFAULT } from "../../lib/format.js";

export const command: HybridCommand = {
  name: "softban",
  aliases: ["sb", "sban"],
  description: "Ban then immediately unban a member, wiping their recent messages.",
  usage: "softban [user] [reason]",
  examples: ["softban Rule violation"],
  category: "moderation",
  permission: "mod",
  guildOnly: true,
  options: [
    { name: "user", description: "User to softban", type: ApplicationCommandOptionType.User, required: true },
    { name: "reason", description: "Reason", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;
    const target = await ctx.getUser("user", true);
    const reason = ctx.getString("reason") ?? REASON_DEFAULT;
    if (!target) return ctx.reply({ embeds: [errorEmbed("**User** not found.")] });
    if (target.id === ctx.user.id) return ctx.reply({ embeds: [errorEmbed("You can't softban yourself.")] });
    const member = await guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) return ctx.reply({ embeds: [errorEmbed("I can't ban that **user** — they may have a higher **role**.")] });
    const dmSent = await target.send(
      `You have been **softbanned** from **${guild.name}**.\n**Reason:** ${reason}`
    ).then(() => true).catch(() => false);
    try {
      await guild.bans.create(target.id, { deleteMessageSeconds: 604800, reason });
      await guild.bans.remove(target.id, "softban cleanup");
      return ctx.reply({ content: dmSent ? "👍" : "👍 - Couldn't DM member" });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed(cleanError(err))] });
    }
  },
};
