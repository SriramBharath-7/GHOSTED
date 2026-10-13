import { create } from 'zustand';
import { HISTORY_WINDOW_DAYS } from '@/config/game';
import { getDb, openDatabase } from '@/db/database';
import { type DateKey, addDays, todayKey } from '@/domain/dates';
import { levelInfo, rankFor } from '@/domain/progression';
import { type Habit, listHabits } from '@/repo/habits';
import { getBalances, getDayEarnings, getPerfectDayCount, getPerfectDayStreak } from '@/repo/ledger';
import { type CompletionChange, completionsBetween, setCompletion } from '@/repo/progress';
import { type AppSettings, DEFAULT_SETTINGS, getSettings, setSetting } from '@/repo/settings';
import { haptics, setHapticsEnabled } from '@/services/haptics';
import { syncReminders } from '@/services/notifications';
import { playSound, setSoundEnabled } from '@/services/sound';
import { cueCharacter, useFx } from './fx';
import { dueOn } from './selectors';

export interface PlayerSnapshot {
  totalXp: number;
  coins: number;
  perfectDays: number;
  /** Consecutive Perfect Days. */
  perfectStreak: number;
  todayXp: number;
  todayCoins: number;
}

interface GameState {
  ready: boolean;
  today: DateKey;
  settings: AppSettings;
  player: PlayerSnapshot;
  /** Visible (non-archived) habits in the user's order. */
  habits: Habit[];
  /** Completed days per habit over the last HISTORY_WINDOW_DAYS. */
  recent: Record<number, ReadonlySet<DateKey>>;
  /** Bumped after every write; live queries refetch on change. */
  version: number;
  boot: () => Promise<void>;
  /** Reloads state after a write. `reminders` resyncs all reminders or one habit's. */
  commit: (options?: { reminders?: true | number }) => Promise<void>;
  checkDay: () => Promise<void>;
  setHabitDone: (habitId: number, date: DateKey, done: boolean) => Promise<CompletionChange | null>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useGame = create<GameState>((set, get) => ({
  ready: false,
  today: todayKey(),
  settings: DEFAULT_SETTINGS,
  player: { totalXp: 0, coins: 0, perfectDays: 0, perfectStreak: 0, todayXp: 0, todayCoins: 0 },
  habits: [],
  recent: {},
  version: 0,

  boot: async () => {
    const today = todayKey();
    set({ today });
    await openDatabase(today);
    await get().commit();
    set({ ready: true });
    void syncReminders(getDb(), today, {
      enabled: get().settings.reminders,
      requestOnFirstLaunch: true,
    });
  },

  commit: async (options = {}) => {
    const db = getDb();
    const { today } = get();
    const [settings, habits, balances, perfectDays, perfectStreak, earnings, rows] = await Promise.all([
      getSettings(db),
      listHabits(db),
      getBalances(db),
      getPerfectDayCount(db),
      getPerfectDayStreak(db, today),
      getDayEarnings(db, today),
      completionsBetween(db, addDays(today, -HISTORY_WINDOW_DAYS), today),
    ]);
    const recent: Record<number, Set<DateKey>> = {};
    for (const habit of habits) recent[habit.id] = new Set();
    for (const row of rows) recent[row.habit_id]?.add(row.date);
    setHapticsEnabled(settings.haptics);
    setSoundEnabled(settings.sound);
    set((s) => ({
      settings,
      habits,
      recent,
      player: {
        totalXp: balances.xp,
        coins: balances.coins,
        perfectDays,
        perfectStreak,
        todayXp: earnings.xp,
        todayCoins: earnings.coins,
      },
      version: s.version + 1,
    }));
    if (options.reminders !== undefined) {
      void syncReminders(db, today, {
        enabled: settings.reminders,
        habitId: options.reminders === true ? undefined : options.reminders,
      });
    }
  },

  checkDay: async () => {
    const today = todayKey();
    if (!get().ready || today === get().today) return;
    set({ today });
    await get().commit({ reminders: true });
  },

  setHabitDone: async (habitId, date, done) => {
    const { today, player: before } = get();
    const levelBefore = levelInfo(before.totalXp).level;
    const rankBefore = rankFor(levelBefore, before.perfectDays).tier;

    const change = await setCompletion(getDb(), habitId, date, done, today);
    if (!change) return null;
    if (change.completed) {
      haptics.complete();
      playSound('complete');
      cueCharacter('habitComplete');
    } else {
      haptics.undo();
      playSound('undo');
    }
    await get().commit(date === today ? { reminders: habitId } : {});

    const after = get().player;
    const level = levelInfo(after.totalXp).level;
    const rank = rankFor(level, after.perfectDays);
    const fx = useFx.getState();
    if (date === today && (level > levelBefore || rank.tier > rankBefore)) {
      fx.push({ type: 'levelUp', oldLevel: levelBefore, level, newRank: rank.tier > rankBefore ? rank.rank : null });
    }
    if (
      change.perfectDay === 'gained' &&
      date === today &&
      get().settings.lastCelebratedDay !== today
    ) {
      await setSetting(getDb(), 'lastCelebratedDay', today);
      set((s) => ({ settings: { ...s.settings, lastCelebratedDay: today } }));
      fx.push({
        type: 'perfectDay',
        done: dueOn(get().habits, today).filter((h) => get().recent[h.id]?.has(today)).length,
        xp: after.todayXp,
        coins: after.todayCoins,
      });
    }
    return change;
  },

  updateSettings: async (patch) => {
    const db = getDb();
    for (const [key, value] of Object.entries(patch) as [keyof AppSettings, never][]) {
      await setSetting(db, key, value);
    }
    await get().commit('reminders' in patch ? { reminders: true } : {});
  },
}));
