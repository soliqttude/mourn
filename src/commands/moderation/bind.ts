import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { successEmbed, errorEmbed, brandEmbed } from "../../lib/embeds.js";
import { db } from "../../db/index.js";
import { guildSettings } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const command: HybridCommand = {
  name: "bind",
  description: "Bind a role to a bot category. Use ,bind staff @role to toggle.",
  category: "moderation",
  permission: "admin",
  guildOnly: true,
  usage: "bind staff (@role|list)",
  examples: ["bind staff @Moderator", "bind staff list"],
  options: [
    {
      name: "category",
      description: "Category to bind (staff)",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [{ name: "staff", value: "staff" }],
    },
    {
      name: "role",
      description: "Role to toggle, or omit to list",
      type: ApplicationCommandOptionType.Role,
      required: false,
    },
  ],
  async execute(ctx) {
    const guild = ctx.guild;
    if (!guild) return;

    const category = (ctx.getString("category") ?? ctx.args[0] ?? "").toLowerCase();

    if (category !== "staff") {
      return ctx.reply({ embeds: [errorEmbed("invalid category. currently supported: `staff`")] });
    }

    const rows = await db
      .select({ staffRoleIds: guildSettings.staffRoleIds })
      .from(guildSettings)
      .where(eq(guildSettings.guildId, guild.id));
    const staffRoles: string[] = (rows[0]?.staffRoleIds as string[] | null) ?? [];

    // List mode: ,bind staff list  OR  /bind staff (no role)
    const secondArg = (ctx.args[1] ?? "").toLowerCase();
    const role = ctx.getRole("category" in ctx ? "role" : "role");

    if (secondArg === "list" || (!role && !ctx.args[1])) {
      if (!staffRoles.length)
        return ctx.reply({ embeds: [errorEmbed("no **staff roles** are configured.")] });
      return ctx.reply({
        embeds: [
          brandEmbed({
            description: `**staff roles** \u2014 ${staffRoles.map((id) => `<@&${id}>`).join(", ")}`,
          }),
        ],
      });
    }

    const targetRole = ctx.getRole("role") ?? (secondArg && secondArg !== "list" ? guild.roles.cache.find((r) => r.name.toLowerCase() === secondArg || r.id === secondArg.replace(/\D/g, "")) : null);
    if (!targetRole)
      return ctx.reply({ embeds: [errorEmbed("specify a **role** or `list`.")] });

    const isSet = staffRoles.includes(targetRole.id);
    if (isSet) {
      staffRoles.splice(staffRoles.indexOf(targetRole.id), 1);
    } else {
      staffRoles.push(targetRole.id);
    }

    await db
      .insert(guildSettings)
      .values({ guildId: guild.id, staffRoleIds: staffRoles })
      .onConflictDoUpdate({ target: guildSettings.guildId, set: { staffRoleIds: staffRoles } });

    const verb = isSet ? "is no longer a" : "is now set as a";
    return ctx.reply({
      embeds: [successEmbed(`${ctx.user.username}: <@&${targetRole.id}> ${verb} **staff role**`)],
    });
  },
};
