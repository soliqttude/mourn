import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../config.js";
import * as schema from "./schema.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  ssl: config.databaseUrl.includes("railway")
    ? { rejectUnauthorized: false }
    : config.databaseUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema });

export { schema };
