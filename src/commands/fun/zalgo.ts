import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
const ZC = "̖̗̘̙̜̝̞̟̠̤̥̦̩̪̫̬̭̮̯̰̱̲̳̹̺̻̼͇͈͉͍͎̀́̂̃̄̅̆̇̈̉ͅ".split("");
function zalgo(t: string): string {
  return t.split("").map(c => {
    if (c === " ") return c;
    let r = c;
    const n = Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) r += ZC[Math.floor(Math.random() * ZC.length)]!;
    return r;
  }).join("");
}
export const command: HybridCommand = {
  name: "zalgo", description: "Corrupt text with zalgo glitch characters.", category: "fun",
  options: [{ name: "text", description: "Text to corrupt", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return ctx.reply({ embeds: [errorEmbed("Provide some text.")] });
    return ctx.reply({ embeds: [brandEmbed({ description: zalgo(text.slice(0, 100)), page: "Fun" })] });
  },
};
