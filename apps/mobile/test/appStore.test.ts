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
const contact = {
  id: 'bob',
  username: 'bob',
  phoneVerified: false,
  displayName: 'Bob',
  avatar: 'B',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z'
};
const message = {
  id: 'message-1',
  conversationId: 'alice-bob',
  senderId: 'bob',
  recipientId: 'alice',
  text: 'hello',
  createdAt: '2026-05-01T00:01:00.000Z'
};
const friendRequest = {
  id: 7,
  requester: contact,
  recipient: user,
  status: 'PENDING' as const,
  createdAt: '2026-05-01T00:02:00.000Z',
  respondedAt: null
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
    vi.spyOn(client.api, 'contacts').mockResolvedValue({ contacts: [] });
    vi.spyOn(client.api, 'incomingFriendRequests').mockResolvedValue({ requests: [] });
    vi.spyOn(client.api, 'messages').mockResolvedValue({ messages: [] });
    const { hydrateAppStore, useAppStore } = await import('../src/state/appStore');

    await hydrateAppStore();

    expect(useAppStore.getState().authStatus).toBe('authenticated');
    expect(useAppStore.getState().currentUser?.id).toBe('alice');
  });

  it('hydrates by requesting contacts and their messages', async () => {
    storage.set('nfc-chat-auth-state', JSON.stringify({ token: 'token-a', currentUser: user, contacts: [], messagesByContact: {} }));
    const client = await import('../src/api/client');
    vi.spyOn(client.api, 'me').mockResolvedValue({ user });
    vi.spyOn(client.api, 'contacts').mockResolvedValue({ contacts: [contact] });
    vi.spyOn(client.api, 'incomingFriendRequests').mockResolvedValue({ requests: [friendRequest] });
    const messagesSpy = vi.spyOn(client.api, 'messages').mockResolvedValue({ messages: [message] });
    const { hydrateAppStore, useAppStore } = await import('../src/state/appStore');

    await hydrateAppStore();
    await vi.waitFor(() => {
      expect(messagesSpy).toHaveBeenCalledWith('bob');
      expect(useAppStore.getState().contacts).toEqual([contact]);
    });

    expect(useAppStore.getState().contacts).toEqual([contact]);
    expect(useAppStore.getState().incomingFriendRequests).toEqual([friendRequest]);
    expect(useAppStore.getState().messagesByContact.bob).toEqual([message]);
  });

  it('login requests the new session contacts and messages', async () => {
    const client = await import('../src/api/client');
    vi.spyOn(client.api, 'login').mockResolvedValue({ token: 'token-a', user });
    vi.spyOn(client.api, 'contacts').mockResolvedValue({ contacts: [contact] });
    vi.spyOn(client.api, 'incomingFriendRequests').mockResolvedValue({ requests: [] });
    const messagesSpy = vi.spyOn(client.api, 'messages').mockResolvedValue({ messages: [message] });
    const { login, useAppStore } = await import('../src/state/appStore');

    await login('alice', 'password');
    await vi.waitFor(() => {
      expect(messagesSpy).toHaveBeenCalledWith('bob');
      expect(useAppStore.getState().contacts).toEqual([contact]);
    });

    expect(useAppStore.getState().contacts).toEqual([contact]);
    expect(useAppStore.getState().messagesByContact.bob).toEqual([message]);
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
