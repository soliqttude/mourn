import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { pinsConfig } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { config } from "../../config.js";

async function getConfig(guildId: string) {
  const [row] = await db.select().from(pinsConfig).where(eq(pinsConfig.guildId, guildId));
  return row ?? null;
}

export const command: HybridCommand = {
  name: "pins",
  description: "Pin archival system — archive channel pins to a log channel.",
  usage: "pins <set|channel|archive|unpin|config|reset> [args]",
  examples: ["pins set on", "pins channel #pin-archive", "pins archive", "pins config"],
  category: "settings",
  permission: "manage_messages",
  guildOnly: true,
  options: [
    { name: "subcommand", description: "set | channel | archive | unpin | config | reset", type: ApplicationCommandOptionType.String, required: true,
      choices: [
        { name: "set", value: "set" }, { name: "channel", value: "channel" },
        { name: "archive", value: "archive" }, { name: "unpin", value: "unpin" },
        { name: "config", value: "config" }, { name: "reset", value: "reset" },
      ] },
    { name: "option", description: "on/off or channel", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Archive channel", type: ApplicationCommandOptionType.Channel, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sub = (ctx.getString("subcommand") ?? ctx.args[0] ?? "").toLowerCase();
    const option = (ctx.getString("option") ?? ctx.args[1] ?? "").toLowerCase();

    if (sub === "config") {
      const cfg = await getConfig(ctx.guild.id);
      return ctx.reply({ embeds: [brandEmbed({
        title: "Pin Archival Config",
        fields: [
          { name: "enabled", value: cfg?.enabled ? "on" : "off", inline: true },
          { name: "archive channel", value: cfg?.archiveChannel ? `<#${cfg.archiveChannel}>` : "not set", inline: true },
          { name: "unpin on archive", value: cfg?.unpinOnArchive ? "yes" : "no", inline: true },
        ],
      })] });
    }

    if (sub === "reset") {
      await db.delete(pinsConfig).where(eq(pinsConfig.guildId, ctx.guild.id));
      return ctx.reply({ embeds: [successEmbed("Pin archival config reset.")] });
    }

    if (sub === "set") {
      const on = option === "on" || option === "true" || option === "enable";
      await db.insert(pinsConfig).values({ guildId: ctx.guild.id, enabled: on, archiveChannel: null, unpinOnArchive: false })
        .onConflictDoUpdate({ target: pinsConfig.guildId, set: { enabled: on } });
      return ctx.reply({ embeds: [successEmbed(`pin archival ${on ? "enabled" : "disabled"}.`)] });
    }

    if (sub === "unpin") {
      const on = option === "on" || option === "true";
      await db.insert(pinsConfig).values({ guildId: ctx.guild.id, enabled: false, archiveChannel: null, unpinOnArchive: on })
        .onConflictDoUpdate({ target: pinsConfig.guildId, set: { unpinOnArchive: on } });
      return ctx.reply({ embeds: [successEmbed(`unpin on archive: ${on ? "enabled" : "disabled"}.`)] });
    }

    if (sub === "channel") {
      const ch = ctx.getChannel("channel") ?? (ctx.args[1] ? ctx.guild.channels.cache.get(ctx.args[1].replace(/[<#>]/g, "")) : null) as any;
      if (!ch) return ctx.reply({ embeds: [errorEmbed("Please provide a **channel**.")] });
      await db.insert(pinsConfig).values({ guildId: ctx.guild.id, enabled: false, archiveChannel: ch.id, unpinOnArchive: false })
        .onConflictDoUpdate({ target: pinsConfig.guildId, set: { archiveChannel: ch.id } });
      return ctx.reply({ embeds: [successEmbed(`archive channel set to <#${ch.id}>.`)] });
    }

    if (sub === "archive") {
      const cfg = await getConfig(ctx.guild.id);
      if (!cfg?.archiveChannel) return ctx.reply({ embeds: [errorEmbed("No archive **channel** set. use `,pins **channel** #channel` first.")] });
      const archiveCh = ctx.guild.channels.cache.get(cfg.archiveChannel) as TextChannel | undefined;
      if (!archiveCh?.isTextBased()) return ctx.reply({ embeds: [errorEmbed("Archive **channel** not found.")] });
      const currentCh = ctx.channel as TextChannel;
      const pins = await currentCh.messages.fetchPinned();
      if (!pins.size) return ctx.reply({ embeds: [errorEmbed("No pinned messages in this **channel**.")] });
      let archived = 0;
      for (const [, msg] of pins.sort((a, b) => a.createdTimestamp - b.createdTimestamp)) {
        const embed = new EmbedBuilder()
          .setColor(config.brandColor as any)
          .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
          .setDescription(msg.content || "*no text content*")
          .addFields(
            { name: "channel", value: `<#${msg.channelId}>`, inline: true },
            { name: "sent", value: `<t:${Math.floor(msg.createdTimestamp / 1000)}:R>`, inline: true },
          )
          .setURL(msg.url);
        if (msg.attachments.size) embed.setImage(msg.attachments.first()!.url);
        await archiveCh.send({ embeds: [embed] });
        if (cfg.unpinOnArchive) { try { await msg.unpin(); } catch { /* ignore */ } }
        archived++;
      }
      return ctx.reply({ embeds: [successEmbed(`archived ${archived} pin${archived === 1 ? "" : "s"} to <#${archiveCh.id}>.`)] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown subcommand.")] });
  },
};
