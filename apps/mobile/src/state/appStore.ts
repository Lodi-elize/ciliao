import { create } from 'zustand';
import { ApiError, api, setApiToken } from '../api/client';
import { ChatMessage, FriendRequest, UserProfile } from '../api/types';
import { mobileStorage } from './mobileStorage';

type AuthStatus = 'hydrating' | 'anonymous' | 'authenticated';

type AppState = {
  authStatus: AuthStatus;
  token: string | null;
  currentUser: UserProfile | null;
  contacts: UserProfile[];
  incomingFriendRequests: FriendRequest[];
  messagesByContact: Record<string, ChatMessage[]>;
  setAuthSession: (token: string, user: UserProfile) => void;
  setCurrentUser: (user: UserProfile) => void;
  clearAuthSession: () => void;
  setContacts: (contacts: UserProfile[]) => void;
  addContact: (contact: UserProfile) => void;
  setIncomingFriendRequests: (requests: FriendRequest[]) => void;
  removeIncomingFriendRequest: (requestId: number) => void;
  setMessages: (contactId: string, messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage, currentUserId: string) => void;
};

export const useAppStore = create<AppState>()((set) => ({
  authStatus: 'hydrating',
  token: null,
  currentUser: null,
  contacts: [],
  incomingFriendRequests: [],
  messagesByContact: {},
  setAuthSession: (token, user) => setAuthSession(set, token, user),
  setCurrentUser: (user) => setAndPersist(set, { currentUser: user }),
  clearAuthSession: () => clearAuthSession(set),
  setContacts: (contacts) => setAndPersist(set, { contacts }),
  setIncomingFriendRequests: (incomingFriendRequests) => setAndPersist(set, { incomingFriendRequests }),
  removeIncomingFriendRequest: (requestId) =>
    set((state) => {
      const next = { incomingFriendRequests: state.incomingFriendRequests.filter((item) => item.id !== requestId) };
      persistState({ ...state, ...next });
      return next;
    }),
  addContact: (contact) =>
    set((state) => {
      if (state.contacts.some((item) => item.id === contact.id)) return state;
      const next = { contacts: [...state.contacts, contact] };
      persistState({ ...state, ...next });
      return next;
    }),
  setMessages: (contactId, messages) =>
    set((state) => {
      const next = { messagesByContact: { ...state.messagesByContact, [contactId]: messages } };
      persistState({ ...state, ...next });
      return next;
    }),
  addMessage: (message, currentUserId) =>
    set((state) => {
      const contactId = message.senderId === currentUserId ? message.recipientId : message.senderId;
      const existing = state.messagesByContact[contactId] ?? [];
      if (existing.some((item) => item.id === message.id)) {
        return state;
      }
      const next = {
        messagesByContact: {
          ...state.messagesByContact,
          [contactId]: [...existing, message].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        }
      };
      persistState({ ...state, ...next });
      return next;
    })
}));

export async function hydrateAppStore() {
  const raw = await mobileStorage.getItem(storageKey);
  if (!raw) {
    clearAuthSession(useAppStore.setState);
    return;
  }

  const parsed = JSON.parse(raw) as PersistedAppState;
  if (!parsed.token) {
    clearAuthSession(useAppStore.setState);
    return;
  }

  setApiToken(parsed.token);
  useAppStore.setState({
    authStatus: 'hydrating',
    token: parsed.token,
    currentUser: parsed.currentUser ?? null,
    contacts: parsed.contacts ?? [],
    incomingFriendRequests: parsed.incomingFriendRequests ?? [],
    messagesByContact: parsed.messagesByContact ?? {}
  });

  try {
    const result = await api.me();
    setAndPersist(useAppStore.setState, {
      currentUser: result.user,
      contacts: parsed.contacts ?? [],
      incomingFriendRequests: parsed.incomingFriendRequests ?? [],
      messagesByContact: parsed.messagesByContact ?? {}
    });
    useAppStore.setState({ authStatus: 'authenticated', token: parsed.token });
    void refreshSessionData();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthSession(useAppStore.setState);
      return;
    }
    useAppStore.setState({ authStatus: parsed.currentUser ? 'authenticated' : 'anonymous' });
  }
}

export async function login(identifier: string, password: string) {
  const result = await api.login(identifier, password);
  useAppStore.getState().setAuthSession(result.token, result.user);
  void refreshSessionData();
}

export async function registerUsername(payload: { username: string; password: string; displayName: string }) {
  const result = await api.registerUsername(payload);
  useAppStore.getState().setAuthSession(result.token, result.user);
  void refreshSessionData();
}

export async function registerPhone(payload: { phone: string; code: string; password: string; displayName: string }) {
  const result = await api.registerPhone(payload);
  useAppStore.getState().setAuthSession(result.token, result.user);
  void refreshSessionData();
}

export async function refreshSessionData() {
  const state = useAppStore.getState();
  if (state.authStatus !== 'authenticated' || !state.token) return;

  let result: { contacts: UserProfile[] };
  let requestsResult: { requests: FriendRequest[] };
  try {
    result = await api.contacts();
    requestsResult = await api.incomingFriendRequests();
  } catch {
    return;
  }

  const messageEntries = await Promise.all(
    result.contacts.map(async (contact) => {
      try {
        const messages = await api.messages(contact.id);
        return [contact.id, messages.messages] as const;
      } catch {
        return [contact.id, useAppStore.getState().messagesByContact[contact.id] ?? []] as const;
      }
    })
  );

  const messagesByContact: Record<string, ChatMessage[]> = Object.fromEntries(messageEntries);
  setAndPersist(useAppStore.setState, {
    contacts: result.contacts,
    incomingFriendRequests: requestsResult.requests.filter((request) => request.status === 'PENDING'),
    messagesByContact: { ...useAppStore.getState().messagesByContact, ...messagesByContact }
  });
}

export async function updateProfile(payload: { displayName?: string; signature?: string }) {
  const result = await api.updateProfile(payload);
  useAppStore.getState().setCurrentUser(result.user);
}

export async function uploadAvatar(file: { uri: string; name: string; type: string }) {
  const result = await api.uploadAvatar(file);
  useAppStore.getState().setCurrentUser(result.user);
}

export async function logout() {
  try {
    await api.logout();
  } finally {
    useAppStore.getState().clearAuthSession();
  }
}

const storageKey = 'nfc-chat-auth-state';

type PersistedAppState = Pick<AppState, 'token' | 'currentUser' | 'contacts' | 'incomingFriendRequests' | 'messagesByContact'>;

function setAuthSession(set: (partial: Partial<AppState>) => void, token: string, user: UserProfile) {
  setApiToken(token);
  const next = {
    authStatus: 'authenticated' as const,
    token,
    currentUser: user,
    contacts: [],
    incomingFriendRequests: [],
    messagesByContact: {}
  };
  set(next);
  persistState(next);
}

function clearAuthSession(set: (partial: Partial<AppState>) => void) {
  setApiToken(null);
  set({ authStatus: 'anonymous', token: null, currentUser: null, contacts: [], incomingFriendRequests: [], messagesByContact: {} });
  void mobileStorage.removeItem(storageKey);
}

function setAndPersist(set: (partial: Partial<AppState>) => void, partial: Partial<PersistedAppState>) {
  set(partial);
  persistState({ ...useAppStore.getState(), ...partial });
}

function persistState(state: PersistedAppState) {
  if (!state.token) return;
  void mobileStorage.setItem(
    storageKey,
    JSON.stringify({
      token: state.token,
      currentUser: state.currentUser,
      contacts: state.contacts,
      incomingFriendRequests: state.incomingFriendRequests,
      messagesByContact: state.messagesByContact
    })
  );
}
