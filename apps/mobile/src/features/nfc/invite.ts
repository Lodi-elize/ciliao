export type InvitePayload = {
  userId: string;
};

const inviteScheme = 'nfcchat://add-friend';

export function parseInvitePayload(rawPayload: string): InvitePayload {
  const payload = rawPayload.trim();
  if (!payload) {
    throw new Error('邀请内容为空。');
  }

  if (/^[a-zA-Z0-9_-]+$/.test(payload)) {
    return { userId: payload };
  }

  let url: URL;
  try {
    url = new URL(payload);
  } catch {
    throw new Error('邀请内容不是可识别的用户 ID 或链接。');
  }

  if (`${url.protocol}//${url.host}${url.pathname}` !== inviteScheme) {
    throw new Error('邀请链接格式不受支持。');
  }

  const userId = url.searchParams.get('userId');
  if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new Error('邀请链接缺少有效的 userId。');
  }

  return { userId };
}

export function buildInvitePayload(userId: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
    throw new Error('用户 ID 无效。');
  }
  return `${inviteScheme}?userId=${encodeURIComponent(userId)}`;
}
