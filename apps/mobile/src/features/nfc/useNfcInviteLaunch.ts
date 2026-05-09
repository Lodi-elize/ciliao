import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { api } from '../../api/client';
import { UserProfile } from '../../api/types';
import { refreshSessionData, useAppStore } from '../../state/appStore';
import { parseInvitePayload } from './invite';

type PendingInvite = {
  userId: string;
};

type NfcInviteDialogState =
  | {
      kind: 'confirm';
      user: UserProfile;
    }
  | {
      kind: 'sending';
      user: UserProfile;
    }
  | {
      kind: 'success';
      user: UserProfile;
      message: string;
    }
  | {
      kind: 'failure';
      title: string;
      message: string;
      user?: UserProfile;
    };

export function useNfcInviteLaunch() {
  const authStatus = useAppStore((state) => state.authStatus);
  const currentUser = useAppStore((state) => state.currentUser);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [dialogState, setDialogState] = useState<NfcInviteDialogState | null>(null);
  const lastUrlRef = useRef<{ url: string; handledAt: number } | null>(null);

  useEffect(() => {
    let active = true;

    Linking.getInitialURL()
      .then((url) => {
        if (active) {
          handleIncomingUrl(url);
        }
      })
      .catch(() => undefined);

    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!pendingInvite || authStatus === 'hydrating') return;

    if (authStatus !== 'authenticated' || !currentUser) {
      setPendingInvite(null);
      return;
    }

    const invite = pendingInvite;
    setPendingInvite(null);
    void resolveInvite(invite.userId);
  }, [authStatus, currentUser, pendingInvite]);

  function handleIncomingUrl(url: string | null) {
    if (!url || Platform.OS === 'web') return;
    const now = Date.now();
    if (lastUrlRef.current?.url === url && now - lastUrlRef.current.handledAt < 1500) return;

    let invite: ReturnType<typeof parseInvitePayload>;
    try {
      invite = parseInvitePayload(url);
    } catch {
      return;
    }

    lastUrlRef.current = { url, handledAt: now };
    setPendingInvite({ userId: invite.userId });
  }

  async function resolveInvite(userId: string) {
    try {
      const resolved = await api.resolveInvite(userId);
      setDialogState({ kind: 'confirm', user: resolved.user });
    } catch (error) {
      setDialogState({
        kind: 'failure',
        title: 'NFC 邀请无效',
        message: getErrorMessage(error)
      });
    }
  }

  async function sendInviteRequest() {
    if (!dialogState || (dialogState.kind !== 'confirm' && dialogState.kind !== 'failure') || !dialogState.user) return;

    const user = dialogState.user;
    setDialogState({ kind: 'sending', user });

    try {
      await api.createFriendRequest(user.id);
      setDialogState({
        kind: 'success',
        user,
        message: `已向 ${user.displayName} 发送好友申请。`
      });
      void refreshSessionData();
    } catch (error) {
      setDialogState({
        kind: 'failure',
        title: '发送失败',
        message: getErrorMessage(error),
        user
      });
    }
  }

  return {
    dialogState,
    dismissDialog: () => setDialogState(null),
    sendInviteRequest
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '无法处理这次 NFC 好友邀请。';
}
