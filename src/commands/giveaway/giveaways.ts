import {
  ApplicationCommandOptionType as T,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { parseDuration } from "../../lib/time.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { giveaways } from "../../db/schema.js";
import {
  createGiveaway, endGiveaway, rerollGiveaway, cancelGiveaway, refreshGiveawayMessage,
} from "../../features/giveaway.js";

const opt = (name: string, description: string, type: T, required = true) =>
  ({ name, description, type, required });
const text = (name: string, description: string, required = true) => opt(name, description, T.String, required);
const number = (name: string, description: string, required = true) => opt(name, description, T.Integer, required);
const roleOptions = (description: string) => [1,2,3,4,5].map(i => opt(`role${i}`, description, T.Role, false));
const hostOptions = [1,2,3].map(i => opt(`user${i}`, "Additional giveaway host", T.User, false));
const link = opt("giveaway", "Link to the giveaway message", T.String, true);
const editSub = (name: string, description: string, options: any[]) =>
  ({ name, description, type: T.Subcommand, options });

const editOptions = [
  editSub("color", "Change the giveaway embed color", [link, text("color", "Hex color, e.g. #5865F2")]),
  editSub("roles", "Roles to award to giveaway winners", [link, ...roleOptions("Role awarded to every winner")]),
  editSub("maxlevel", "Set the maximum entry level", [link, number("level", "Maximum level")]),
  editSub("prize", "Change the giveaway prize", [link, text("prize", "New prize")]),
  editSub("age", "Set minimum Discord account age in days", [link, number("days", "Minimum account age in days")]),
  editSub("host", "Change giveaway hosts", [link, ...hostOptions]),
  editSub("image", "Change the giveaway image", [link,
    opt("url", "Image URL", T.String, false), opt("attachment", "Image attachment", T.Attachment, false)]),
  editSub("description", "Change the giveaway description", [link, text("text", "New description")]),
  editSub("winners", "Change the number of winners", [link, number("count", "Number of winners")]),
  editSub("stay", "Set minimum time in this server in days", [link, number("days", "Minimum server stay in days")]),
  editSub("requiredroles", "Set roles required to enter; leave all empty to clear", [link, ...roleOptions("Required entry role")]),
  editSub("thumbnail", "Change the giveaway thumbnail", [link,
    opt("url", "Thumbnail URL", T.String, false), opt("attachment", "Thumbnail attachment", T.Attachment, false)]),
  editSub("minlevel", "Set the minimum entry level", [link, number("level", "Minimum level")]),
  editSub("duration", "Change when the giveaway ends", [link, text("duration", "New duration, e.g. 12h or 2d")]),
];

const options: any[] = [
  { name: "quick", description: "Start a 24-hour giveaway in this channel (one winner)", type: T.Subcommand, options: [] },
  editSub("start", "Start a giveaway with custom options", [
    text("duration", "Duration, e.g. 24h, 2d"), text("prize", "Giveaway prize"),
    opt("channel", "Channel to post the giveaway in", T.Channel),
    number("winners", "Number of winners"),
  ]),
  editSub("end", "End an active giveaway early", [link]),
  editSub("list", "List active and past giveaways in this server", []),
  editSub("reroll", "Pick replacement winner(s) for a giveaway", [link, number("winners", "Number of new winners", false)]),
  editSub("cancel", "Delete a giveaway without selecting winners", [link]),
  { name: "edit", description: "Edit an existing giveaway", type: T.SubcommandGroup, options: editOptions },
];

function getSub(interaction: ChatInputCommandInteraction): string {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand(false);
  return group ? `${group} ${sub}` : sub;
}

function hasPermission(ctx: Parameters<HybridCommand["execute"]>[0], permission: bigint): boolean {
  return !!ctx.member?.permissions.has(permission);
}

async function findGiveaway(ctx: Parameters<HybridCommand["execute"]>[0], messageLink: string) {
  const match = messageLink.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!match || !ctx.guild || match[1] !== ctx.guild.id) return null;
  const messageId = match[3]!;
  const rows = await db.select().from(giveaways).where(and(
    eq(giveaways.guildId, ctx.guild.id), eq(giveaways.messageId, messageId),
  ));
  return rows[0] ?? null;
}

function imageValue(interaction: ChatInputCommandInteraction): string | null {
  const attachment = interaction.options.getAttachment("attachment");
  return attachment?.url ?? interaction.options.getString("url");
}

export const command: HybridCommand = {
  name: "giveaways",
  description: "Create and manage server giveaways.",
  category: "giveaway",
  guildOnly: true,
  options,
  usage: "/giveaways start duration:24h prize:\"Concert Tickets\" channel:#giveaways winners:2",
  examples: ["/giveaways start duration:24h prize:\"Concert Tickets\" channel:#giveaways winners:2"],
  async execute(ctx) {
    if (!ctx.guild || ctx.source !== "slash") {
      return ctx.reply({ embeds: [errorEmbed("Use the /giveaways slash command in a server.")] });
    }
    const interaction = ctx.raw as ChatInputCommandInteraction;
    const sub = getSub(interaction);
    const needsManageChannels = !["list"].includes(sub);
    if (needsManageChannels && !hasPermission(ctx, PermissionFlagsBits.ManageChannels)) {
      return ctx.reply({ embeds: [errorEmbed("You need the **Manage Channels** permission to use this giveaway command.")] });
    }
    if (["edit roles", "edit requiredroles", "edit age", "edit stay"].includes(sub) &&
        !hasPermission(ctx, PermissionFlagsBits.ManageRoles)) {
      return ctx.reply({ embeds: [errorEmbed("You also need the **Manage Roles** permission for this setting.")] });
    }
    if (sub === "edit image" && !hasPermission(ctx, PermissionFlagsBits.ManageGuild)) {
      return ctx.reply({ embeds: [errorEmbed("You also need the **Manage Server** permission to change giveaway images.")] });
    }

    if (sub === "quick") {
      await ctx.defer();
      const id = await createGiveaway(ctx.client, ctx.guild.id, ctx.channel!.id, ctx.user.id,
        "Mystery Prize", 1, new Date(Date.now() + 86_400_000));
      return ctx.reply({ embeds: [successEmbed(`24-hour giveaway #${id} started in this channel.`, "giveaway")] });
    }

    if (sub === "start") {
      const duration = interaction.options.getString("duration", true);
      const prize = interaction.options.getString("prize", true);
      const channel = interaction.options.getChannel("channel", true);
      const winners = interaction.options.getInteger("winners", true);
      const durationMs = parseDuration(duration);
      if (!durationMs || durationMs < 10_000 || durationMs > 365 * 86_400_000) {
        return ctx.reply({ embeds: [errorEmbed("Duration must be between 10 seconds and 365 days (examples: 30m, 24h, 7d).")] });
      }
      if (winners < 1 || winners > 100) return ctx.reply({ embeds: [errorEmbed("Winner count must be between 1 and 100.")] });
      if (!channel.isTextBased() || !("send" in channel)) return ctx.reply({ embeds: [errorEmbed("Choose a text channel.")] });
      await ctx.defer();
      const id = await createGiveaway(ctx.client, ctx.guild.id, channel.id, ctx.user.id, prize, winners,
        new Date(Date.now() + durationMs));
      return ctx.reply({ embeds: [successEmbed(`Giveaway #${id} started in <#${channel.id}>.`, "giveaway")] });
    }

    if (sub === "list") {
      const rows = await db.select().from(giveaways).where(eq(giveaways.guildId, ctx.guild.id));
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("There are no giveaways in this server yet.")] });
      const sorted = rows.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
      const pages: string[][] = [];
      for (let i = 0; i < sorted.length; i += 20) {
        pages.push(sorted.slice(i, i + 20).map(g =>
          `• **${g.prize}** — ${g.ended ? "Ended" : "Active"} · ${g.winnersCount} winner(s) · <#${g.channelId}> · [message](https://discord.com/channels/${g.guildId}/${g.channelId}/${g.messageId ?? ""})`
        ));
      }
      return ctx.reply({ embeds: pages.map((lines, i) => brandEmbed({
        description: `**Giveaways (${rows.length}) — ${i + 1}/${pages.length}**\n\n${lines.join("\n")}`,
        page: "giveaway",
      })) });
    }

    const targetLink = interaction.options.getString("giveaway", true);
    const giveaway = await findGiveaway(ctx, targetLink);
    if (!giveaway) return ctx.reply({ embeds: [errorEmbed("I couldn't find a giveaway from that message link. Paste the link to its original giveaway message.")] });

    if (sub === "end") {
      if (giveaway.ended) return ctx.reply({ embeds: [errorEmbed("That giveaway has already ended.")] });
      await ctx.defer();
      const winners = await endGiveaway(ctx.client, giveaway.id);
      return ctx.reply({ embeds: [successEmbed(`Giveaway ended. ${winners.length} winner(s) selected.`, "giveaway")] });
    }
    if (sub === "cancel") {
      if (giveaway.ended) return ctx.reply({ embeds: [errorEmbed("That giveaway has already ended or been cancelled.")] });
      await cancelGiveaway(ctx.client, giveaway);
      return ctx.reply({ embeds: [successEmbed("Giveaway cancelled and its message deleted.", "giveaway")] });
    }
    if (sub === "reroll") {
      const count = interaction.options.getInteger("winners") ?? 1;
      if (count < 1 || count > 100) return ctx.reply({ embeds: [errorEmbed("Winner count must be between 1 and 100.")] });
      await ctx.defer();
      const winners = await rerollGiveaway(ctx.client, giveaway, count);
      return ctx.reply({ embeds: [successEmbed(`New winner(s): ${winners.map(id => `<@${id}>`).join(", ")}`, "giveaway")] });
    }

    if (sub.startsWith("edit ")) {
      if (giveaway.ended) return ctx.reply({ embeds: [errorEmbed("You can only edit active giveaways.")] });
      const field = sub.slice(5);
      const update: Partial<typeof giveaways.$inferInsert> = {};
      const str = (name: string) => interaction.options.getString(name);
      const int = (name: string) => interaction.options.getInteger(name);
      if (field === "prize") update.prize = str("prize")!;
      else if (field === "description") update.description = str("text")!;
      else if (field === "winners") {
        const count = int("count")!;
        if (count < 1 || count > 100) return ctx.reply({ embeds: [errorEmbed("Winner count must be between 1 and 100.")] });
        update.winnersCount = count;
      } else if (field === "minlevel" || field === "maxlevel") {
        const level = int("level")!;
        if (level < 0 || level > 100_000) return ctx.reply({ embeds: [errorEmbed("Level must be 0 or higher.")] });
        if (field === "minlevel") update.minLevel = level; else update.maxLevel = level;
      } else if (field === "age" || field === "stay") {
        const days = int("days")!;
        if (days < 0 || days > 36_500) return ctx.reply({ embeds: [errorEmbed("Days must be between 0 and 36500.")] });
        if (field === "age") update.minAccountAgeDays = days || null;
        else update.minServerStayDays = days || null;
      } else if (field === "duration") {
        const ms = parseDuration(str("duration")!);
        if (!ms || ms < 10_000 || ms > 365 * 86_400_000) return ctx.reply({ embeds: [errorEmbed("Enter a valid duration such as 12h or 2d (maximum 365 days).")] });
        update.endsAt = new Date(Date.now() + ms);
      } else if (field === "color") {
        const color = str("color")!.replace(/^#/, "");
        if (!/^[0-9a-fA-F]{6}$/.test(color)) return ctx.reply({ embeds: [errorEmbed("Use a six-digit hex color, such as #5865F2.")] });
        update.color = color;
      } else if (field === "host") {
        const hosts = [1,2,3].map(i => interaction.options.getUser(`user${i}`)).filter(Boolean).map(u => u!.id);
        if (!hosts.length) return ctx.reply({ embeds: [errorEmbed("Provide at least one host.")] });
        update.hostIds = hosts;
      } else if (field === "roles" || field === "requiredroles") {
        const roles = [1,2,3,4,5].map(i => interaction.options.getRole(`role${i}`)).filter(Boolean).map(r => r!.id);
        if (field === "roles") update.awardRoleIds = roles;
        else update.requiredRoleIds = roles;
      } else if (field === "image" || field === "thumbnail") {
        const url = imageValue(interaction);
        if (!url) return ctx.reply({ embeds: [errorEmbed("Provide an image URL or attach an image.")] });
        if (!/^https?:\/\//i.test(url)) return ctx.reply({ embeds: [errorEmbed("That image URL is invalid.")] });
        if (field === "image") update.imageUrl = url; else update.thumbnail = url;
      }

      await db.update(giveaways).set(update).where(eq(giveaways.id, giveaway.id));
      const refreshed = { ...giveaway, ...update };
      await refreshGiveawayMessage(ctx.client, refreshed as typeof giveaway);
      return ctx.reply({ embeds: [successEmbed(`Giveaway ${field} updated.`, "giveaway")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown giveaway action.")] });
  },
};
