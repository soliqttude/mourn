import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { Message } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { config } from "../../config.js";
import {
  addButtonRole,
  getMessageButtonRoles,
  listButtonRoles,
  removeAllButtonRoles,
  removeButtonRole,
  resetButtonRoles,
} from "../../features/buttonRoleBindings.js";

const STYLES: Record<string, ButtonStyle> = {
  green: ButtonStyle.Success,
  blurple: ButtonStyle.Primary,
  gray: ButtonStyle.Secondary,
  red: ButtonStyle.Danger,
};

function parseMessageLink(input: string) {
  const m = input.match(/\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!m) return null;
  return { guildId: m[1]!, channelId: m[2]!, messageId: m[3]! };
}

async function renderButtons(message: Message) {
  const bindings = await getMessageButtonRoles(message.id);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < bindings.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const binding of bindings.slice(i, i + 5)) {
      const button = new ButtonBuilder()
        .setCustomId("buttonrole:" + binding.id)
        .setStyle(STYLES[binding.style] ?? ButtonStyle.Secondary)
        .setLabel(binding.label.slice(0, 80));
      if (binding.emoji) button.setEmoji(binding.emoji);
      row.addComponents(button);
    }
    rows.push(row);
  }
  await message.edit({ components: rows as any[] });
}

export const command: HybridCommand = {
  name: "buttonrole",
  aliases: ["br"],
  description: "Set up self-assignable roles with buttons.",
  usage: "buttonrole add <message link> <role> <style> <emoji> <label>",
  examples: ["buttonrole add <message link> @Member green 👤 Member", "buttonrole list"],
  category: "settings",
  permission: "manage_roles",
  guildOnly: true,
  options: [
    { name: "action", description: "add | remove | removeall | list | reset", type: ApplicationCommandOptionType.String, required: true },
    { name: "message", description: "Message link", type: ApplicationCommandOptionType.String, required: false },
    { name: "role", description: "Role for add", type: ApplicationCommandOptionType.Role, required: false },
    { name: "style", description: "green | blurple | gray | red", type: ApplicationCommandOptionType.String, required: false },
    { name: "emoji", description: "Button emoji", type: ApplicationCommandOptionType.String, required: false },
    { name: "label", description: "Button label", type: ApplicationCommandOptionType.String, required: false },
    { name: "index", description: "Button number (1-based)", type: ApplicationCommandOptionType.Integer, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    if (!config.databaseEnabled) {
      return ctx.reply({ embeds: [errorEmbed("buttonrole requires the database to be enabled. Add DATABASE_URL to Render.")] });
    }

    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    if (action === "list") {
      const rows = await listButtonRoles(ctx.guild.id);
      if (!rows.length) return ctx.reply({ embeds: [errorEmbed("No button roles are configured.")] });
      const lines = rows.map((r, i) =>
        "**#" + (i + 1) + "** <@&" + r.roleId + "> — " + r.style + " " + (r.emoji ?? "") +
        " — [message](https://discord.com/channels/" + ctx.guild!.id + "/" + r.channelId + "/" + r.messageId + ")"
      );
      return ctx.reply({ embeds: [brandEmbed({ title: "Button Roles", description: lines.join("\n") })] });
    }

    if (action === "reset") {
      const count = await resetButtonRoles(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed("Reset " + count + " button role bindings.")] });
    }

    const link = ctx.getString("message") ?? ctx.args[1] ?? "";
    const parsed = parseMessageLink(link);
    if (!parsed || parsed.guildId !== ctx.guild.id) {
      return ctx.reply({ embeds: [errorEmbed("Provide a valid message link from this server.")] });
    }

    const channel = ctx.guild.channels.cache.get(parsed.channelId);
    if (!channel?.isTextBased() || !("messages" in channel)) {
      return ctx.reply({ embeds: [errorEmbed("The message channel could not be accessed.")] });
    }
    const message = await channel.messages.fetch(parsed.messageId).catch(() => null);
    if (!message) return ctx.reply({ embeds: [errorEmbed("Message not found.")] });

    if (action === "add") {
      if (message.author.id !== ctx.client.user?.id) {
        return ctx.reply({ embeds: [errorEmbed("Button roles can only be placed on messages sent by Mourn.")] });
      }
      const role = ctx.getRole("role");
      const style = (ctx.getString("style") ?? ctx.args[3] ?? "gray").toLowerCase();
      const emoji = ctx.getString("emoji") ?? ctx.args[4] ?? null;
      const label = ctx.getString("label") ?? ctx.args.slice(5).join(" ");
      if (!role || !label) return ctx.reply({ embeds: [errorEmbed("Provide role, style, emoji, and label.")] });
      if (!STYLES[style]) return ctx.reply({ embeds: [errorEmbed("Style must be green, blurple, gray, or red.")] });
      if (role.managed) return ctx.reply({ embeds: [errorEmbed("That role is managed and cannot be assigned.")] });
      const existing = await getMessageButtonRoles(message.id);
      if (existing.length >= 25) return ctx.reply({ embeds: [errorEmbed("A message can have at most 25 button roles.")] });

      await addButtonRole({
        guildId: ctx.guild.id,
        channelId: parsed.channelId,
        messageId: parsed.messageId,
        roleId: role.id,
        style,
        emoji,
        label,
      });
      await renderButtons(message);
      return ctx.reply({ embeds: [successEmbed("Added button #" + (existing.length + 1) + " for <@&" + role.id + ">.")] });
    }

    if (action === "remove") {
      const raw = (ctx.getNumber("index") != null ? String(ctx.getNumber("index")) : (ctx.args[2] ?? "0"));
      const index = Number.parseInt(raw, 10) - 1;
      if (!Number.isFinite(index) || index < 0) return ctx.reply({ embeds: [errorEmbed("Provide a valid button number.")] });
      const ok = await removeButtonRole(message.id, index);
      if (!ok) return ctx.reply({ embeds: [errorEmbed("That button role was not found.")] });
      await renderButtons(message);
      return ctx.reply({ embeds: [successEmbed("Removed button #" + (index + 1) + ".")] });
    }

    if (action === "removeall") {
      const count = await removeAllButtonRoles(message.id);
      await renderButtons(message);
      return ctx.reply({ embeds: [successEmbed("Removed " + count + " button roles from the message.")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown action. Use add, remove, removeall, list, or reset.")] });
  },
};
