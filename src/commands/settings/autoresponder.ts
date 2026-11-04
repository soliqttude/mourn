import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { autoresponders } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import {
  addAutoresponder, listAutoresponders, removeAutoresponderByTrigger, resetAutoresponders,
} from "../../features/autoresponders.js";
import { parseScript } from "../../lib/scripting.js";

function cleanId(value: string) { return value.replace(/[<#@&!>]/g, ""); }

export const command: HybridCommand = {
  name: "autoresponder",
  aliases: ["ar"],
  description: "Create and manage automatic message replies.",
  category: "settings",
  permission: "manage_channels",
  guildOnly: true,
  usage: "autoresponder <add|update|remove|list|role|exclusive|variables|reset>",
  examples: ["autoresponder add welc Hello {user.mention}", "autoresponder list", "autoresponder role add welc @Verified"],
  options: [
    { name: "subcommand", description: "Autoresponder action", type: ApplicationCommandOptionType.String, required: true },
    { name: "trigger", description: "Trigger text", type: ApplicationCommandOptionType.String, required: false },
    { name: "response", description: "Reply content or embed scripting", type: ApplicationCommandOptionType.String, required: false },
    { name: "reply", description: "Reply to the trigger message", type: ApplicationCommandOptionType.Boolean, required: false },
    { name: "delete", description: "Delete the trigger message", type: ApplicationCommandOptionType.Boolean, required: false },
    { name: "ignore_command_check", description: "Allow matching command messages", type: ApplicationCommandOptionType.Boolean, required: false },
    { name: "strict", description: "Require an exact trigger match", type: ApplicationCommandOptionType.Boolean, required: false },
    { name: "self_destruct", description: "Delete response after 6-60 seconds", type: ApplicationCommandOptionType.Integer, required: false },
    { name: "role", description: "Role to add/remove or restrict to", type: ApplicationCommandOptionType.Role, required: false },
    { name: "channel", description: "Channel to restrict to", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "setting", description: "on or off", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const args = ctx.args;
    const sub = (ctx.getString("subcommand") ?? args[0] ?? "").toLowerCase();
    const trigger = (ctx.getString("trigger") ?? args[1] ?? "").trim().toLowerCase();
    const response = ctx.getString("response") ?? (ctx.source === "prefix" ? args.slice(2).join(" ") : "");
    const rows = await listAutoresponders(ctx.guild.id);
    const find = () => rows.find(row => row.trigger === trigger);

    if (sub === "variables") {
      return ctx.reply({ embeds: [brandEmbed({ title: "Autoresponder Variables", description: [
        "`{user}`, `{user.mention}`, `{user.name}`, `{user.id}`, `{user.avatar}`",
        "`{guild.name}`, `{guild.member_count}`, `{guild.icon}`, `{guild.owner}`",
        "`{time}`, `{date}`, `{timestamp}`, `{timestamp.relative}`",
        "Embed syntax: `{embed}$v{title: Hello}$v{description: text}$v{color: #000000}`",
      ].join("\n") })] });
    }

    if (sub === "list") {
      const ticketOnly = (args[1] ?? "").toLowerCase() === "tickets";
      const selected = ticketOnly ? rows.filter(row => Boolean((row as any).ticketForm)) : rows;
      return ctx.reply({ embeds: [brandEmbed({ title: ticketOnly ? "Ticket Autoresponders" : "Autoresponders", description: selected.length
        ? selected.map(row => `**${row.trigger}** — ${row.response.slice(0, 90)}`).join("\n")
        : "No autoresponders configured." })] });
    }

    if (sub === "reset") {
      await resetAutoresponders(ctx.guild.id);
      return ctx.reply({ embeds: [successEmbed("All autoresponders have been removed.")] });
    }

    if (sub === "remove") {
      if (!trigger) return ctx.reply({ embeds: [errorEmbed("Provide a trigger to remove.")] });
      const removed = await removeAutoresponderByTrigger(ctx.guild.id, trigger);
      return ctx.reply({ embeds: [removed ? successEmbed(`Autoresponder \`${trigger}\` removed.`) : errorEmbed("No autoresponder found for that trigger.")] });
    }

    if (sub === "add" || sub === "update") {
      if (!trigger) return ctx.reply({ embeds: [errorEmbed("Provide a trigger.")] });
      if (!response) return ctx.reply({ embeds: [errorEmbed("Provide response content. Use embed scripting in the response field.")] });
      const reply = ctx.getBoolean("reply") ?? false;
      const deleteTrigger = ctx.getBoolean("delete") ?? false;
      const ignoreCommandCheck = ctx.getBoolean("ignore_command_check") ?? false;
      const strict = ctx.getBoolean("strict") ?? false;
      const selfDestructSeconds = ctx.getNumber("self_destruct");
      if (selfDestructSeconds !== null && (selfDestructSeconds < 6 || selfDestructSeconds > 60))
        return ctx.reply({ embeds: [errorEmbed("self_destruct must be between 6 and 60 seconds.")] });
      if (sub === "add") {
        if (find()) return ctx.reply({ embeds: [errorEmbed("An autoresponder already exists for that trigger. Use update.")] });
        await addAutoresponder(ctx.guild.id, trigger, response, strict ? "exact" : "contains", ctx.user.id, {
          notStrict: !strict, selfDestructSeconds, deleteTrigger, reply, ignoreCommandCheck,
        });
      } else {
        const existing = find();
        if (!existing) return ctx.reply({ embeds: [errorEmbed("No autoresponder found for that trigger.")] });
        await db.update(autoresponders).set({
          response, matchType: strict ? "exact" : "contains", notStrict: !strict,
          selfDestructSeconds, deleteTrigger, reply, ignoreCommandCheck,
        }).where(and(eq(autoresponders.guildId, ctx.guild.id), eq(autoresponders.id, existing.id)));
      }
      const preview = parseScript(response, { user: ctx.member ?? ctx.user, guild: ctx.guild, channel: ctx.channel as any, client: ctx.client });
      return ctx.reply({ content: preview.content ?? undefined, embeds: [successEmbed(`Autoresponder ${sub === "add" ? "created" : "updated"} for \`${trigger}\`.`), ...preview.embeds], components: preview.components });
    }

    if (sub === "role" || sub === "exclusive") {
      const action = (args[1] ?? "").toLowerCase();
      const mode = (args[2] ?? "").toLowerCase();
      const selectedTrigger = (ctx.getString("trigger") ?? args[3] ?? "").trim().toLowerCase();
      const row = rows.find(item => item.trigger === selectedTrigger);
      if (action === "list") {
        if (!selectedTrigger || !row) return ctx.reply({ embeds: [errorEmbed("Provide an existing trigger.")] });
        const description = sub === "role"
          ? `Add role: ${row.rewardRoleAdd ? `<@&${row.rewardRoleAdd}>` : "none"}\nRemove role: ${row.rewardRoleRemove ? `<@&${row.rewardRoleRemove}>` : "none"}`
          : `Role: ${row.exclusiveRoleId ? `<@&${row.exclusiveRoleId}>` : "none"}\nChannel: ${row.exclusiveChannelId ? `<#${row.exclusiveChannelId}>` : "none"}`;
        return ctx.reply({ embeds: [brandEmbed({ title: `${sub} settings — ${selectedTrigger}`, description })] });
      }
      if (!row) return ctx.reply({ embeds: [errorEmbed("Provide an existing trigger using the trigger option.")] });
      const role = ctx.getRole("role");
      const channel = ctx.getChannel("channel");
      if (sub === "role") {
        if (!role || !["add", "remove"].includes(action)) return ctx.reply({ embeds: [errorEmbed("Use role add/remove with a role and trigger.")] });
        const column = action === "add" ? autoresponders.rewardRoleAdd : autoresponders.rewardRoleRemove;
        const current = action === "add" ? row.rewardRoleAdd : row.rewardRoleRemove;
        const next = current === role.id ? null : role.id;
        await db.update(autoresponders).set(action === "add" ? { rewardRoleAdd: next } : { rewardRoleRemove: next }).where(eq(autoresponders.id, row.id));
        return ctx.reply({ embeds: [successEmbed(next ? `Role <@&${role.id}> assigned for ${selectedTrigger}.` : `Role <@&${role.id}> unassigned for ${selectedTrigger}.`)] });
      }
      if (role) {
        const next = row.exclusiveRoleId === role.id ? null : role.id;
        await db.update(autoresponders).set({ exclusiveRoleId: next }).where(eq(autoresponders.id, row.id));
        return ctx.reply({ embeds: [successEmbed(next ? `Exclusive role set to <@&${role.id}>.` : "Exclusive role restriction removed.")] });
      }
      if (channel) {
        const next = row.exclusiveChannelId === channel.id ? null : channel.id;
        await db.update(autoresponders).set({ exclusiveChannelId: next }).where(eq(autoresponders.id, row.id));
        return ctx.reply({ embeds: [successEmbed(next ? `Exclusive channel set to <#${channel.id}>.` : "Exclusive channel restriction removed.")] });
      }
      return ctx.reply({ embeds: [errorEmbed("Provide a role or channel and trigger.")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown autoresponder action.")] });
  },
};
