import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";
import { createHash } from "crypto";

export const command: HybridCommand = {
  name: "hash",
  description: "Hash text using MD5, SHA1, or SHA256.",
  category: "utility",
  aliases: ["md5","sha256"],
  options: [
    { name: "algorithm", description: "md5, sha1, or sha256", type: ApplicationCommandOptionType.String, required: true },
    { name: "text", description: "Text to hash", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    const algo = (ctx.getString("algorithm") ?? ctx.args[0] ?? "sha256").toLowerCase();
    const text = ctx.getString("text") ?? ctx.args.slice(1).join(" ");
    if (!["md5","sha1","sha256","sha512"].includes(algo)) return ctx.reply({ content: "Supported: md5, sha1, sha256, sha512.", ephemeral: true } as any);
    if (!text) return ctx.reply({ content: "Provide text.", ephemeral: true } as any);
    const hashed = createHash(algo).update(text).digest("hex");
    return ctx.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🔒 Hash (${algo.toUpperCase()})`).addFields({ name: "Input", value: `\`${text.slice(0,200)}\`` },{ name: "Output", value: `\`${hashed}\`` }).setFooter({ text: config.embedFooter }).setTimestamp()] });
  },
};
