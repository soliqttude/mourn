import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import https from "https";

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { reject(new Error("parse error")); } });
    }).on("error", reject);
  });
}

const LANGS: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", it: "Italian",
  pt: "Portuguese", ru: "Russian", ja: "Japanese", ko: "Korean", zh: "Chinese",
  ar: "Arabic", hi: "Hindi", nl: "Dutch", pl: "Polish", tr: "Turkish",
};

export const command: HybridCommand = {
  name: "translate",
  aliases: ["tr", "lang", "tl"],
  description: "Translate text into another language.",
  category: "utility",
  guildOnly: false,
  options: [
    { name: "text", description: "Text to translate", type: ApplicationCommandOptionType.String, required: true },
    { name: "to", description: "Target language code (e.g. es, fr, de, ja, ko)", type: ApplicationCommandOptionType.String, required: true },
    { name: "from", description: "Source language code (default: en)", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    const to = (ctx.getString("to", true) ?? "es").toLowerCase().slice(0, 2);
    const from = (ctx.getString("from") ?? "en").toLowerCase().slice(0, 2);
    if (!text) return ctx.reply({ embeds: [errorEmbed("Please provide text to translate.")] });
    await ctx.defer();
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
      const data = await fetchJSON(url);
      const result: string = data?.responseData?.translatedText;
      if (!result || data?.responseStatus !== 200) throw new Error("failed");
      return ctx.reply({
        embeds: [brandEmbed({
          title: "Translation",
          fields: [
            { name: LANGS[from] ?? from.toUpperCase(), value: text.slice(0, 1024) },
            { name: LANGS[to] ?? to.toUpperCase(), value: result.slice(0, 1024) },
          ],
          page: "Utility",
        })],
      });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Translation failed. Check the language code and try again.")] });
    }
  },
};
