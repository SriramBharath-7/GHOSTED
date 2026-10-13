import type { Db } from './db';

// Data-only steps of shipped migrations, kept as constants so restored
// backups can replay them (see DATA_STEPS). Frozen like the migrations.

// v2: seeded emoji become line-icon keys; user-picked emoji stay.
const V2_ICON_KEYS = `
  UPDATE habits SET icon = CASE icon
    WHEN '🧬' THEN 'brain' WHEN '🏋️' THEN 'dumbbell' WHEN '⚡' THEN 'laptop'
    WHEN '🔥' THEN 'chart' WHEN '🍟' THEN 'no-junk' WHEN '💧' THEN 'droplet'
    WHEN '📖' THEN 'book' WHEN '🧘' THEN 'leaf' WHEN '🏃' THEN 'run' WHEN '💊' THEN 'pill'
    WHEN '🛏️' THEN 'bed' WHEN '🥗' THEN 'salad' WHEN '🧠' THEN 'brain' WHEN '✍️' THEN 'pen'
    WHEN '🚭' THEN 'no-smoking' WHEN '🎯' THEN 'target' ELSE icon END;

  UPDATE rewards SET icon = CASE icon
    WHEN '🍔' THEN 'burger' WHEN '🍕' THEN 'pizza' WHEN '🎬' THEN 'film' WHEN '🎮' THEN 'gamepad'
    WHEN '👕' THEN 'shirt' WHEN '👟' THEN 'footprints' WHEN '☕' THEN 'coffee' WHEN '🍰' THEN 'cake'
    WHEN '📚' THEN 'book' WHEN '🎧' THEN 'headphones' WHEN '✈️' THEN 'plane' WHEN '🛌' THEN 'bed'
    WHEN '🎁' THEN 'gift' WHEN '💆' THEN 'sparkles' WHEN '🍺' THEN 'beer' WHEN '🛍️' THEN 'bag'
    ELSE icon END;
  UPDATE inventory SET icon = (SELECT r.icon FROM rewards r WHERE r.id = inventory.reward_id)
    WHERE reward_id IS NOT NULL;
  `;

// v3: untouched seed accents move to the HUD palette.
const V3_SEED_ACCENTS = `
  UPDATE habits SET accent = '#4FD8FF' WHERE title = 'Regenesis Command' AND accent = '#3CCFB4';
  UPDATE habits SET accent = '#2A8CFF' WHERE title = 'The Iron Monarch' AND accent = '#EF6351';
  UPDATE habits SET accent = '#7FB4FF' WHERE title = 'The Kernel Strike' AND accent = '#A08BFF';
  UPDATE habits SET accent = '#3DE0D0' WHERE title = 'The Phoenix 65' AND accent = '#FF8A3D';
  UPDATE habits SET accent = '#EAF7FF' WHERE title = 'No Junk UPF' AND accent = '#8BD45A';
  `;

/**
 * Append-only list: index i upgrades schema version i → i + 1.
 * Never edit a shipped migration; add a new one.
 *
 * Dates are local calendar days ('YYYY-MM-DD'); timestamps are ISO strings.
 * Child rows are deleted explicitly in repositories; FKs document intent.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    question TEXT NOT NULL DEFAULT '',
    accent TEXT NOT NULL,
    days_mask INTEGER NOT NULL DEFAULT 127 CHECK (days_mask BETWEEN 1 AND 127),
    xp_reward INTEGER NOT NULL CHECK (xp_reward >= 0),
    coin_reward INTEGER NOT NULL CHECK (coin_reward >= 0),
    reminder_time TEXT,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  -- habits.days_mask is the configured schedule; this table is its history,
  -- so past days keep the schedule they actually had. 0 = paused (archived).
  CREATE TABLE habit_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habits(id),
    effective_from TEXT NOT NULL,
    days_mask INTEGER NOT NULL CHECK (days_mask BETWEEN 0 AND 127),
    UNIQUE (habit_id, effective_from)
  );

  -- UNIQUE (habit_id, date) is what makes XP farming impossible.
  CREATE TABLE completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habits(id),
    date TEXT NOT NULL,
    xp_awarded INTEGER NOT NULL,
    coins_awarded INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (habit_id, date)
  );
  CREATE INDEX idx_completions_date ON completions(date);

  -- Append-only progression ledger. XP and coin balances are SUMs over it.
  CREATE TABLE ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    coins INTEGER NOT NULL DEFAULT 0,
    habit_id INTEGER,
    date TEXT,
    ref_id INTEGER,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_ledger_kind_date ON ledger(kind, date);

  -- Days on which every scheduled visible habit was complete. Kept in sync
  -- with completions by resyncPerfectDays.
  CREATE TABLE perfect_days (
    date TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🎁',
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    cost INTEGER NOT NULL CHECK (cost > 0),
    stock INTEGER CHECK (stock IS NULL OR stock >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward_id INTEGER,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  -- One stack per reward. reward_id becomes NULL if the reward is deleted.
  CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reward_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    first_acquired_at TEXT NOT NULL,
    last_acquired_at TEXT NOT NULL
  );

  CREATE TABLE redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    redeemed_at TEXT NOT NULL
  );

  CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    horizon TEXT NOT NULL CHECK (horizon IN ('short', 'long')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'dropped')),
    target_date TEXT,
    progress INTEGER CHECK (progress IS NULL OR progress BETWEEN 0 AND 100),
    notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  -- Private counter. Only the Vault reads this table.
  CREATE TABLE vault_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    created_at TEXT NOT NULL
  );
  `,
  // v2: HUD redesign. Line icons replace emoji (unknown values still render as
  // text), and missions gain an icon, tags, step counts and a start date.
  `
  ALTER TABLE goals ADD COLUMN icon TEXT NOT NULL DEFAULT 'target';
  ALTER TABLE goals ADD COLUMN category TEXT NOT NULL DEFAULT '';
  ALTER TABLE goals ADD COLUMN steps_total INTEGER CHECK (steps_total IS NULL OR steps_total > 0);
  ALTER TABLE goals ADD COLUMN steps_done INTEGER NOT NULL DEFAULT 0 CHECK (steps_done >= 0);
  ALTER TABLE goals ADD COLUMN start_date TEXT;
` + V2_ICON_KEYS,
  // Only untouched seed accents change. Custom colors and all progress survive.
  V3_SEED_ACCENTS,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/**
 * The data-only steps of the migrations above, by the schema version that
 * added them. Restoring a backup made before a version replays its step, so
 * old backups end up exactly as if their data had been migrated on a device.
 * Each must be idempotent and leave user-chosen values alone.
 */
export const DATA_STEPS: Readonly<Record<number, string>> = { 2: V2_ICON_KEYS, 3: V3_SEED_ACCENTS };

export async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  for (let version = row?.user_version ?? 0; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
