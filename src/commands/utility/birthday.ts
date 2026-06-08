import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

const birthdays = new Map<string, string>();

export const command: HybridCommand = {
  name: "birthday",
  description: "Set or view a birthday.",
  category: "utility",
  aliases: ["bday", "birth"],
  options: [
    { name: "date", description: "Your birthday (MM/DD)", type: ApplicationCommandOptionType.String, required: false },
    { name: "user", description: "User to check birthday for", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    const date = ctx.getString("date") ?? null;
    const target = await ctx.getUser("user") ?? null;
    if (date) {
      if (!/^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])$/.test(date)) return ctx.reply({ content: "Use MM/DD format.", ephemeral: true } as any);
      birthdays.set(ctx.user.id, date);
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x00e676).setDescription(`🎂 Birthday set to **${date}**!`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
    const lookupUser = target ?? ctx.user;
    const bday = birthdays.get(lookupUser.id);
    if (!bday) return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription(`**${lookupUser.username}** has not set their birthday.`).setFooter({ text: config.embedFooter }).setTimestamp()] });
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xffd700).setTitle("🎂 Birthday").setDescription(`**${lookupUser.username}'s** birthday is **${bday}**!`).setThumbnail(lookupUser.displayAvatarURL()).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
