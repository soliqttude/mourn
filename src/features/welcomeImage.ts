import { createCanvas } from "@napi-rs/canvas";
import type { GuildMember } from "discord.js";

export async function generateWelcomeImage(member: GuildMember): Promise<Buffer> {
  const W = 800, H = 250;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background ─────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b0b0f");
  bg.addColorStop(0.5, "#111118");
  bg.addColorStop(1, "#0d0d12");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Centered soft glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 320);
  glow.addColorStop(0, "rgba(110, 75, 210, 0.09)");
  glow.addColorStop(0.5, "rgba(80, 50, 170, 0.04)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Typography ─────────────────────────────────────────────────────────────
  const centerX = W / 2;
  const centerY = H / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // "welcome to {server}" — large white title
  const serverName = member.guild.name;
  let title = `welcome to ${serverName}`;

  // Responsive font size — shrink if server name is long
  let fontSize = 42;
  ctx.font = `500 ${fontSize}px sans-serif`;
  while (ctx.measureText(title).width > W - 120 && fontSize > 22) {
    fontSize -= 1;
    ctx.font = `500 ${fontSize}px sans-serif`;
  }
  if (ctx.measureText(title).width > W - 120) {
    title = `welcome to ${serverName.slice(0, 20)}…`;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillText(title, centerX, centerY - 22);

  // Thin divider line between title and subtitle
  const dividerW = 160;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - dividerW / 2, centerY + 6);
  ctx.lineTo(centerX + dividerW / 2, centerY + 6);
  ctx.stroke();

  // "enjoy your stay" — smaller muted subtitle
  ctx.font = "300 18px sans-serif";
  ctx.fillStyle = "rgba(200, 200, 215, 0.4)";
  ctx.fillText("enjoy your stay", centerX, centerY + 32);

  return canvas.toBuffer("image/png");
}
