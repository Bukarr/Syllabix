import { beforeEach, describe, expect, it } from 'vitest';
import { passwordIssues, passwordSchema } from '@/lib/validation';
import { clearFailures, lockoutRemaining, recordFailure, MAX_ATTEMPTS, LOCKOUT_MS } from '@/lib/login-guard';

describe('password policy', () => {
  it('rejects weak passwords', () => {
    expect(passwordIssues('short')).toContain('At least 8 characters');
    expect(passwordIssues('alllowercase1!')).toContain('One uppercase letter');
    expect(passwordIssues('ALLUPPERCASE1!')).toContain('One lowercase letter');
    expect(passwordIssues('NoNumbers!!')).toContain('One number');
    expect(passwordIssues('NoSpecial123')).toContain('One special character');
    expect(passwordSchema.safeParse('password').success).toBe(false);
  });

  it('accepts a compliant password', () => {
    expect(passwordIssues('Teacher#2026')).toEqual([]);
    expect(passwordSchema.safeParse('Teacher#2026').success).toBe(true);
  });
});

describe('login lockout', () => {
  beforeEach(() => clearFailures());

  it('locks after the maximum failed attempts', () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      expect(recordFailure()).toBe(0);
      expect(lockoutRemaining()).toBe(0);
    }
    expect(recordFailure()).toBe(LOCKOUT_MS);
    expect(lockoutRemaining()).toBeGreaterThan(0);
  });

  it('clears the counter after a successful sign-in', () => {
    recordFailure();
    recordFailure();
    clearFailures();
    expect(lockoutRemaining()).toBe(0);
  });

  it('expires the lock after the window passes', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) recordFailure();
    expect(lockoutRemaining(Date.now() + LOCKOUT_MS + 1000)).toBe(0);
  });
});