import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { guildSettings } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "bindstaff",
  aliases: ["staffbind", "staffrole"],
  description: "Add or remove a staff role. Staff roles are treated as moderators by the bot.",
  category: "moderation",
  permission: "manage_guild",
  guildOnly: true,
  usage: "bindstaff (add|remove|list) [role]",
  examples: ["bindstaff add @Moderator", "bindstaff remove @Helper", "bindstaff list"],
  options: [
    { name: "action", description: "add, remove, or list", type: ApplicationCommandOptionType.String, required: true, choices: [{ name: "add", value: "add" }, { name: "remove", value: "remove" }, { name: "list", value: "list" }] },
    { name: "role", description: "Staff role", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const action = ctx.getString("action");
    const rows = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guild.id));
    const settings = rows[0];
    const staffRoles: string[] = (settings?.staffRoleIds as string[] | null) ?? [];

    if (action === "list") {
      if (!staffRoles.length)
        return ctx.reply({ embeds: [errorEmbed("No staff **roles** are configured.")] });
      const lines = staffRoles.map((id) => `<@&${id}>`).join(", ");
      return ctx.reply({
        embeds: [brandEmbed({ description: `**staff roles:** ${lines}`, page: "moderation" })],
      });
    }

    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ embeds: [errorEmbed("Please specify a **role**.")] });

    if (action === "add") {
      if (staffRoles.includes(role.id))
        return ctx.reply({ embeds: [errorEmbed(`<@&${role.id}> is already a staff role.`)] });
      staffRoles.push(role.id);
    } else if (action === "remove") {
      const idx = staffRoles.indexOf(role.id);
      if (idx === -1)
        return ctx.reply({ embeds: [errorEmbed(`<@&${role.id}> is not a staff role.`)] });
      staffRoles.splice(idx, 1);
    } else {
      return ctx.reply({ embeds: [errorEmbed("Invalid action.")] });
    }

    await db.insert(guildSettings).values({ guildId: guild.id, staffRoleIds: staffRoles })
      .onConflictDoUpdate({ target: guildSettings.guildId, set: { staffRoleIds: staffRoles } });

    return ctx.reply({
      embeds: [successEmbed(`${action === "add" ? "added" : "removed"} <@&${role.id}> ${action === "add" ? "as a" : "from"} staff role${action === "add" ? "" : "s"}.`, "moderation")],
    });
  },
};
