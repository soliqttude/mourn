import { pool } from "../db/index.js";

export interface RoleCategory {
  id: number;
  name: string;
  roles: string[];
}

export async function createCategory(guildId: string, name: string): Promise<void> {
  const client = await pool.connect();
  try {
    // NOTE: ON CONFLICT DO NOTHING only works if button_role_categories has a
    // unique constraint on (guild_id, name). If your migration doesn't define
    // that, this silently won't dedupe and concurrent calls could create
    // duplicate categories with the same name. Worth double-checking the schema.
    await client.query(
      `INSERT INTO button_role_categories (guild_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [guildId, name.toLowerCase()]
    );
  } finally { client.release(); }
}

// FIX: previously two separate DELETE calls with no transaction — if the
// process crashed or the connection dropped between them, entries could be
// orphaned pointing at a category_id that no longer exists. Now wrapped in
// BEGIN/COMMIT so both deletes succeed or neither does.
export async function deleteCategory(guildId: string, name: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cat = await client.query(
      `SELECT id FROM button_role_categories WHERE guild_id=$1 AND name=$2 FOR UPDATE`,
      [guildId, name.toLowerCase()]
    );
    if (!cat.rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(`DELETE FROM button_role_entries WHERE category_id=$1`, [cat.rows[0].id]);
    await client.query(`DELETE FROM button_role_categories WHERE id=$1`, [cat.rows[0].id]);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
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
    // NOTE: same as above — relies on a unique constraint on
    // (category_id, role_id) in button_role_entries for the dedup to work.
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

// FIX: previously 1 query for categories + 1 query per category for entries
// (N+1). Now a single LEFT JOIN query, grouped in JS. LEFT JOIN so categories
// with zero roles still show up with an empty roles array instead of vanishing.
export async function getCategories(guildId: string): Promise<RoleCategory[]> {
  const client = await pool.connect();
  try {
    const rows = await client.query(
      `SELECT c.id, c.name, e.role_id
       FROM button_role_categories c
       LEFT JOIN button_role_entries e ON e.category_id = c.id
       WHERE c.guild_id = $1
       ORDER BY c.position, c.id`,
      [guildId]
    );

    const byId = new Map<number, RoleCategory>();
    const order: number[] = [];
    for (const row of rows.rows) {
      let cat = byId.get(row.id);
      if (!cat) {
        cat = { id: row.id, name: row.name, roles: [] };
        byId.set(row.id, cat);
        order.push(row.id);
      }
      if (row.role_id) cat.roles.push(row.role_id);
    }
    return order.map(id => byId.get(id)!);
  } finally { client.release(); }
}
