import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "minecraft", aliases: ["mcstatus", "mc"], description: "Check a Minecraft server status.", category: "utility",
  options: [{ name: "ip", description: "Server IP address (e.g. play.hypixel.net)", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const ip = ctx.getString("ip", true) ?? ctx.args[0];
    if (!ip) return ctx.reply({ embeds: [errorEmbed("Please provide a server IP.")] });
    try {
      const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`);
      const data = await res.json() as any;
      if (!data.online) return ctx.reply({ embeds: [errorEmbed(`Server **${ip}** is **offline** or doesn't exist.`)] });
      const motd = (data.motd?.clean ?? []).join(" ").trim() || "No MOTD";
      return ctx.reply({ embeds: [brandEmbed({
        title: `⛏️ Minecraft — ${ip}`,
        fields: [
          { name: "📶 Status", value: "🟢 **Online**", inline: true },
          { name: "👥 Players", value: `${data.players?.online ?? 0} / ${data.players?.max ?? 0}`, inline: true },
          { name: "🔢 Version", value: data.version ?? "Unknown", inline: true },
          { name: "📝 MOTD", value: motd.slice(0, 200), inline: false },
        ],
        page: "Minecraft",
      })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch server status.")] }); }
  },
};
