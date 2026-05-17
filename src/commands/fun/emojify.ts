import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
const MAP: Record<string, string> = {
  a:"🅰️",b:"🅱️",c:"©️",d:"↩️",e:"📧",f:"🎏",g:"🌀",h:"♓",i:"ℹ️",j:"🎷",
  k:"🎋",l:"🌊",m:"〽️",n:"🆖",o:"🅾️",p:"🅿️",q:"🍭",r:"®️",s:"💲",t:"✝️",
  u:"⛎",v:"✅",w:"〰️",x:"❌",y:"💛",z:"💤",
  "0":"0️⃣","1":"1️⃣","2":"2️⃣","3":"3️⃣","4":"4️⃣","5":"5️⃣","6":"6️⃣","7":"7️⃣","8":"8️⃣","9":"9️⃣",
  "!":"❗","?":"❓","+":"➕","-":"➖",
};
export const command: HybridCommand = {
  name: "emojify",
  aliases: ["emoji", "emojis"], description: "Convert text to emoji letters.", category: "fun",
  options: [{ name: "text", description: "Text to emojify", type: ApplicationCommandOptionType.String, required: true }],
  async execute(ctx) {
    const text = ctx.getString("text", true) ?? ctx.rawArgs;
    if (!text) return ctx.reply({ embeds: [errorEmbed("Please provide some text.")] });
    const result = text.toLowerCase().slice(0, 80).split("").map(c => MAP[c] ?? (c === " " ? "   " : c)).join(" ");
    return ctx.reply({ embeds: [brandEmbed({ description: result.slice(0, 2000), page: "Fun" })] });
  },
};
