import { describe, expect, it } from 'vitest';
import { formatBeijingTime } from '../src/ui/time';

describe('formatBeijingTime', () => {
  it('formats timestamps in Asia/Shanghai regardless of host timezone', () => {
    expect(formatBeijingTime('2026-05-06T03:31:00.000Z')).toBe('11:31');
  });
});
