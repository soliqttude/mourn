import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";

/**
 * ,masquerade @user <message>
 * Creates a ghost webhook, sends as the target user (their avatar + display
 * name), then instantly deletes the webhook — no trace left behind.
 */
export const command: HybridCommand = {
  name: "masquerade",
  description: "(Owner) Send a message as any user via a ghost webhook.",
  usage: "masquerade [user] [message]",
  examples: ["masquerade @someone hey what's up"],
  category: "owner",
  ownerOnly: true,
  options: [
    { name: "target",  description: "User to impersonate", type: ApplicationCommandOptionType.User,   required: true },
    { name: "message", description: "Message to send",     type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== config.ownerId) {
      return ctx.reply({ embeds: [errorEmbed("Not your toy.")], ephemeral: true } as any);
    }

    const target = await ctx.getUser("target");
    const text   = ctx.getString("message") ?? ctx.args.slice(1).join(" ");

    if (!target) return ctx.reply({ embeds: [errorEmbed("Couldn't resolve that **user**.")] });
    if (!text)   return ctx.reply({ embeds: [errorEmbed("Provide a message to send.")] });
    if (!ctx.channel || !ctx.guild) return ctx.reply({ embeds: [errorEmbed("Must be used in a server **channel**.")] });

    if (!ctx.guild.members.me?.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
      return ctx.reply({ embeds: [errorEmbed("I need **Manage Webhooks** **permission**.")] });
    }

    const member      = ctx.guild.members.cache.get(target.id);
    const displayName = member?.displayName ?? target.username;
    const avatarUrl   = member?.displayAvatarURL({ size: 256, extension: "png" })
                        ?? target.displayAvatarURL({ size: 256, extension: "png" });

    if (ctx.source === "prefix" && "delete" in ctx.raw) {
      (ctx.raw as any).delete().catch(() => {});
    } else if (ctx.source === "slash") {
      await ctx.defer(true);
    }

    let webhook: any = null;
    try {
      webhook = await (ctx.channel as any).createWebhook({ name: displayName, avatar: avatarUrl, reason: "masquerade" });
      await webhook.send({ content: text });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Failed — check my **permissions**.")] });
    } finally {
      if (webhook) webhook.delete().catch(() => {});
    }

    if (ctx.source === "slash") {
      return ctx.reply({ content: "👻 sent.", ephemeral: true } as any);
    }
  },
};
