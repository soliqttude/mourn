import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "pokemon", aliases: ["poke", "pokedex"], description: "Look up a Pokémon.", category: "utility",
  options: [{ name: "name", description: "Pokémon name or Pokédex number", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const name = (ctx.getString("name", true) ?? ctx.args[0] ?? "").toLowerCase();
    if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a Pokémon name.")] });
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`);
      if (!res.ok) return ctx.reply({ embeds: [errorEmbed(`Pokémon **${name}** not found.`)] });
      const p = await res.json() as any;
      const types = p.types.map((t: any) => t.type.name).join(", ");
      const stats = p.stats.map((s: any) => `**${s.stat.name}:** ${s.base_stat}`).join(" | ");
      const abilities = p.abilities.map((a: any) => a.ability.name).join(", ");
      const sprite = p.sprites?.other?.["official-artwork"]?.front_default ?? p.sprites?.front_default;
      return ctx.reply({ embeds: [brandEmbed({
        title: `#${p.id} ${p.name.charAt(0).toUpperCase() + p.name.slice(1)}`,
        thumbnail: sprite,
        fields: [
          { name: "🔷 Types", value: types, inline: true },
          { name: "⚡ Abilities", value: abilities, inline: true },
          { name: "⚖️ Weight", value: `${(p.weight / 10).toFixed(1)} kg`, inline: true },
          { name: "📏 Height", value: `${(p.height / 10).toFixed(1)} m`, inline: true },
          { name: "📊 Base Stats", value: stats, inline: false },
        ],
        page: "Pokémon",
      })] });
    } catch { return ctx.reply({ embeds: [errorEmbed("Failed to fetch Pokémon data.")] }); }
  },
};
