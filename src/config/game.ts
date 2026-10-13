/**
 * Every progression number lives here. Tune freely: history stays consistent
 * because each completion stores the XP/coins it actually awarded.
 */

/** XP needed to go from `level` to `level + 1` = base + step × (level − 1). */
export const LEVEL_CURVE = {
  base: 200,
  step: 50,
};

/**
 * Awarded once per day when every scheduled visible habit is complete.
 * Keep it above zero: ranks count only the Perfect Days that paid this bonus.
 */
export const PERFECT_DAY_BONUS = {
  xp: 50,
  coins: 20,
};

/** Defaults for habits created in the editor. */
export const NEW_HABIT_REWARD = {
  xp: 25,
  coins: 8,
};

/** Upper bounds the editors accept, to keep the economy sane. */
export const REWARD_LIMITS = {
  maxHabitXp: 500,
  maxHabitCoins: 200,
  maxRewardCost: 100_000,
};

/** Days shown in the Daily recent-history rail (including today). */
export const RECENT_DAYS = 7;

/**
 * Days of history the Player/Daily screens keep in memory. Streak and
 * missed-day counts there are exact up to this length (Intel is always exact).
 */
export const HISTORY_WINDOW_DAYS = 366;

/** Local reminders are scheduled this many days ahead and refreshed on open. */
export const REMINDER_HORIZON_DAYS = 14;

/** Quiet markers on the private Vault counter (days). */
export const VAULT_MILESTONES: readonly number[] = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730];
