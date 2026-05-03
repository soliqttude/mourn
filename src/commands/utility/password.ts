import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed } from "../../lib/embeds.js";
import crypto from "crypto";
const CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_+-=";
export const command: HybridCommand = {
  name: "password", aliases: ["passgen", "genpass"], description: "Generate a secure random password.", category: "utility",
  options: [{ name: "length", description: "Password length (8–64, default 16)", type: ApplicationCommandOptionType.Number, required: false }],
  async execute(ctx) {
    const len = Math.min(64, Math.max(8, ctx.getNumber("length") ?? parseInt(ctx.args[0] ?? "16") || 16));
    const bytes = crypto.randomBytes(len * 2);
    let pass = "";
    for (let i = 0; i < len; i++) pass += CHARS[bytes[i]! % CHARS.length];
    return ctx.reply({ embeds: [brandEmbed({ title: "🔐 Password Generator", description: `**Length:** ${len}\n\`${pass}\`\n\n*⚠️ This is visible to everyone — use DMs for sensitive passwords.*`, page: "Password" })] });
  },
};
