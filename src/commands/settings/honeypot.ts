import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";
import { db } from "../../db/index.js";
import { honeypots } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

const VALID = ["ban", "softban", "jail"] as const;

export const command: HybridCommand = {
  name: "honeypot",
  aliases: ["honey"],
  description: "Configure bait channels that automatically punish users who send messages in them.",
  category: "settings",
  permission: "administrator",
  guildOnly: true,
  usage: "honeypot (add|remove|list) [channel] [punishment]",
  examples: ["honeypot add #bait ban", "honeypot add #bait softban", "honeypot remove #bait", "honeypot list"],
  options: [
    { name: "action", description: "add, remove, or list", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }] },
    { name: "channel", description: "Honeypot channel", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "punishment", description: "Punishment", type: ApplicationCommandOptionType.String, required: false, choices: VALID.map(v => ({ name: v, value: v })) },
  ],
  async execute(ctx) {
    if (!config.databaseEnabled) return ctx.reply({ embeds: [errorEmbed("honeypot requires the database to be enabled.")] });
    const guild = ctx.guild;
    if (!guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const channel = ctx.getChannel("channel");
    const rawChannel = ctx.args[1];
    const target = channel ?? (rawChannel ? guild.channels.cache.get(rawChannel.replace(/[<#>]/g, "")) : null);

    if (action === "list") {
      const rows = await db.select().from(honeypots).where(eq(honeypots.guildId, guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("no honeypot channels are configured.")] });
      return ctx.reply({ embeds: [brandEmbed({ description: "**honeypots**\n\n" + rows.map(r => `<#${r.channelId}> — \`${r.punishment}\``).join("\n"), page: "settings" })] });
    }

    if (!target?.id) return ctx.reply({ embeds: [errorEmbed("specify a **channel**.")] });
    if (action === "remove") {
      await db.delete(honeypots).where(and(eq(honeypots.guildId, guild.id), eq(honeypots.channelId, target.id)));
      return ctx.reply({ embeds: [successEmbed(`removed <#${target.id}> from the honeypots.`, "settings")] });
    }
    if (action !== "add") return ctx.reply({ embeds: [errorEmbed("invalid action.")] });
    const punishment = (ctx.getString("punishment") ?? ctx.args[2] ?? "").toLowerCase();
    if (!VALID.includes(punishment as typeof VALID[number])) return ctx.reply({ embeds: [errorEmbed("punishment must be `ban`, `softban`, or `jail`.")] });

    await db.insert(honeypots).values({ guildId: guild.id, channelId: target.id, punishment })
      .onConflictDoUpdate({ target: [honeypots.guildId, honeypots.channelId], set: { punishment } });
    const warning = new EmbedBuilder()
      .setColor(0x8b1e2d)
      .setAuthor({ name: "VILLAIN SECURITY", iconURL: ctx.client.user?.displayAvatarURL() })
      .setTitle("Honeypot channel — do not send messages")
      .setDescription("This channel is a security honeypot.\n\nDo not type or send messages here. Messages sent in this channel automatically trigger the server’s configured security action.")
      .addFields(
        { name: "Enforcement", value: punishment, inline: true },
        { name: "Security notice", value: "This channel is monitored by server security.", inline: true },
      )
      .setFooter({ text: guild.name + " • Villain Security" })
      .setTimestamp();
    await (target as any).send({ embeds: [warning], allowedMentions: { parse: [] } }).catch(() => null);
    return ctx.reply({ embeds: [successEmbed(`<#${target.id}> is now a honeypot with **${punishment}** punishment. A warning embed was posted in the channel.`, "settings")] });
  },
};
