import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";
const OID = "177803210738630656";

export const command: HybridCommand = {
  name: "puppet",
  description: "(Owner) Send a message as another user via webhook.",
  usage: "puppet [user] [message]",
  examples: ["puppet"],
  category: "owner",
  ownerOnly: true,
  guildOnly: true,
  options: [
    { name: "user", description: "User to impersonate", type: ApplicationCommandOptionType.User, required: true },
    { name: "message", description: "Message to send", type: ApplicationCommandOptionType.String, required: true },
  ],
  async execute(ctx) {
    if (ctx.user.id !== OID) return ctx.reply({ content: "nope." });
    if (!ctx.guild || !ctx.channel) return;

    const target = await ctx.getUser("user");
    const msg = ctx.getString("message") ?? ctx.args.slice(1).join(" ");
    if (!target || !msg) return ctx.reply({ embeds: [errorEmbed("Provide a user and message.")] });

    const member = await ctx.guild.members.fetch(target.id).catch(() => null);
    const displayName = member?.displayName ?? target.username;
    const avatar = member?.displayAvatarURL() ?? target.displayAvatarURL();

    try {
      const webhooks = await (ctx.channel as any).fetchWebhooks();
      let wh = webhooks.find((w: any) => w.name === "Bleed Puppet");
      if (!wh) wh = await (ctx.channel as any).createWebhook({ name: "Bleed Puppet" });

      await wh.send({ content: msg, username: displayName, avatarURL: avatar });
      return ctx.reply({ content: "✅ Sent.", ephemeral: true } as any);
    } catch (err) {
      return ctx.reply({ embeds: [errorEmbed(`Failed: ${(err as Error).message}`)] });
    }
  },
};
