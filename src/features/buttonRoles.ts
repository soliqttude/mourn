import { pool } from "../db/index.js";

export interface RoleCategory {
  id: number;
  name: string;
  roles: string[];
}

export async function createCategory(guildId: string, name: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO button_role_categories (guild_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [guildId, name.toLowerCase()]
    );
  } finally { client.release(); }
}

export async function deleteCategory(guildId: string, name: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const cat = await client.query(
      `SELECT id FROM button_role_categories WHERE guild_id=$1 AND name=$2`,
      [guildId, name.toLowerCase()]
    );
    if (!cat.rows[0]) return false;
    await client.query(`DELETE FROM button_role_entries WHERE category_id=$1`, [cat.rows[0].id]);
    await client.query(`DELETE FROM button_role_categories WHERE id=$1`, [cat.rows[0].id]);
    return true;
  } finally { client.release(); }
}

export async function addRoleToCategory(guildId: string, name: string, roleId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const cat = await client.query(
      `SELECT id FROM button_role_categories WHERE guild_id=$1 AND name=$2`,
      [guildId, name.toLowerCase()]
    );
    if (!cat.rows[0]) return false;
    await client.query(
      `INSERT INTO button_role_entries (category_id, guild_id, role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [cat.rows[0].id, guildId, roleId]
    );
    return true;
  } finally { client.release(); }
}

export async function removeRoleFromCategory(guildId: string, name: string, roleId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const cat = await client.query(
      `SELECT id FROM button_role_categories WHERE guild_id=$1 AND name=$2`,
      [guildId, name.toLowerCase()]
    );
    if (!cat.rows[0]) return false;
    await client.query(
      `DELETE FROM button_role_entries WHERE category_id=$1 AND role_id=$2`,
      [cat.rows[0].id, roleId]
    );
    return true;
  } finally { client.release(); }
}

export async function getCategories(guildId: string): Promise<RoleCategory[]> {
  const client = await pool.connect();
  try {
    const cats = await client.query(
      `SELECT id, name FROM button_role_categories WHERE guild_id=$1 ORDER BY position, id`,
      [guildId]
    );
    const result: RoleCategory[] = [];
    for (const cat of cats.rows) {
      const entries = await client.query(
        `SELECT role_id FROM button_role_entries WHERE category_id=$1`,
        [cat.id]
      );
      result.push({ id: cat.id, name: cat.name, roles: entries.rows.map((r: any) => r.role_id) });
    }
    return result;
  } finally { client.release(); }
}
