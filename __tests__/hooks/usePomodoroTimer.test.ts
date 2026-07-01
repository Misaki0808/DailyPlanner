jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(),
    },
  },
}));

jest.mock('expo-notifications', () => ({
  AndroidNotificationPriority: { HIGH: 'high' },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}));

jest.mock('../../src/context/AppContext', () => ({
  useApp: jest.fn(),
}));

import { calculatePomodoroStreak } from '../../src/hooks/usePomodoroTimer';

describe('calculatePomodoroStreak', () => {
  it('counts consecutive days including today', () => {
    expect(calculatePomodoroStreak({
      '2026-06-29': 1,
      '2026-06-30': 2,
      '2026-07-01': 1,
    }, '2026-07-01')).toBe(3);
  });

  it('continues from yesterday when today has no sessions', () => {
    expect(calculatePomodoroStreak({
      '2026-06-29': 1,
      '2026-06-30': 2,
    }, '2026-07-01')).toBe(2);
  });

  it('stops at the first empty day before the streak', () => {
    expect(calculatePomodoroStreak({
      '2026-06-27': 3,
      '2026-06-29': 1,
      '2026-06-30': 1,
      '2026-07-01': 1,
    }, '2026-07-01')).toBe(3);
  });
});
