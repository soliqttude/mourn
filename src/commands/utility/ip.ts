import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "ip", aliases: ["iplookup", "geoip"], description: "Look up information about an IP address.", category: "utility",
  options: [{ name: "address", description: "IP address to look up", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const addr = ctx.getString("address", true) ?? ctx.args[0];
    if (!addr) return ctx.reply({ embeds: [errorEmbed("Please provide an IP address.")] });
    try {
      const res = await fetch(`https://ipapi.co/${encodeURIComponent(addr)}/json/`, { headers: { "User-Agent": "bleed-bot/1.0" } });
      const data = await res.json() as any;
      if (data.error) return ctx.reply({ embeds: [errorEmbed(data.reason ?? "Invalid IP address.")] });
      return ctx.reply({ embeds: [brandEmbed({ title: `🌐 IP Lookup: ${data.ip}`, fields: [{ name: "🌍 Country", value: `${data.country_name ?? "Unknown"} ${data.country_flag_emoji ?? ""}`, inline: true }, { name: "🏙️ City", value: data.city ?? "Unknown", inline: true }, { name: "📍 Region", value: data.region ?? "Unknown", inline: true }, { name: "🏢 ISP", value: (data.org ?? "Unknown").slice(0, 100), inline: true }, { name: "⏰ Timezone", value: data.timezone ?? "Unknown", inline: true }, { name: "📮 Postal", value: data.postal ?? "—", inline: true }], page: "IP Lookup" })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to look up IP address.")] }); }
  },
};
