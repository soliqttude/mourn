import { createCanvas, loadImage } from "@napi-rs/canvas";
import type { GuildMember } from "discord.js";

export async function generateWelcomeImage(member: GuildMember): Promise<Buffer> {
  const W = 800, H = 250;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d0d1a");
  bg.addColorStop(1, "#16082b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#9B59B6";
  ctx.fillRect(0, 0, 5, H);
  ctx.fillStyle = "rgba(155, 89, 182, 0.12)";
  ctx.fillRect(0, H - 4, W, 4);

  const R = 80;
  const cx = 135, cy = H / 2;

  ctx.beginPath();
  ctx.arc(cx, cy, R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#9B59B6";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, cx - R, cy - R, R * 2, R * 2);
  } catch {
    ctx.fillStyle = "#9B59B6";
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  }
  ctx.restore();

  const tx = 250;

  ctx.fillStyle = "#9B59B6";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("\u2756  W E L C O M E  \u2756", tx, cy - 52);

  ctx.fillStyle = "rgba(155, 89, 182, 0.4)";
  ctx.fillRect(tx, cy - 38, 510, 1);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  let name = member.displayName;
  while (ctx.measureText(name).width > W - tx - 30 && name.length > 1) name = name.slice(0, -1);
  if (name !== member.displayName) name += "\u2026";
  ctx.fillText(name, tx, cy + 8);

  ctx.fillStyle = "#a0a0c0";
  ctx.font = "19px sans-serif";
  ctx.fillText(`Member #${member.guild.memberCount}  \u00b7  ${member.guild.name}`, tx, cy + 46);

  return canvas.toBuffer("image/png");
}
