import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { reactionTriggers } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { invalidateReactionTriggerCache } from "../../features/reactionTriggers.js";

export const command: HybridCommand = {
  name: "reactiontrigger",
  aliases: ["rtrigger", "reacttrigger"],
  description: "Manage auto-reaction triggers — bot reacts with an emoji when a trigger word is detected.",
  category: "settings",
  permission: "manage_messages",
  guildOnly: true,
  usage: "reactiontrigger (add|remove|list) [trigger] [emoji]",
  examples: [
    "reactiontrigger add hello 👋",
    "reactiontrigger add gg 🎉",
    "reactiontrigger remove hello",
    "reactiontrigger list",
  ],
  options: [
    {
      name: "action",
      description: "add, remove, or list",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "add", value: "add" },
        { name: "remove", value: "remove" },
        { name: "list", value: "list" },
      ],
    },
    { name: "trigger", description: "Word or phrase to trigger on", type: ApplicationCommandOptionType.String, required: false },
    { name: "emoji", description: "Emoji to react with", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const action = ctx.getString("action");

    if (action === "list") {
      const rows = await db.select().from(reactionTriggers).where(eq(reactionTriggers.guildId, guild.id));
      if (!rows.length)
        return ctx.reply({ embeds: [errorEmbed("No reaction **triggers** configured.")] });

      const lines = rows.map((r) => `\`${r.trigger}\` → ${r.emoji}`).join("\n");
      return ctx.reply({
        embeds: [brandEmbed({ description: `**reaction triggers (${rows.length})**\n\n${lines}`, page: "settings" })],
      });
    }

    const trigger = ctx.getString("trigger");
    if (!trigger) return ctx.reply({ embeds: [errorEmbed("Please provide a **trigger** **word**.")] });

    if (action === "remove") {
      const result = await db.delete(reactionTriggers)
        .where(and(eq(reactionTriggers.guildId, guild.id), eq(reactionTriggers.trigger, trigger.toLowerCase())));
      invalidateReactionTriggerCache(guild.id);
      return ctx.reply({ embeds: [successEmbed(`removed trigger \`${trigger.toLowerCase()}\`.`, "settings")] });
    }

    if (action === "add") {
      const emoji = ctx.getString("emoji");
      if (!emoji) return ctx.reply({ embeds: [errorEmbed("Please provide an **emoji**.")] });

      const existing = await db.select().from(reactionTriggers)
        .where(and(eq(reactionTriggers.guildId, guild.id), eq(reactionTriggers.trigger, trigger.toLowerCase())));
      if (existing.length)
        return ctx.reply({ embeds: [errorEmbed(`trigger \`${trigger.toLowerCase()}\` already exists.`)] });

      const rows = await db.select().from(reactionTriggers).where(eq(reactionTriggers.guildId, guild.id));
      if (rows.length >= 25)
        return ctx.reply({ embeds: [errorEmbed("Maximum of 25 reaction **triggers** reached.")] });

      await db.insert(reactionTriggers).values({
        guildId: guild.id,
        trigger: trigger.toLowerCase(),
        emoji,
      });
      invalidateReactionTriggerCache(guild.id);
      return ctx.reply({ embeds: [successEmbed(`added trigger \`${trigger.toLowerCase()}\` → ${emoji}`, "settings")] });
    }

    return ctx.reply({ embeds: [errorEmbed("Invalid action.")] });
  },
};
