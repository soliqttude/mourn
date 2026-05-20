import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

const OID = config.ownerId;

/**
 * ,masquerade @user <message>
 * Uses a temporary webhook to post a message that looks exactly like it came
 * from <user> — their avatar, their server display name, everything.
 * The webhook is created, fired, then deleted so it leaves no trace.
 */
export const command: HybridCommand = {
  name: "masquerade",
  description: "(Owner) Send a message as any user using a ghost webhook.",
  usage: "masquerade [user] [message]",
  examples: ["masquerade @someone hey what's up"],
  category: "owner",
  ownerOnly: true,
  noSlash: false,
  options: [
    {
      name: "target",
      description: "User to impersonate",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "message",
      description: "Message to send as them",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("not your toy.")], ephemeral: true } as any);
    }

    const target = await ctx.getUser("target");
    const text   = ctx.getString("message") ?? ctx.args.slice(1).join(" ");

    if (!target) return ctx.reply({ embeds: [errorEmbed("couldn't resolve that user.")] });
    if (!text)   return ctx.reply({ embeds: [errorEmbed("provide a message to send.")] });
    if (!ctx.channel || !ctx.guild) {
      return ctx.reply({ embeds: [errorEmbed("must be used in a server channel.")] });
    }

    // Need manage webhooks permission
    const botMember = ctx.guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
      return ctx.reply({ embeds: [errorEmbed("i need **Manage Webhooks** permission to do this.")] });
    }

    // Resolve display name + avatar in this guild
    const member = ctx.guild.members.cache.get(target.id);
    const displayName = member?.displayName ?? target.username;
    const avatarUrl   = member?.displayAvatarURL({ size: 256, extension: "png" })
                        ?? target.displayAvatarURL({ size: 256, extension: "png" });

    // Silently delete the invoking prefix message
    if (ctx.source === "prefix" && "delete" in ctx.raw) {
      (ctx.raw as any).delete().catch(() => {});
    } else if (ctx.source === "slash") {
      // Defer ephemerally — we'll ack after
      await ctx.defer(true);
    }

    let webhook: Awaited<ReturnType<typeof ctx.channel.createWebhook>> | null = null;
    try {
      webhook = await (ctx.channel as any).createWebhook({
        name:   displayName,
        avatar: avatarUrl,
        reason: "masquerade (owner cmd)",
      });

      await webhook.send({ content: text });
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed("failed to send — check my permissions.")] });
    } finally {
      // Always delete the webhook to leave no trace
      if (webhook) webhook.delete().catch(() => {});
    }

    if (ctx.source === "slash") {
      return ctx.reply({ content: "👻 sent.", ephemeral: true } as any);
    }
  },
};
