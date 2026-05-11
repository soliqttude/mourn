import { ApplicationCommandOptionType } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed, successEmbed } from "../../lib/embeds.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "simulate",
  description: "(Owner) Simulate a Discord event (join/leave) for testing.",
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  aliases: ["sim"],
  options: [
    { name: "event", description: "join | leave | boost", type: ApplicationCommandOptionType.String, required: true },
    { name: "user", description: "Target user", type: ApplicationCommandOptionType.User, required: false },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild) return;

    const evt = (ctx.getString("event") ?? ctx.args[0] ?? "").toLowerCase();
    const target = await ctx.getUser("user");
    const userId = (target as any)?.id ?? ctx.args[1]?.replace(/[<@!>]/g, "") ?? ctx.user.id;
    const member = await ctx.guild.members.fetch(userId).catch(() => null);
    if (!member) return ctx.reply({ embeds: [errorEmbed("Could not find that member in this server.")] });

    if (evt === "join") {
      ctx.client.emit("guildMemberAdd", member);
      return ctx.reply({ embeds: [successEmbed(`Simulated **join** event for ${member.user.tag}.`)] });
    }
    if (evt === "leave") {
      ctx.client.emit("guildMemberRemove", member);
      return ctx.reply({ embeds: [successEmbed(`Simulated **leave** event for ${member.user.tag}.`)] });
    }
    if (evt === "boost") {
      ctx.client.emit("guildMemberUpdate", member, { ...member, premiumSince: new Date() } as any);
      return ctx.reply({ embeds: [successEmbed(`Simulated **boost** event for ${member.user.tag}.`)] });
    }
    return ctx.reply({ embeds: [errorEmbed("Valid events: `join`, `leave`, `boost`.")] });
  },
};
