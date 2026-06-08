import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const pronounMap = new Map<string, string>();

export const command: HybridCommand = {
  name: "pronouns",
  description: "Set or view pronouns for a user.",
  category: "utility",
  aliases: ["pronoun"],
  options: [
    { name: "pronouns", description: "Your pronouns (leave empty to view)", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "User to view pronouns of", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const target = await ctx.getUser("user") ?? null;
    const newPronouns = ctx.getString("pronouns") ?? null;
    if (target && !newPronouns) {
      const p = pronounMap.get(target.id) ?? "Not set";
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`**${target.username}'s** pronouns: **${p}**`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    if (newPronouns) {
      pronounMap.set(ctx.user.id, newPronouns.slice(0,30));
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`✅ Your pronouns have been set to **${newPronouns}**.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    const p = pronounMap.get(ctx.user.id) ?? "Not set";
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`Your pronouns: **${p}**`).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
