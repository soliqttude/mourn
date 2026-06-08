import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "weather",
  description: "Get current weather for a city.",
  category: "utility",
  aliases: ["forecast", "wx"],
  options: [{ name: "city", description: "City name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const city = ctx.getString("city") ?? ctx.args.join(" ");
    if (!city) return ctx.reply({ content: "Provide a city.", ephemeral: true } as any);
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      const data = await res.json() as any;
      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      const name = `${area.areaName[0].value}, ${area.country[0].value}`;
      const temp_c = current.temp_C, temp_f = current.temp_F;
      const feels_c = current.FeelsLikeC, feels_f = current.FeelsLikeF;
      const humidity = current.humidity;
      const desc = current.weatherDesc[0].value;
      const windKmph = current.windspeedKmph;
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x87ceeb).setTitle(`🌤️ Weather — ${name}`).addFields({ name: "Condition", value: desc, inline: true },{ name: "Temperature", value: `${temp_c}°C / ${temp_f}°F`, inline: true },{ name: "Feels Like", value: `${feels_c}°C / ${feels_f}°F`, inline: true },{ name: "Humidity", value: `${humidity}%`, inline: true },{ name: "Wind", value: `${windKmph} km/h`, inline: true }).setFooter({ text: `Data via wttr.in • ${config.embedFooter}` }).setTimestamp()] });
    } catch {
      return ctx.reply({ embeds: [new EmbedBuilder().setColor(0xff4444).setDescription("Could not fetch weather. Check the city name.").setFooter({ text: config.embedFooter }).setTimestamp()] });
    }
  },
};
