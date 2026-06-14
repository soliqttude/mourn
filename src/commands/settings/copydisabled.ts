import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { disabledCommands, disabledModules } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "copydisabled",
  aliases: ["copyrestrictions"],
  description: "Copy all disabled command and module restrictions from one channel to another.",
  usage: "copydisabled <#source> <#target>",
  examples: ["copydisabled #general #bot-commands"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "source", description: "Source channel to copy restrictions from", type: ApplicationCommandOptionType.Channel, required: true },
    { name: "target", description: "Target channel to apply restrictions to", type: ApplicationCommandOptionType.Channel, required: true },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const sourceArg = ctx.getString("source") ?? ctx.args[0] ?? "";
    const targetArg = ctx.getString("target") ?? ctx.args[1] ?? "";
    const sourceId = (ctx.getChannel("source")?.id ?? ctx.guild.channels.cache.get(sourceArg.replace(/[<#>]/g, ""))?.id ?? sourceArg.replace(/[<#>]/g, ""));
    const targetId = (ctx.getChannel("target")?.id ?? ctx.guild.channels.cache.get(targetArg.replace(/[<#>]/g, ""))?.id ?? targetArg.replace(/[<#>]/g, ""));

    if (!sourceId || !targetId) return ctx.reply({ embeds: [errorEmbed("Provide two valid **channels**.")] });
    if (sourceId === targetId) return ctx.reply({ embeds: [errorEmbed("Source and target cannot be the same **channel**.")] });

    // Get source disabled commands (channel-targeted only)
    const disabledCmds = await db.select().from(disabledCommands).where(eq(disabledCommands.guildId, ctx.guild.id));
    const sourceCmds = disabledCmds.filter(r => r.targetId === sourceId && r.targetType === "channel");

    // Get source disabled modules
    const disabledMods = await db.select().from(disabledModules).where(eq(disabledModules.guildId, ctx.guild.id));
    const sourceMods = disabledMods.filter(r => r.channelId === sourceId);

    if (!sourceCmds.length && !sourceMods.length) {
      return ctx.reply({ embeds: [errorEmbed(`<#${sourceId}> has no restrictions to copy.`)] });
    }

    let copied = 0;
    for (const row of sourceCmds) {
      await db.insert(disabledCommands).values({ guildId: ctx.guild.id, command: row.command, targetId, targetType: "channel" }).onConflictDoNothing();
      copied++;
    }
    for (const row of sourceMods) {
      await db.insert(disabledModules).values({ guildId: ctx.guild.id, channelId: targetId, module: row.module }).onConflictDoNothing();
      copied++;
    }

    return ctx.reply({ embeds: [successEmbed(`copied **${copied}** restriction${copied !== 1 ? "s" : ""} from <#${sourceId}> to <#${targetId}>.`)] });
  },
};
