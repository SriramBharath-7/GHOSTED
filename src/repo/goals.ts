import { type Db, nowIso, transaction } from '@/db/db';
import type { DateKey } from '@/domain/dates';

export type GoalHorizon = 'short' | 'long';
export type GoalStatus = 'active' | 'done' | 'dropped';

export interface Goal {
  id: number;
  title: string;
  description: string;
  horizon: GoalHorizon;
  status: GoalStatus;
  /** Line-icon key (see components/hud/icons). */
  icon: string;
  /** Tags shown under the title, '·'-separated. */
  category: string;
  /** Missions starting in the future are listed as Upcoming. */
  startDate: DateKey | null;
  targetDate: DateKey | null;
  /** Step-based progress ("3 / 5"); null when steps aren't used. */
  stepsTotal: number | null;
  stepsDone: number;
  /** Manual 0–100 progress, used when there are no steps; null when not tracked. */
  progress: number | null;
  notes: string;
  sortOrder: number;
  completedAt: string | null;
}

export type GoalInput = Pick<
  Goal,
  | 'title'
  | 'description'
  | 'horizon'
  | 'icon'
  | 'category'
  | 'startDate'
  | 'targetDate'
  | 'stepsTotal'
  | 'stepsDone'
  | 'progress'
  | 'notes'
>;

const SELECT = `SELECT id, title, description, horizon, status, icon, category, start_date AS startDate,
  target_date AS targetDate, steps_total AS stepsTotal, steps_done AS stepsDone, progress, notes,
  sort_order AS sortOrder, completed_at AS completedAt FROM goals`;

/** 0..1 completion, or null when the mission has no progress tracking. */
export function goalProgress(goal: Pick<Goal, 'stepsTotal' | 'stepsDone' | 'progress' | 'status'>): number | null {
  if (goal.status === 'done') return 1;
  if (goal.stepsTotal) return Math.min(1, goal.stepsDone / goal.stepsTotal);
  return goal.progress === null ? null : goal.progress / 100;
}

export function isUpcoming(goal: Pick<Goal, 'status' | 'startDate'>, today: DateKey): boolean {
  return goal.status === 'active' && goal.startDate !== null && goal.startDate > today;
}

export function listGoals(db: Db): Promise<Goal[]> {
  return db.getAllAsync<Goal>(`${SELECT} ORDER BY sort_order, id`, []);
}

export function getGoal(db: Db, id: number): Promise<Goal | null> {
  return db.getFirstAsync<Goal>(`${SELECT} WHERE id = ?`, [id]);
}

const values = (input: GoalInput) => [
  input.title.trim(),
  input.description.trim(),
  input.horizon,
  input.icon,
  input.category.trim(),
  input.startDate,
  input.targetDate,
  input.stepsTotal,
  input.stepsTotal ? Math.min(input.stepsDone, input.stepsTotal) : 0,
  input.stepsTotal ? null : input.progress,
  input.notes.trim(),
];

export function createGoal(db: Db, input: GoalInput): Promise<number> {
  return transaction(db, async () => {
    const { lastInsertRowId } = await db.runAsync(
      `INSERT INTO goals (title, description, horizon, icon, category, start_date, target_date, steps_total,
         steps_done, progress, notes, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM goals), ?)`,
      [...values(input), nowIso()],
    );
    return lastInsertRowId;
  });
}

export function updateGoal(db: Db, id: number, input: GoalInput): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync(
      `UPDATE goals SET title = ?, description = ?, horizon = ?, icon = ?, category = ?, start_date = ?,
         target_date = ?, steps_total = ?, steps_done = ?, progress = ?, notes = ? WHERE id = ?`,
      [...values(input), id],
    );
  });
}

export function setGoalStatus(db: Db, id: number, status: GoalStatus): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync(
      `UPDATE goals SET status = ?, completed_at = ?,
         progress = CASE WHEN ? = 'done' AND progress IS NOT NULL THEN 100 ELSE progress END,
         steps_done = CASE WHEN ? = 'done' AND steps_total IS NOT NULL THEN steps_total ELSE steps_done END
       WHERE id = ?`,
      [status, status === 'done' ? nowIso() : null, status, status, id],
    );
  });
}

/** One step forward (or +10% without steps), capped at done. */
export function advanceGoal(db: Db, goal: Goal): Promise<void> {
  return transaction(db, async () => {
    if (goal.stepsTotal) {
      await db.runAsync('UPDATE goals SET steps_done = MIN(steps_done + 1, steps_total) WHERE id = ?', [goal.id]);
    } else if (goal.progress !== null) {
      await db.runAsync('UPDATE goals SET progress = MIN(progress + 10, 100) WHERE id = ?', [goal.id]);
    }
  });
}

export function deleteGoal(db: Db, id: number): Promise<void> {
  return transaction(db, async () => {
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
  });
}
