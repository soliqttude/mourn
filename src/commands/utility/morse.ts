import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
const M: Record<string, string> = {
  A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",I:"..",J:".---",
  K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",Q:"--.-",R:".-.",S:"...",T:"-",
  U:"..-",V:"...-",W:".--",X:"-..-",Y:"-.--",Z:"--..",
  "0":"-----","1":".----","2":"..---","3":"...--","4":"....-","5":".....",
  "6":"-....","7":"--...","8":"---..","9":"----.",".":" .-.-.-",",":" --..--",
};
const RM = Object.fromEntries(Object.entries(M).map(([k, v]) => [v.trim(), k]));
export const command: HybridCommand = {
  name: "morse", aliases: ["morsecode"], description: "Encode text to or decode morse code.", category: "utility",
  options: [
    { name: "text", description: "Text to encode, or morse code to decode", type: ApplicationCommandOptionType.String, required: true },
    { name: "decode", description: "Set to true to decode morse instead of encode", type: ApplicationCommandOptionType.Boolean, required: false },
  ],
  async execute(ctx) {
    const text = (ctx.getString("text", true) ?? ctx.rawArgs).trim();
    const decode = ctx.getBoolean("decode") ?? false;
    if (!text) return ctx.reply({ embeds: [errorEmbed("Provide text to encode, or morse code to decode.")] });
    if (decode) {
      const result = text.split("   ").map(w => w.split(" ").map(c => RM[c] ?? "?").join("")).join(" ");
      return ctx.reply({ embeds: [brandEmbed({ title: "📡 Morse → Text", description: `\`${text.slice(0, 400)}\`\n→ **${result}**`, page: "Morse" })] });
    }
    const result = text.toUpperCase().slice(0, 100).split("").map(c => c === " " ? "   " : (M[c] ?? c)).join(" ");
    return ctx.reply({ embeds: [brandEmbed({ title: "📡 Text → Morse", description: `**${text}**\n→ \`${result.slice(0, 1000)}\``, page: "Morse" })] });
  },
};
