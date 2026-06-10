import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { brandEmbed, errorEmbed, successEmbed } from "../../lib/embeds.js";
import {
  addAutoresponder,
  listAutoresponders,
  removeAutoresponder,
  updateAutoresponderExclusive,
  updateAutoresponderRoles,
} from "../../features/autoresponders.js";

export const command: HybridCommand = {
  name: "autoresponder",
  aliases: ["ar"],
  description: "Manage autoresponders.",
  usage: "autoresponder <add|remove|list|exclusive|role> [args]",
  examples: [
    "autoresponder add hello hi there!",
    "autoresponder add exact hello hi there! --exact",
    "autoresponder remove 3",
    "autoresponder list",
    "autoresponder exclusive 3 channel #general",
    "autoresponder exclusive 3 role @Members",
    "autoresponder exclusive 3 clear",
    "autoresponder role 3 add @Verified",
    "autoresponder role 3 remove @Unverified",
  ],
  category: "tags",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "action", description: "add|remove|list|exclusive|role", type: ApplicationCommandOptionType.String, required: true },
    { name: "trigger_or_id", description: "Trigger text (add/exclusive/role) or ID (remove)", type: ApplicationCommandOptionType.String, required: false },
    { name: "response", description: "Response (for add) or subaction (for exclusive/role)", type: ApplicationCommandOptionType.String, required: false },
    { name: "value", description: "Channel, role, or value", type: ApplicationCommandOptionType.String, required: false },
    { name: "channel", description: "Channel for exclusive", type: ApplicationCommandOptionType.Channel, required: false },
    { name: "role", description: "Role for exclusive or reward", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = (ctx.getString("action") ?? ctx.args[0] ?? "").toLowerCase();
    const t = ctx.getString("trigger_or_id") ?? ctx.args[1] ?? "";
    const r = ctx.getString("response") ?? ctx.args[2] ?? "";
    const val = ctx.getString("value") ?? ctx.args[3] ?? "";

    if (action === "list") {
      const list = await listAutoresponders(ctx.guild.id);
      if (!list.length) return ctx.reply({ embeds: [errorEmbed("no autoresponders.")] });
      return ctx.reply({
        embeds: [brandEmbed({
          title: "autoresponders",
          description: list.map(a => {
            const extras: string[] = [];
            if (a.exclusiveChannelId) extras.push(`📌 <#${a.exclusiveChannelId}>`);
            if (a.exclusiveRoleId) extras.push(`🔒 <@&${a.exclusiveRoleId}>`);
            if (a.rewardRoleAdd) extras.push(`✅ +<@&${a.rewardRoleAdd}>`);
            if (a.rewardRoleRemove) extras.push(`❌ -<@&${a.rewardRoleRemove}>`);
            const extrasStr = extras.length ? ` [${extras.join(", ")}]` : "";
            return `**${a.id}** [${a.matchType}] \`${a.trigger}\` → ${a.response.slice(0, 60)}${extrasStr}`;
          }).join("\n"),
        })],
      });
    }

    if (action === "add") {
      if (!t) return ctx.reply({ embeds: [errorEmbed("provide a trigger.")] });
      // Build response from remaining args
      const allArgs = ctx.rawArgs ?? [t, r, val].filter(Boolean).join(" ");
      // strip trigger from rawArgs if using prefix
      const responseText = r || ctx.args.slice(2).join(" ");
      if (!responseText) return ctx.reply({ embeds: [errorEmbed("provide a response.")] });
      // detect match type flags
      let matchType: "contains" | "exact" | "starts" = "contains";
      if (val === "--exact" || responseText.endsWith("--exact")) matchType = "exact";
      else if (val === "--starts" || responseText.endsWith("--starts")) matchType = "starts";
      const cleanResponse = responseText.replace(/--exact$|--starts$/, "").trim();
      await addAutoresponder(ctx.guild.id, t, cleanResponse, matchType, ctx.user.id);
      return ctx.reply({ embeds: [successEmbed(`autoresponder added for \`${t}\` [${matchType}].`)] });
    }

    if (action === "remove") {
      if (!t) return ctx.reply({ embeds: [errorEmbed("provide an ID.")] });
      const id = parseInt(t);
      if (!Number.isFinite(id)) return ctx.reply({ embeds: [errorEmbed("invalid ID.")] });
      const removed = await removeAutoresponder(id);
      if (!removed) return ctx.reply({ embeds: [errorEmbed("not found.")] });
      return ctx.reply({ embeds: [successEmbed(`removed autoresponder #${id}.`)] });
    }

    if (action === "exclusive") {
      // ar exclusive <id> channel|role|clear [mention]
      const id = parseInt(t);
      if (!Number.isFinite(id)) return ctx.reply({ embeds: [errorEmbed("provide an autoresponder ID.")] });
      const sub = r.toLowerCase();

      if (sub === "clear") {
        await updateAutoresponderExclusive(id, null, null);
        return ctx.reply({ embeds: [successEmbed(`cleared exclusive restrictions for #${id}.`)] });
      }

      if (sub === "channel") {
        const ch = ctx.getChannel("channel") ?? ctx.guild.channels.cache.get(val.replace(/[<#>]/g, ""));
        if (!ch) return ctx.reply({ embeds: [errorEmbed("provide a channel.")] });
        await updateAutoresponderExclusive(id, ch.id, null);
        return ctx.reply({ embeds: [successEmbed(`autoresponder #${id} only triggers in <#${ch.id}>.`)] });
      }

      if (sub === "role") {
        const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(val.replace(/[<@&>]/g, ""));
        if (!role) return ctx.reply({ embeds: [errorEmbed("provide a role.")] });
        await updateAutoresponderExclusive(id, null, role.id);
        return ctx.reply({ embeds: [successEmbed(`autoresponder #${id} only triggers for members with <@&${role.id}>.`)] });
      }

      return ctx.reply({ embeds: [errorEmbed("use: `exclusive <id> channel|role|clear [mention]`")] });
    }

    if (action === "role") {
      // ar role <id> add|remove [role]
      const id = parseInt(t);
      if (!Number.isFinite(id)) return ctx.reply({ embeds: [errorEmbed("provide an autoresponder ID.")] });
      const sub = r.toLowerCase();
      const role = ctx.getRole("role") ?? ctx.guild.roles.cache.get(val.replace(/[<@&>]/g, ""));

      if (sub === "clear") {
        await updateAutoresponderRoles(id, null, null);
        return ctx.reply({ embeds: [successEmbed(`cleared role rewards for #${id}.`)] });
      }

      if (!role) return ctx.reply({ embeds: [errorEmbed("provide a role.")] });

      if (sub === "add") {
        await updateAutoresponderRoles(id, role.id, null);
        return ctx.reply({ embeds: [successEmbed(`autoresponder #${id} will add <@&${role.id}> when triggered.`)] });
      }

      if (sub === "remove") {
        await updateAutoresponderRoles(id, null, role.id);
        return ctx.reply({ embeds: [successEmbed(`autoresponder #${id} will remove <@&${role.id}> when triggered.`)] });
      }

      return ctx.reply({ embeds: [errorEmbed("use: `role <id> add|remove|clear [@role]`")] });
    }

    return ctx.reply({ embeds: [errorEmbed("use: `autoresponder add|remove|list|exclusive|role`")] });
  },
};
