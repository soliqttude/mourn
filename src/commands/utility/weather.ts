import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "weather", description: "Get current weather for a city.", category: "utility",
  options: [{ name: "city", description: "City name", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const city = ctx.getString("city", true) ?? ctx.args.join(" ");
    if (!city) return ctx.reply({ embeds: [errorEmbed("Please provide a city name.")] });
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { headers: { "User-Agent": "mourn-bot/1.0" } });
      if (!res.ok) return ctx.reply({ embeds: [errorEmbed("City not found.")] });
      const data = await res.json() as any;
      const cur = data.current_condition?.[0];
      if (!cur) return ctx.reply({ embeds: [errorEmbed("Could not get weather data.")] });
      const area = data.nearest_area?.[0];
      const name = [area?.areaName?.[0]?.value, area?.country?.[0]?.value].filter(Boolean).join(", ");
      const desc = cur.weatherDesc?.[0]?.value ?? "Unknown";
      const iconMap: [string, string][] = [["Sunny","☀️"],["Clear","🌙"],["Cloud","☁️"],["Overcast","☁️"],["Mist","🌫️"],["Rain","🌧️"],["Snow","❄️"],["Thunder","⛈️"],["Fog","🌫️"],["Drizzle","🌦️"]];
      const icon = iconMap.find(([k]) => desc.includes(k))?.[1] ?? "🌡️";
      return ctx.reply({ embeds: [brandEmbed({
        title: `${icon} Weather — ${name || city}`,
        fields: [
          { name: "🌡️ Temperature", value: `${cur.temp_C}°C / ${cur.temp_F}°F`, inline: true },
          { name: "🤔 Feels Like", value: `${cur.FeelsLikeC}°C / ${cur.FeelsLikeF}°F`, inline: true },
          { name: "📝 Condition", value: desc, inline: true },
          { name: "💧 Humidity", value: `${cur.humidity}%`, inline: true },
          { name: "💨 Wind", value: `${cur.windspeedKmph} km/h`, inline: true },
          { name: "👁️ Visibility", value: `${cur.visibility} km`, inline: true },
        ],
        page: "Weather",
      })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch weather data.")] }); }
  },
};
