import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();
const user = {
  id: 'alice',
  username: 'alice',
  phoneVerified: false,
  displayName: '小爱 / 星野',
  avatar: '爱',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    })
  }
}));

beforeEach(() => {
  storage.clear();
  vi.resetModules();
});

describe('app store auth persistence', () => {
  it('persists authenticated sessions', async () => {
    const { useAppStore } = await import('../src/state/appStore');

    useAppStore.getState().setAuthSession('token-a', user);

    const stored = storage.get('nfc-chat-auth-state');
    expect(stored).toContain('"token":"token-a"');
    expect(stored).toContain('"id":"alice"');
  });

  it('hydrates a valid session by calling /auth/me', async () => {
    storage.set('nfc-chat-auth-state', JSON.stringify({ token: 'token-a', currentUser: user, contacts: [], messagesByContact: {} }));
    const client = await import('../src/api/client');
    vi.spyOn(client.api, 'me').mockResolvedValue({ user });
    const { hydrateAppStore, useAppStore } = await import('../src/state/appStore');

    await hydrateAppStore();

    expect(useAppStore.getState().authStatus).toBe('authenticated');
    expect(useAppStore.getState().currentUser?.id).toBe('alice');
  });

  it('clears an invalid persisted token', async () => {
    storage.set('nfc-chat-auth-state', JSON.stringify({ token: 'bad-token', currentUser: user, contacts: [], messagesByContact: {} }));
    const client = await import('../src/api/client');
    vi.spyOn(client.api, 'me').mockRejectedValue(new client.ApiError('登录状态已失效。', 401, 'SESSION_INVALID'));
    const { hydrateAppStore, useAppStore } = await import('../src/state/appStore');

    await hydrateAppStore();

    expect(useAppStore.getState().authStatus).toBe('anonymous');
    expect(useAppStore.getState().token).toBeNull();
    expect(storage.has('nfc-chat-auth-state')).toBe(false);
  });

  it('keeps missing conversation snapshots stable for React external-store selectors', async () => {
    const emptyMessages: unknown[] = [];
    const { useAppStore } = await import('../src/state/appStore');
    const selectMissingConversation = (state: ReturnType<typeof useAppStore.getState>) =>
      state.messagesByContact.missing ?? emptyMessages;

    expect(selectMissingConversation(useAppStore.getState())).toBe(
      selectMissingConversation(useAppStore.getState())
    );
  });
});
