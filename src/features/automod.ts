import type { Client, Message, TextChannel } from "discord.js";
import { getGuildSettings } from "../db/settings.js";
import { hasModPerms } from "../lib/permissions.js";

const URL_RE = /https?:\/\/[^\s]+/i;
const INVITE_RE = /(discord\.gg|discord\.com\/invite)\/[a-z0-9-]+/i;

export async function handleAutomod(client: Client, message: Message) {
  if (!message.guild || message.author.bot) return;
  if (message.member && hasModPerms(message.member)) return;
  const settings = await getGuildSettings(message.guild.id);
  if (!settings.automodEnabled) return;
  if (settings.linkFilterEnabled && URL_RE.test(message.content)) {
    await message.delete().catch(() => {});
    await (message.channel as TextChannel)
      .send({
        content: `<@${message.author.id}>, links are not allowed here.`,
      })
      .catch(() => {});
    return;
  }
  if (settings.inviteFilterEnabled && INVITE_RE.test(message.content)) {
    await message.delete().catch(() => {});
    await (message.channel as TextChannel)
      .send({
        content: `<@${message.author.id}>, server invites are not allowed.`,
      })
      .catch(() => {});
  }
}
