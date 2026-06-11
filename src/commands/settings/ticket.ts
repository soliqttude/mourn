import { ApplicationCommandOptionType, type TextChannel } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import {
  getTicketByChannel,
  ticketAdd,
  ticketRemove,
  ticketRename,
  closeTicketCmd,
  reopenTicketCmd,
  deleteTicketCmd,
} from "../../features/tickets.js";

export const command: HybridCommand = {
  name: "ticket",
  description: "manage the current ticket channel",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "ticket <add|remove|rename|close|reopen|delete> [args]",
  examples: [
    "ticket add @user",
    "ticket remove @user",
    "ticket rename billing-issue",
    "ticket close",
    "ticket reopen",
    "ticket delete",
  ],
  options: [
    {
      name: "add",
      description: "add a user to this ticket",
      type: ApplicationCommandOptionType.Subcommand,
      options: [{ name: "user", description: "the user to add", type: ApplicationCommandOptionType.User, required: true }],
    },
    {
      name: "remove",
      description: "remove a user from this ticket",
      type: ApplicationCommandOptionType.Subcommand,
      options: [{ name: "user", description: "the user to remove", type: ApplicationCommandOptionType.User, required: true }],
    },
    {
      name: "rename",
      description: "rename this ticket channel",
      type: ApplicationCommandOptionType.Subcommand,
      options: [{ name: "name", description: "new channel name", type: ApplicationCommandOptionType.String, required: true }],
    },
    {
      name: "close",
      description: "close this ticket (can be reopened)",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "reopen",
      description: "reopen a closed ticket",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "delete",
      description: "delete this ticket permanently (sends transcript first)",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel) return;

    const ch = ctx.channel as TextChannel;
    const ticket = await getTicketByChannel(ch.id);
    if (!ticket) {
      return ctx.reply({ embeds: [errorEmbed("This **channel** is not a **ticket**.")] });
    }

    const getSlashSub = (): string => {
      if (ctx.source !== "slash") return "";
      const raw = ctx.raw as any;
      return raw.options?.getSubcommand?.(false) ?? "";
    };

    const sub = ctx.source === "prefix" ? ctx.args[0]?.toLowerCase() : getSlashSub();

    // ── add ───────────────────────────────────────────────────────────────────
    if (sub === "add") {
      const user = await ctx.getUser("user");
      if (!user) return ctx.reply({ embeds: [errorEmbed("Please mention a valid **user**.")] });
      await ticketAdd(ch, user.id);
      return ctx.reply({ embeds: [successEmbed(`added <@${user.id}> to this ticket.`)] });
    }

    // ── remove ────────────────────────────────────────────────────────────────
    if (sub === "remove") {
      const user = await ctx.getUser("user");
      if (!user) return ctx.reply({ embeds: [errorEmbed("Please mention a valid **user**.")] });
      if (user.id === ticket.openerId) {
        return ctx.reply({ embeds: [errorEmbed("You cannot remove the **ticket** opener.")] });
      }
      await ticketRemove(ch, user.id);
      return ctx.reply({ embeds: [successEmbed(`removed <@${user.id}> from this ticket.`)] });
    }

    // ── rename ────────────────────────────────────────────────────────────────
    if (sub === "rename") {
      const name = ctx.getString("name") ?? ctx.args[1];
      if (!name) return ctx.reply({ embeds: [errorEmbed("Please provide a name.")] });
      await ticketRename(ch, name);
      return ctx.reply({ embeds: [successEmbed(`ticket renamed to **${name.toLowerCase().replace(/\s+/g, "-")}**.`)] });
    }

    // ── close ─────────────────────────────────────────────────────────────────
    if (sub === "close") {
      if (ticket.status === "closed") return ctx.reply({ embeds: [errorEmbed("**Ticket** is already closed.")] });
      await ctx.reply({ embeds: [successEmbed("Closing **ticket**...")] });
      await closeTicketCmd(ch, ctx.user.id, ctx.guild);
      return;
    }

    // ── reopen ────────────────────────────────────────────────────────────────
    if (sub === "reopen") {
      if (ticket.status === "open") return ctx.reply({ embeds: [errorEmbed("**Ticket** is already open.")] });
      await ctx.reply({ embeds: [successEmbed("Reopening **ticket**...")] });
      await reopenTicketCmd(ch, ctx.user.id, ctx.guild);
      return;
    }

    // ── delete ────────────────────────────────────────────────────────────────
    if (sub === "delete") {
      await ctx.reply({ embeds: [successEmbed("Generating transcript and deleting **ticket**...")] });
      await deleteTicketCmd(ch, ctx.user.id, ctx.guild);
      return;
    }

    return ctx.reply({
      embeds: [errorEmbed("Usage: `ticket <add|remove|rename|close|reopen|delete>`")],
    });
  },
};
