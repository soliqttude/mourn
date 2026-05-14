import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { GuildMember } from "discord.js";

export async function generateWelcomeImage(member: GuildMember): Promise<Buffer> {
  const W = 900, H = 280;
  const RADIUS = 16;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Clip entire canvas to rounded rect ─────────────────────────────────────
  roundRect(ctx, 0, 0, W, H, RADIUS);
  ctx.clip();

  // ── Background gradient ─────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0a0f");
  bg.addColorStop(1, "#12101c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Very subtle ambient glow left-center, doesn't overpower
  const glow = ctx.createRadialGradient(260, H / 2, 0, 260, H / 2, 260);
  glow.addColorStop(0, "rgba(90, 60, 180, 0.06)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Avatar (right side) ─────────────────────────────────────────────────────
  const avSize = 118;
  const avPad = 36;
  const avX = W - avSize - avPad;
  const avY = (H - avSize) / 2;
  const avR = 12;

  ctx.save();
  roundRect(ctx, avX, avY, avSize, avSize, avR);
  ctx.clip();

  try {
    const url = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const img = await loadImage(url);
    ctx.drawImage(img, avX, avY, avSize, avSize);
  } catch {
    ctx.fillStyle = "#1c1a28";
    ctx.fillRect(avX, avY, avSize, avSize);
  }

  ctx.restore();

  // ── Text (left side) ────────────────────────────────────────────────────────
  const textX = 44;
  const textAreaRight = avX - 28;
  const maxTextW = textAreaRight - textX;
  const midY = H / 2;

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // Server name — main title
  const serverName = member.guild.name;
  let title = `welcome to ${serverName}`;
  let titleSize = 36;
  ctx.font = `500 ${titleSize}px sans-serif`;
  while (ctx.measureText(title).width > maxTextW && titleSize > 20) {
    titleSize -= 1;
    ctx.font = `500 ${titleSize}px sans-serif`;
  }
  if (ctx.measureText(title).width > maxTextW) {
    title = `welcome to ${serverName.slice(0, 18)}…`;
    ctx.font = `500 ${titleSize}px sans-serif`;
  }

  ctx.fillStyle = "#f0f0f5";
  ctx.fillText(title, textX, midY - 6);

  // Subtitle
  ctx.font = "300 17px sans-serif";
  ctx.fillStyle = "rgba(190, 185, 210, 0.42)";
  ctx.fillText("enjoy your stay 👋", textX, midY + 26);

  return canvas.toBuffer("image/png");
}

function roundRect(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
