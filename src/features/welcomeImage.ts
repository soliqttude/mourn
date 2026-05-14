import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { GuildMember } from "discord.js";

export async function generateWelcomeImage(member: GuildMember): Promise<Buffer> {
  const W = 800, H = 250;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // ── Background ─────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0c0c10");
  bg.addColorStop(0.5, "#111116");
  bg.addColorStop(1, "#0e0e13");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow left-center
  const glow = ctx.createRadialGradient(300, H / 2, 0, 300, H / 2, 280);
  glow.addColorStop(0, "rgba(120, 80, 220, 0.07)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Typography ─────────────────────────────────────────────────────────────
  const textX = 52;
  const textCenterY = H / 2;

  // Server name — large white title
  const serverName = member.guild.name;
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 38px sans-serif";

  // Truncate if needed
  let title = `welcome to ${serverName}`;
  const maxTitleW = 480;
  while (ctx.measureText(title).width > maxTitleW && title.length > 12) {
    title = title.slice(0, -1);
  }
  if (title !== `welcome to ${serverName}`) title += "…";

  ctx.fillText(title, textX, textCenterY - 12);

  // Subtitle — smaller muted gray
  ctx.fillStyle = "rgba(200, 200, 210, 0.45)";
  ctx.font = "400 19px sans-serif";
  ctx.fillText("enjoy your stay", textX, textCenterY + 24);

  // ── Avatar card (right side) ────────────────────────────────────────────────
  const avatarSize = 130;
  const cardPad = 10;
  const cardSize = avatarSize + cardPad * 2;
  const cardRadius = 18;
  const cardX = W - cardSize - 44;
  const cardY = (H - cardSize) / 2;

  // Soft shadow/glow behind card
  const shadowGlow = ctx.createRadialGradient(
    cardX + cardSize / 2, cardY + cardSize / 2, 10,
    cardX + cardSize / 2, cardY + cardSize / 2, cardSize
  );
  shadowGlow.addColorStop(0, "rgba(140, 100, 255, 0.12)");
  shadowGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadowGlow;
  ctx.fillRect(cardX - 30, cardY - 30, cardSize + 60, cardSize + 60);

  // Card background — slightly lighter dark panel
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  roundRect(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
  ctx.fill();

  // Card subtle border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
  ctx.stroke();

  // Avatar clipped to rounded square inside card
  const avX = cardX + cardPad;
  const avY = cardY + cardPad;
  const avR = 12;

  ctx.save();
  roundRect(ctx, avX, avY, avatarSize, avatarSize, avR);
  ctx.clip();

  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, avX, avY, avatarSize, avatarSize);
  } catch {
    ctx.fillStyle = "#1a1a28";
    ctx.fillRect(avX, avY, avatarSize, avatarSize);
  }

  ctx.restore();

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
