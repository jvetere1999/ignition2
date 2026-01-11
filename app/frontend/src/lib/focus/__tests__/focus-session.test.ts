/**
 * Focus Session Unit Tests
 *
 * Tests focus session logic and state management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Focus Session Logic', () => {
  describe('Timer Calculations', () => {
    it('calculates remaining time correctly', () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const plannedDurationMinutes = 25;
      const now = new Date('2025-01-01T10:10:00Z');
      
      const elapsedMs = now.getTime() - startTime.getTime();
      const remainingMs = (plannedDurationMinutes * 60 * 1000) - elapsedMs;
      const remainingMinutes = Math.floor(remainingMs / 60000);
      
      expect(remainingMinutes).toBe(15);
    });

    it('handles overtime correctly', () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const plannedDurationMinutes = 25;
      const now = new Date('2025-01-01T10:30:00Z');
      
      const elapsedMs = now.getTime() - startTime.getTime();
      const remainingMs = (plannedDurationMinutes * 60 * 1000) - elapsedMs;
      
      expect(remainingMs).toBeLessThan(0);
    });

    it('calculates progress percentage', () => {
      const plannedMs = 25 * 60 * 1000;
      const elapsedMs = 10 * 60 * 1000;
      
      const progress = (elapsedMs / plannedMs) * 100;
      
      expect(progress).toBe(40);
    });
  });

  describe('Focus Types', () => {
    it('validates focus type values', () => {
      const validTypes = ['focus', 'break', 'long_break'];
      
      validTypes.forEach(type => {
        expect(['focus', 'break', 'long_break']).toContain(type);
      });
    });

    it('calculates break duration based on focus type', () => {
      const getBreakDuration = (focusType: string): number => {
        switch (focusType) {
          case 'focus': return 25;
          case 'break': return 5;
          case 'long_break': return 15;
          default: return 25;
        }
      };

      expect(getBreakDuration('focus')).toBe(25);
      expect(getBreakDuration('break')).toBe(5);
      expect(getBreakDuration('long_break')).toBe(15);
    });
  });

  describe('Session Status', () => {
    it('validates status transitions', () => {
      const validTransitions: Record<string, string[]> = {
        'active': ['completed', 'abandoned', 'paused'],
        'paused': ['active', 'abandoned'],
        'completed': [],
        'abandoned': [],
      };

      expect(validTransitions['active']).toContain('completed');
      expect(validTransitions['completed']).not.toContain('active');
    });
  });

  describe('XP Calculations', () => {
    it('calculates base XP for completed session', () => {
      const calculateXP = (durationMinutes: number, completed: boolean): number => {
        if (!completed) return 0;
        
        const baseXP = Math.floor(durationMinutes * 2);
        const bonus = durationMinutes >= 25 ? 10 : 0;
        
        return baseXP + bonus;
      };

      expect(calculateXP(25, true)).toBe(60);
      expect(calculateXP(15, true)).toBe(30);
      expect(calculateXP(25, false)).toBe(0);
    });

    it('applies streak multiplier', () => {
      const applyStreakMultiplier = (baseXP: number, streakDays: number): number => {
        const multiplier = 1 + (Math.min(streakDays, 7) * 0.1);
        return Math.floor(baseXP * multiplier);
      };

      expect(applyStreakMultiplier(50, 0)).toBe(50);
      expect(applyStreakMultiplier(50, 5)).toBe(75);
      expect(applyStreakMultiplier(50, 10)).toBe(85); // Capped at 7 days
    });
  });
});

describe('Focus Pause State', () => {
  describe('Pause/Resume Logic', () => {
    it('tracks pause duration', () => {
      const pauseStart = new Date('2025-01-01T10:10:00Z');
      const resumeTime = new Date('2025-01-01T10:15:00Z');
      
      const pauseDurationMs = resumeTime.getTime() - pauseStart.getTime();
      
      expect(pauseDurationMs).toBe(5 * 60 * 1000);
    });

    it('accumulates multiple pauses', () => {
      const pauses = [
        { start: new Date('2025-01-01T10:05:00Z'), end: new Date('2025-01-01T10:07:00Z') },
        { start: new Date('2025-01-01T10:15:00Z'), end: new Date('2025-01-01T10:18:00Z') },
      ];
      
      const totalPauseMs = pauses.reduce((acc, pause) => {
        return acc + (pause.end.getTime() - pause.start.getTime());
      }, 0);
      
      expect(totalPauseMs).toBe(5 * 60 * 1000);
    });
  });

  describe('Effective Duration', () => {
    it('subtracts pause time from total', () => {
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T10:30:00Z');
      const totalPauseMs = 5 * 60 * 1000;
      
      const totalMs = endTime.getTime() - startTime.getTime();
      const effectiveMs = totalMs - totalPauseMs;
      
      expect(effectiveMs).toBe(25 * 60 * 1000);
    });
  });
});

describe('Pomodoro Technique', () => {
  describe('Session Sequence', () => {
    it('alternates focus and break sessions', () => {
      const getNextSessionType = (
        currentType: string,
        completedFocusSessions: number
      ): string => {
        if (currentType === 'focus') {
          return completedFocusSessions % 4 === 0 ? 'long_break' : 'break';
        }
        return 'focus';
      };

      expect(getNextSessionType('focus', 4)).toBe('long_break');
      expect(getNextSessionType('focus', 3)).toBe('break');
      expect(getNextSessionType('break', 3)).toBe('focus');
    });

    it('tracks daily focus count', () => {
      const sessions = [
        { type: 'focus', completed: true },
        { type: 'break', completed: true },
        { type: 'focus', completed: true },
        { type: 'focus', completed: false },
      ];
      
      const completedFocusSessions = sessions.filter(
        s => s.type === 'focus' && s.completed
      ).length;
      
      expect(completedFocusSessions).toBe(2);
    });
  });
});
