import type { GuildMember, User } from "discord.js";

interface TemplateContext {
  member?: GuildMember;
  user?: User;
  inviter?: { inviterId: string | null; code: string } | null;
}

export function renderTemplate(template: string, ctx: TemplateContext): string {
  const member = ctx.member;
  const user = ctx.user ?? member?.user;
  const guild = member?.guild;
  return template
    .replace(/\{user\.mention\}/g, user ? `<@${user.id}>` : "")
    .replace(/\{user\.tag\}/g, user?.tag ?? "")
    .replace(/\{user\.name\}/g, user?.username ?? "")
    .replace(/\{user\.id\}/g, user?.id ?? "")
    .replace(/\{user\}/g, user?.username ?? "")
    .replace(/\{server\}/g, guild?.name ?? "")
    .replace(/\{server\.name\}/g, guild?.name ?? "")
    .replace(/\{member_count\}/g, String(guild?.memberCount ?? ""))
    .replace(/\{inviter\}/g, ctx.inviter?.inviterId ? `<@${ctx.inviter.inviterId}>` : "unknown")
    .replace(/\{invite_code\}/g, ctx.inviter?.code ?? "unknown");
}
