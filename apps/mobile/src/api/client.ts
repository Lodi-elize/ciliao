import { API_URL } from './config';
import { AuthResult, ChatMessage, FriendRequest, MockSmsResult, NfcReadEventPayload, UserProfile } from './types';

type ApiErrorBody = {
  error?: string;
  code?: string;
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = 'API_ERROR') {
    super(message);
  }
}

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: response.statusText }))) as ApiErrorBody;
    throw new ApiError(body.error ?? '请求失败', response.status, body.code);
  }

  return response.json() as Promise<T>;
}

async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({ error: response.statusText }))) as ApiErrorBody;
    throw new ApiError(body.error ?? '请求失败', response.status, body.code);
  }

  return response.json() as Promise<T>;
}

export const api = {
  registerUsername: (payload: { username: string; password: string; displayName: string }) =>
    request<AuthResult>('/auth/register/username', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  requestMockSms: (payload: { phone: string }) =>
    request<MockSmsResult>('/auth/mock-sms/request', {
      method: 'POST',
      body: JSON.stringify({ ...payload, purpose: 'register' })
    }),
  registerPhone: (payload: { phone: string; code: string; password: string; displayName: string }) =>
    request<AuthResult>('/auth/register/phone', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  login: (identifier: string, password: string) =>
    request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    }),
  me: () => request<{ user: UserProfile }>('/auth/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    }),
  updateProfile: (payload: { displayName?: string; signature?: string }) =>
    request<{ user: UserProfile }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  uploadAvatar: (file: { uri: string; name: string; type: string }) => {
    const formData = new FormData();
    formData.append('file', file as unknown as Blob);
    return requestMultipart<{ user: UserProfile }>('/auth/avatar', formData);
  },
  recordNfcReadEvent: (payload: NfcReadEventPayload) =>
    request<{ ok: boolean }>('/nfc/read-events', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  users: () => request<{ users: UserProfile[] }>('/users'),
  contacts: () => request<{ contacts: UserProfile[] }>('/contacts'),
  resolveInvite: (userId: string) => request<{ user: UserProfile }>(`/invites/${userId}`),
  searchFriend: (query: string) =>
    request<{ user: UserProfile }>('/friend-search', {
      method: 'POST',
      body: JSON.stringify({ query })
    }),
  incomingFriendRequests: () => request<{ requests: FriendRequest[] }>('/friend-requests/incoming'),
  createFriendRequest: (userId: string) =>
    request<{ request: FriendRequest }>('/friend-requests', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }),
  acceptFriendRequest: (requestId: number) =>
    request<{ contacts: UserProfile[] }>(`/friend-requests/${requestId}/accept`, {
      method: 'POST'
    }),
  rejectFriendRequest: (requestId: number) =>
    request<{ request: FriendRequest }>(`/friend-requests/${requestId}/reject`, {
      method: 'POST'
    }),
  addContact: (friendId: string) =>
    request<{ contacts: UserProfile[] }>('/contacts', {
      method: 'POST',
      body: JSON.stringify({ friendId })
    }),
  messages: (contactId: string) => request<{ messages: ChatMessage[] }>(`/messages/${contactId}`),
  sendMessage: (recipientId: string, text: string) =>
    request<{ message: ChatMessage }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ recipientId, text })
    })
};
