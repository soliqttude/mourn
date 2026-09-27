import { pool } from "../db/index.js";

export type StoredButtonRole = {
  id: number;
  guildId: string;
  channelId: string;
  messageId: string;
  roleId: string;
  style: string;
  emoji: string | null;
  label: string;
};

export async function addButtonRole(input: Omit<StoredButtonRole, "id">) {
  const result = await pool.query(
    `INSERT INTO button_role_bindings
      (guild_id, channel_id, message_id, role_id, style, emoji, label)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (message_id, role_id)
     DO UPDATE SET style=EXCLUDED.style, emoji=EXCLUDED.emoji, label=EXCLUDED.label
     RETURNING id, guild_id AS "guildId", channel_id AS "channelId",
       message_id AS "messageId", role_id AS "roleId", style, emoji, label`,
    [input.guildId, input.channelId, input.messageId, input.roleId, input.style, input.emoji, input.label],
  );
  return result.rows[0] as StoredButtonRole;
}

export async function listButtonRoles(guildId: string) {
  const result = await pool.query(
    `SELECT id, guild_id AS "guildId", channel_id AS "channelId",
      message_id AS "messageId", role_id AS "roleId", style, emoji, label
     FROM button_role_bindings WHERE guild_id=$1 ORDER BY message_id, id`,
    [guildId],
  );
  return result.rows as StoredButtonRole[];
}

export async function getMessageButtonRoles(messageId: string) {
  const result = await pool.query(
    `SELECT id, guild_id AS "guildId", channel_id AS "channelId",
      message_id AS "messageId", role_id AS "roleId", style, emoji, label
     FROM button_role_bindings WHERE message_id=$1 ORDER BY id`,
    [messageId],
  );
  return result.rows as StoredButtonRole[];
}

export async function removeButtonRole(messageId: string, index: number) {
  const result = await pool.query(
    `DELETE FROM button_role_bindings
     WHERE id = (
       SELECT id FROM button_role_bindings
       WHERE message_id=$1 ORDER BY id OFFSET $2 LIMIT 1
     ) RETURNING id`,
    [messageId, index],
  );
  return result.rowCount > 0;
}

export async function removeAllButtonRoles(messageId: string) {
  const result = await pool.query(
    `DELETE FROM button_role_bindings WHERE message_id=$1`,
    [messageId],
  );
  return result.rowCount;
}

export async function resetButtonRoles(guildId: string) {
  const result = await pool.query(
    `DELETE FROM button_role_bindings WHERE guild_id=$1`,
    [guildId],
  );
  return result.rowCount;
}
