import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed } from "../../lib/embeds.js";
import {
  createCategory,
  deleteCategory,
  addRoleToCategory,
  removeRoleFromCategory,
  getCategories,
} from "../../features/buttonRoles.js";

export const command: HybridCommand = {
  name: "rcategory",
  aliases: ["rcat"],
  description: "Manage role panel categories. Usage: create | add | remove | delete | list",
  usage: "rcategory [action] [name] [role]",
  examples: ["rcategory"],
  category: "settings",
  permission: "manage_guild",
  guildOnly: true,
  options: [
    { name: "action", description: "create | add | remove | delete | list", type: ApplicationCommandOptionType.String, required: true },
    { name: "name", description: "Category name", type: ApplicationCommandOptionType.String, required: false },
    { name: "role", description: "Role to add/remove", type: ApplicationCommandOptionType.Role, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const action = ctx.getString("action", true)?.toLowerCase();
    const name = ctx.getString("name")?.toLowerCase();
    const role = ctx.getRole("role");

    if (action === "list") {
      const cats = await getCategories(ctx.guild.id);
      if (!cats.length) return ctx.reply({ embeds: [errorEmbed("No **categories** yet. Use `,rcategory create <name>` to start.")] });
      const lines = cats.map(c =>
        `**${c.name}** — ${c.roles.length ? c.roles.map(r => `<@&${r}>`).join(", ") : "no roles yet"}`
      );
      return ctx.reply({ embeds: [successEmbed(lines.join("\n"))] });
    }

    if (!name) return ctx.reply({ embeds: [errorEmbed("Provide a **category** name.")] });

    if (action === "create") {
      await createCategory(ctx.guild.id, name);
      return ctx.reply({ embeds: [successEmbed(`Category **${name}** created.`)] });
    }

    if (action === "delete") {
      const ok = await deleteCategory(ctx.guild.id, name);
      return ctx.reply({ embeds: [ok ? successEmbed(`Category **${name}** deleted.`) : errorEmbed(`Category **${name}** not found.`)] });
    }

    if (action === "add" || action === "remove") {
      if (!role) return ctx.reply({ embeds: [errorEmbed("Provide a **role**.")] });
      if (action === "add") {
        const ok = await addRoleToCategory(ctx.guild.id, name, role.id);
        return ctx.reply({ embeds: [ok ? successEmbed(`Added <@&${role.id}> to **${name}**.`) : errorEmbed(`Category **${name}** not found.`)] });
      } else {
        const ok = await removeRoleFromCategory(ctx.guild.id, name, role.id);
        return ctx.reply({ embeds: [ok ? successEmbed(`Removed <@&${role.id}> from **${name}**.`) : errorEmbed(`Category **${name}** not found.`)] });
      }
    }

    return ctx.reply({ embeds: [errorEmbed("Unknown action. Use: `create`, `add`, `remove`, `delete`, `list`")] });
  },
};
