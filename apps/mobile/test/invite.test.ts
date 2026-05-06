import { describe, expect, it } from 'vitest';
import { buildInvitePayload, parseInvitePayload } from '../src/features/nfc/invite';

describe('NFC invite payloads', () => {
  it('parses supported invite URLs', () => {
    expect(parseInvitePayload('nfcchat://add-friend?userId=bob')).toEqual({ userId: 'bob' });
  });

  it('parses raw user IDs for manual fallback', () => {
    expect(parseInvitePayload('alice')).toEqual({ userId: 'alice' });
  });

  it('builds invite payloads', () => {
    expect(buildInvitePayload('mika')).toBe('nfcchat://add-friend?userId=mika');
  });

  it('rejects unsupported URLs', () => {
    expect(() => parseInvitePayload('https://example.com/add?userId=bob')).toThrow('邀请链接格式不受支持');
  });

  it('rejects malformed user IDs', () => {
    expect(() => parseInvitePayload('nfcchat://add-friend?userId=bad/id')).toThrow('缺少有效的 userId');
  });
});
