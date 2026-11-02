CREATE TABLE IF NOT EXISTS antinuke_permission_watches (
  guild_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('granted', 'removed')),
  permission text NOT NULL,
  PRIMARY KEY (guild_id, direction, permission)
);
