import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "countdown",
  description: "(Owner) Send a live countdown that edits itself each second.",
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "seconds", description: "Seconds to count down (max 60)", type: ApplicationCommandOptionType.Integer, required: true },
    { name: "message", description: "Message when countdown ends", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const secs = Math.min(60, Math.max(1, ctx.getNumber("seconds") ?? parseInt(ctx.args[0] ?? "10") || 10));
    const endMsg = ctx.getString("message") ?? ctx.args.slice(1).join(" ") || "🚀 Time's up!";

    const makeEmbed = (remaining: number) => new EmbedBuilder()
      .setColor(remaining > 10 ? 0x00e676 : remaining > 3 ? 0xffd740 : 0xff1744)
      .setTitle("⏱️ Countdown")
      .setDescription(`**${remaining}** second${remaining !== 1 ? "s" : ""} remaining...`)
      .setTimestamp();

    const msg = await ctx.channel!.send({ embeds: [makeEmbed(secs)] });
    let remaining = secs - 1;

    const interval = setInterval(async () => {
      if (remaining <= 0) {
        clearInterval(interval);
        await msg.edit({
          embeds: [new EmbedBuilder().setColor(0x00e676).setTitle("✅ Done!").setDescription(endMsg).setTimestamp()],
        }).catch(() => {});
        return;
      }
      await msg.edit({ embeds: [makeEmbed(remaining)] }).catch(() => clearInterval(interval));
      remaining--;
    }, 1000);
  },
};
