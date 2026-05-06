import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AddressInfo } from 'node:net';
import { io as createClient, Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../src/server.js';
import { JsonStore } from '../src/store.js';

let dir: string;
let sockets: Socket[] = [];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nfc-chat-socket-'));
});

afterEach(async () => {
  disconnectAll();
  await rm(dir, { recursive: true, force: true });
});

describe('socket chat', () => {
  it('routes messages to sender and recipient using token session identity', async () => {
    const app = await buildServer(new JsonStore(join(dir, 'store.json')));
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const port = (app.server.address() as AddressInfo).port;
      const aliceAuth = await login(app, 'alice');
      const bobAuth = await login(app, 'bob');
      await addContact(app, aliceAuth.token, bobAuth.user.id);
      const alice = await connect(port, aliceAuth.token);
      const bob = await connect(port, bobAuth.token);

      const bobDelivery = onceMessage(bob);
      const aliceDelivery = onceMessage(alice);
      const ack = await emitMessage(alice, {
        recipientId: bobAuth.user.id,
        text: 'socket hello'
      });

      expect(ack.ok).toBe(true);
      await expect(bobDelivery).resolves.toMatchObject({ senderId: aliceAuth.user.id, text: 'socket hello' });
      await expect(aliceDelivery).resolves.toMatchObject({ senderId: aliceAuth.user.id, text: 'socket hello' });

      const history = await app.inject({
        method: 'GET',
        url: `/messages/${bobAuth.user.id}`,
        headers: bearer(aliceAuth.token)
      });
      expect(history.json().messages).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'socket hello' })]));
    } finally {
      disconnectAll();
      await app.close();
    }
  });

  it('pushes contact updates to both users when a friend is added', async () => {
    const app = await buildServer(new JsonStore(join(dir, 'store.json')));
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const port = (app.server.address() as AddressInfo).port;
      const aliceAuth = await login(app, 'alice');
      const bobAuth = await login(app, 'bob');
      const alice = await connect(port, aliceAuth.token);
      const bob = await connect(port, bobAuth.token);
      const aliceUpdate = onceContacts(alice);
      const bobUpdate = onceContacts(bob);

      const response = await addContact(app, aliceAuth.token, bobAuth.user.id);

      expect(response.statusCode).toBe(200);
      await expect(aliceUpdate).resolves.toMatchObject({ contacts: [expect.objectContaining({ id: bobAuth.user.id })] });
      await expect(bobUpdate).resolves.toMatchObject({ contacts: [expect.objectContaining({ id: aliceAuth.user.id })] });
    } finally {
      disconnectAll();
      await app.close();
    }
  });

  it('rejects missing tokens and forged sender IDs', async () => {
    const app = await buildServer(new JsonStore(join(dir, 'store.json')));
    await app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const port = (app.server.address() as AddressInfo).port;
      await expect(connect(port, '')).rejects.toBeTruthy();

      const aliceAuth = await login(app, 'alice');
      const bobAuth = await login(app, 'bob');
      await addContact(app, aliceAuth.token, bobAuth.user.id);
      const alice = await connect(port, aliceAuth.token);
      const ack = await emitMessage(alice, {
        senderId: bobAuth.user.id,
        recipientId: bobAuth.user.id,
        text: 'forged'
      });

      expect(ack).toMatchObject({ ok: false, code: 'SENDER_FORGED' });
    } finally {
      disconnectAll();
      await app.close();
    }
  });
});

async function login(app: Awaited<ReturnType<typeof buildServer>>, identifier: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier, password: 'password123' }
  });
  expect(response.statusCode).toBe(200);
  return response.json() as { token: string; user: { id: string } };
}

function addContact(app: Awaited<ReturnType<typeof buildServer>>, token: string, friendId: string) {
  return app.inject({
    method: 'POST',
    url: '/contacts',
    headers: bearer(token),
    payload: { ownerId: 'ignored', friendId }
  });
}

function connect(port: number, token: string) {
  const socket = createClient(`http://127.0.0.1:${port}`, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true
  });
  sockets.push(socket);
  return new Promise<Socket>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for socket ready'));
    }, 2000);
    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.once('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        clearTimeout(timeout);
        reject(new Error('Socket rejected'));
      }
    });
    socket.once('ready', () => {
      clearTimeout(timeout);
      resolve(socket);
    });
  });
}

function emitMessage(socket: Socket, payload: { senderId?: string; recipientId: string; text: string }) {
  return new Promise<{ ok: boolean; error?: string; code?: string }>((resolve) => {
    socket.emit('message:send', payload, resolve);
  });
}

function onceMessage(socket: Socket) {
  return new Promise((resolve) => {
    socket.once('message:new', resolve);
  });
}

function onceContacts(socket: Socket) {
  return new Promise((resolve) => {
    socket.once('contacts:updated', resolve);
  });
}

function disconnectAll() {
  for (const socket of sockets) socket.disconnect();
  sockets = [];
}

function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}
