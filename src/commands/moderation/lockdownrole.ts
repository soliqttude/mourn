import { ApplicationCommandOptionType, ChannelType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { config } from "../../config.js";

export const command: HybridCommand = {
  name: "lockdownrole",
  description: "Prevent a role from sending messages across text channels.",
  category: "moderation",
  guildOnly: true,
  userPermissions: ["ManageGuild"],
  options: [
    { name: "role", description: "Role to restrict", type: ApplicationCommandOptionType.Role, required: true },
    { name: "reason", description: "Reason for the lockdown", type: ApplicationCommandOptionType.String, required: false },
  ],
  async execute(ctx) {
    if (!ctx.guild) return;
    const role = ctx.getRole("role");
    if (!role) return ctx.reply({ content: "Specify a valid role.", ephemeral: true });
    if (role.id === ctx.guild.id || role.managed) {
      return ctx.reply({ content: "That role cannot be locked down.", ephemeral: true });
    }
    if (!ctx.guild.members.me?.permissions.has("ManageChannels")) {
      return ctx.reply({ content: "I need Manage Channels to apply this lockdown.", ephemeral: true });
    }

    const reason = ctx.getString("reason") ?? "No reason provided";
    const targets = ctx.guild.channels.cache.filter((channel) =>
      [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia].includes(channel.type)
      && "permissionOverwrites" in channel
    );
    let updated = 0;
    let failed = 0;
    for (const channel of targets.values()) {
      try {
        await (channel as any).permissionOverwrites.edit(role, { SendMessages: false, SendMessagesInThreads: false }, {
          reason: `Role lockdown by ${ctx.user.tag}: ${reason}`,
        });
        updated++;
      } catch {
        failed++;
      }
    }
    return ctx.reply({
      embeds: [new EmbedBuilder()
        .setColor(failed ? 0xe0a33a : 0x2ecc71)
        .setTitle("Role lockdown applied")
        .setDescription(`Restricted <@&${role.id}> across ${updated} text channels.${failed ? `\nFailed in ${failed} channels.` : ""}\n**Reason:** ${reason}`)
        .setFooter({ text: config.embedFooter })
        .setTimestamp()],
      allowedMentions: { parse: [] },
    });
  },
};
