import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands, disabledModules } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "copydisabled",
  description: "Copy disabled commands and modules from one channel to another.",
  usage: "copydisabled <source channel> <target channel>",
  examples: ["copydisabled #general #chat"],
  category: "settings",
  permission: "admin",
  guildOnly: true,
  options: [
    { name: "source", description: "Source channel", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "target", description: "Target channel", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const src = ctx.getChannel("source") as any ?? ctx.guild.channels.cache.get(ctx.args[0]?.replace(/[<#>]/g, "") ?? "");
    const tgt = ctx.getChannel("target") as any ?? ctx.guild.channels.cache.get(ctx.args[1]?.replace(/[<#>]/g, "") ?? "");
    if (!src || !tgt) return ctx.reply({ embeds: [errorEmbed("please provide two valid channels.")] });

    const [cmds, mods] = await Promise.all([
      db.select().from(disabledCommands).where(and(eq(disabledCommands.guildId, ctx.guild.id), eq(disabledCommands.targetId, src.id))),
      db.select().from(disabledModules).where(and(eq(disabledModules.guildId, ctx.guild.id), eq(disabledModules.channelId, src.id))),
    ]);

    if (!cmds.length && !mods.length) return ctx.reply({ embeds: [errorEmbed(`no disabled commands or modules in <#${src.id}>.`)] });

    for (const c of cmds) {
      await db.insert(disabledCommands).values({ guildId: ctx.guild.id, targetId: tgt.id, targetType: "channel", command: c.command }).onConflictDoNothing();
    }
    for (const m of mods) {
      await db.insert(disabledModules).values({ guildId: ctx.guild.id, channelId: tgt.id, module: m.module }).onConflictDoNothing();
    }

    return ctx.reply({ embeds: [successEmbed(`copied ${cmds.length} disabled command${cmds.length === 1 ? "" : "s"} and ${mods.length} module${mods.length === 1 ? "" : "s"} from <#${src.id}> to <#${tgt.id}>.`)] });
  },
};
