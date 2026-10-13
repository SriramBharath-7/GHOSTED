import { EVERY_DAY } from '@/domain/schedule';

/**
 * Habits created on first launch. Titles are the user's own names; never
 * rename them in code. Descriptions for Kernel Strike and Phoenix 65 are left
 * empty on purpose, to be filled in from the habit editor.
 */
export interface SeedHabit {
  title: string;
  /** Line-icon key (components/hud/icons). */
  icon: string;
  description: string;
  question: string;
  accent: string;
  daysMask: number;
  xp: number;
  coins: number;
  reminder: string | null;
}

export const SEED_HABITS: readonly SeedHabit[] = [
  {
    title: 'Regenesis Command',
    icon: 'brain',
    description: 'Daily hair protocol.',
    question: 'Did you complete the Hair protocol (Minoxidil and Finasteride)?',
    accent: '#4FD8FF',
    daysMask: EVERY_DAY,
    xp: 15,
    coins: 5,
    reminder: '20:30',
  },
  {
    title: 'The Iron Monarch',
    icon: 'dumbbell',
    description: 'Gym / training.',
    question: '',
    accent: '#2A8CFF',
    daysMask: EVERY_DAY,
    xp: 50,
    coins: 15,
    reminder: null,
  },
  {
    title: 'The Kernel Strike',
    icon: 'laptop',
    description: '',
    question: '',
    accent: '#7FB4FF',
    daysMask: EVERY_DAY,
    xp: 30,
    coins: 10,
    reminder: null,
  },
  {
    title: 'The Phoenix 65',
    icon: 'chart',
    description: '',
    question: '',
    accent: '#3DE0D0',
    daysMask: EVERY_DAY,
    xp: 30,
    coins: 10,
    reminder: null,
  },
  {
    title: 'No Junk UPF',
    icon: 'no-junk',
    description: 'No junk or ultra-processed food.',
    question: '',
    accent: '#EAF7FF',
    daysMask: EVERY_DAY,
    xp: 35,
    coins: 10,
    reminder: null,
  },
];

export const DEFAULT_PLAYER_NAME = 'Sri';
