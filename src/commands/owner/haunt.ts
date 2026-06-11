import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { ownerState } from "../../lib/ownerState.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "haunt",
  description: "(Owner) React 👻 to every message from a user.",
  usage: "haunt [user] [duration]",
  examples: ["haunt"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
    { name: "duration", description: "Duration in minutes (default 30)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const target = await ctx.getUser("user");
    if (!target) return ctx.reply({ embeds: [errorEmbed("Provide a **user**.")] });
    const minutes = ctx.getNumber("duration") ?? (parseInt(ctx.args[1] ?? "30") || 30);

    if (ownerState.hauntedUsers.has(target.id)) {
      ownerState.hauntedUsers.delete(target.id);
      return ctx.reply({
        embeds: [new EmbedBuilder().setColor(0xffd740).setDescription(`🛑 Haunt **stopped** for **${target.tag}**.`).setTimestamp()],
        ephemeral: true,
      } as any);
    }

    ownerState.hauntedUsers.set(target.id, Date.now() + minutes * 60_000);
    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x7c4dff)
          .setTitle("👻 Haunt Activated")
          .setDescription(`Bot will react 👻 to every message from **${target.tag}** for **${minutes} min**.`)
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
