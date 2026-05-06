import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';

export async function readNfcInvitePayload(): Promise<string> {
  await NfcManager.start();
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    const records = tag?.ndefMessage ?? [];
    for (const record of records) {
      const decoded = decodeRecord(record);
      if (decoded) return decoded;
    }
    throw new Error('这张卡片上没有找到支持的 NDEF 邀请内容。');
  } finally {
    await NfcManager.cancelTechnologyRequest().catch(() => undefined);
  }
}

function decodeRecord(record: { tnf: number; type: string | number[]; payload: string | number[] }) {
  const type = Array.isArray(record.type) ? String.fromCharCode(...record.type) : record.type;
  const payload = Array.isArray(record.payload)
    ? new Uint8Array(record.payload)
    : new TextEncoder().encode(record.payload);
  if (type === 'U') {
    return Ndef.uri.decodePayload(payload);
  }
  if (type === 'T') {
    return Ndef.text.decodePayload(payload);
  }
  return null;
}