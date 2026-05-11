import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "trollmode",
  description: "(Owner) Make every command a random fake error for a user.",
  category: "owner",
  ownerOnly: true,
  aliases: ["troll"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration in minutes (default 60)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const target = await ctx.getUser("user");
    if (!target) return ctx.reply({ embeds: [errorEmbed("Provide a user.")] });
    const minutes = ctx.getNumber("duration") ?? (parseInt(ctx.args[1] ?? "60") || 60);

    if (ownerState.trolledUsers.has(target.id)) {
      ownerState.trolledUsers.delete(target.id);
      return ctx.reply({
        embeds: [new EmbedBuilder().setColor(0xffd740).setDescription(`🛑 Troll mode **disabled** for **${target.tag}**.`).setTimestamp()],
        ephemeral: true,
      } as any);
    }

    ownerState.trolledUsers.set(target.id, Date.now() + minutes * 60_000);
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff6d00)
          .setTitle("😈 Troll Mode Activated")
          .setDescription(`Every command run by **${target.tag}** will return a fake error for **${minutes} min**.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
