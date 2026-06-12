import type { HybridCommand } from "../../lib/command.js";

export const command: HybridCommand = {
  name: "nuke",
  description: "Clone and delete the current channel, wiping all messages.",
  category: "moderation",
  aliases: ["purgeall","channelreset"],
  guildOnly: true,
  userPermissions: ["ManageChannels"],
  async execute(ctx) {
    if (!ctx.guild || !ctx.channel || ctx.channel.type === 1) return;
    const ch = ctx.channel as any;
    const position = ch.position;
    const clone = await ch.clone({ reason: `Nuked by ${ctx.user.tag}` });
    await clone.setPosition(position);
    await ch.delete();
    await clone.send("first");
  },
};
