import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { guildSettings } from "../../db/schema.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
export const command: HybridCommand = {
  name: "stripstaff", description: "Remove configured staff roles from a member.", category: "moderation", permission: "administrator", guildOnly: true,
  options: [{ name: "member", description: "Member whose staff roles will be removed", type: ApplicationCommandOptionType.User, required: true }],
  async execute(ctx) {
    if (!ctx.guild) return;
    const target = await ctx.getMember("member", true);
    if (!target) return ctx.reply({ embeds: [errorEmbed("Member not found.")] });
    if (target.id === ctx.guild.ownerId) return ctx.reply({ embeds: [errorEmbed("The server owner cannot be modified.")] });
    const [settings] = await db.select().from(guildSettings).where(eq(guildSettings.guildId, ctx.guild.id));
    const staffRoleIds = settings?.staffRoleIds ?? [];
    if (!staffRoleIds.length) return ctx.reply({ embeds: [errorEmbed("No staff roles are configured. Use bindstaff add first.")] });
    const removable = target.roles.cache.filter(role => staffRoleIds.includes(role.id) && role.editable);
    if (!removable.size) return ctx.reply({ embeds: [errorEmbed("This member has no removable configured staff roles.")] });
    try {
      await target.roles.remove([...removable.keys()], "Staff roles stripped by " + ctx.user.tag);
      return ctx.reply({ embeds: [successEmbed("Removed " + removable.size + " staff role(s) from **" + target.user.tag + "**.")] });
    } catch {
      return ctx.reply({ embeds: [errorEmbed("Could not remove the staff roles. Check the bot role hierarchy.")] });
    }
  },
};