import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { JsonStore } from '../src/store.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nfc-chat-api-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('auth API and chat API', () => {
  it('supports username register, authed contacts, and message history flow', async () => {
    const app = await buildServer(new JsonStore(join(dir, 'store.json')));
    try {
      await app.ready();

      const auth = await registerUsername(app, 'sora', '空');
      const bobLogin = await login(app, 'bob');
      const contact = await app.inject({
        method: 'POST',
        url: '/contacts',
        headers: bearer(auth.token),
        payload: { ownerId: 'bob', friendId: 'bob' }
      });
      const bobContacts = await app.inject({
        method: 'GET',
        url: '/contacts',
        headers: bearer(bobLogin.token)
      });
      const history = await app.inject({ method: 'GET', url: `/messages/${bobLogin.user.id}`, headers: bearer(auth.token) });
      const write = await app.inject({
        method: 'POST',
        url: '/messages',
        headers: bearer(auth.token),
        payload: { senderId: 'bob', recipientId: bobLogin.user.id, text: '你好，小波' }
      });
      const updatedHistory = await app.inject({ method: 'GET', url: `/messages/${bobLogin.user.id}`, headers: bearer(auth.token) });

      expect(contact.statusCode).toBe(200);
      expect(contact.json().contacts).toEqual(expect.arrayContaining([expect.objectContaining({ id: bobLogin.user.id })]));
      expect(bobContacts.json().contacts).toEqual(expect.arrayContaining([expect.objectContaining({ id: auth.user.id })]));
      expect(history.statusCode).toBe(200);
      expect(history.json().messages).toEqual([]);
      expect(write.statusCode).toBe(200);
      expect(write.json().message).toMatchObject({ senderId: auth.user.id, recipientId: bobLogin.user.id, text: '你好，小波' });
      expect(updatedHistory.json().messages).toEqual(expect.arrayContaining([expect.objectContaining({ text: '你好，小波' })]));
    } finally {
      await app.close();
    }
  });

  it('supports phone registration with mock SMS and password changes', async () => {
    const app = await buildServer(new JsonStore(join(dir, 'store.json')));
    try {
      await app.ready();

      const sms = await app.inject({
        method: 'POST',
        url: '/auth/mock-sms/request',
        payload: { phone: '13800138000', purpose: 'register' }
      });
      const registered = await app.inject({
        method: 'POST',
        url: '/auth/register/phone',
        payload: { phone: '13800138000', code: sms.json().code, password: 'password123', displayName: '月见' }
      });
      const token = registered.json().token as string;
      const change = await app.inject({
        method: 'POST',
        url: '/auth/change-password',
        headers: bearer(token),
        payload: { oldPassword: 'password123', newPassword: 'newpass123' }
      });
      const oldLogin = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { identifier: '13800138000', password: 'password123' }
      });
      const newLogin = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { identifier: '13800138000', password: 'newpass123' }
      });

      expect(sms.statusCode).toBe(200);
      expect(registered.statusCode).toBe(200);
      expect(change.statusCode).toBe(200);
      expect(oldLogin.statusCode).toBe(401);
      expect(newLogin.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('rejects unauthenticated and unrelated message access', async () => {
    const app = await buildServer(new JsonStore(join(dir, 'store.json')));
    try {
      await app.ready();
      const auth = await registerUsername(app, 'sora', '空');

      const unauthenticated = await app.inject({ method: 'GET', url: '/contacts' });
      const unrelated = await app.inject({
        method: 'GET',
        url: '/messages/bob/mika',
        headers: bearer(auth.token)
      });

      expect(unauthenticated.statusCode).toBe(401);
      expect(unrelated.statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});

async function registerUsername(app: Awaited<ReturnType<typeof buildServer>>, username: string, displayName: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register/username',
    payload: { username, password: 'password123', displayName }
  });
  expect(response.statusCode).toBe(200);
  return response.json() as { token: string; user: { id: string } };
}

async function login(app: Awaited<ReturnType<typeof buildServer>>, identifier: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier, password: 'password123' }
  });
  expect(response.statusCode).toBe(200);
  return response.json() as { token: string; user: { id: string } };
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}
