import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
const OID = "177803210738630656";

// In-memory command usage log - shared across the module
const usageLog = new Map<string, { cmd: string; ts: number; guild: string }[]>();

export function logUsage(userId: string, cmd: string, guildId: string) {
  const arr = usageLog.get(userId) ?? [];
  arr.unshift({ cmd, ts: Date.now(), guild: guildId });
  if (arr.length > 20) arr.length = 20;
  usageLog.set(userId, arr);
}

export const command: HybridCommand = {
  name: "snitch",
  description: "(Owner) View recent command usage for a user.",
  category: "owner",
  ownerOnly: true,
  aliases: ["spy2", "cmdlog"],
  options: [
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    const target = ctx.getUser("user") ?? null;
    const userId = (target as any)?.id ?? ctx.args[0]?.replace(/[<@!>]/g, "");
    if (!userId) return ctx.reply({ content: "Provide a user." });

    const logs = usageLog.get(userId) ?? [];
    const user = await ctx.client.users.fetch(userId).catch(() => null);
    const lines = logs.length
      ? logs.map((l, i) => `${i + 1}. \`${l.cmd}\` — <t:${Math.floor(l.ts / 1000)}:R>`)
      : ["No recent commands logged."];

    return ctx.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x8b0000)
          .setTitle(`🕵️ Command Log — ${user?.tag ?? userId}`)
          .setDescription(lines.join("\n"))
          .setThumbnail(user?.displayAvatarURL() ?? null)
          .setFooter({ text: `${config.embedFooter} • Logs persist until bot restart` })
          .setTimestamp(),
      ],
      ephemeral: true,
    } as any);
  },
};
