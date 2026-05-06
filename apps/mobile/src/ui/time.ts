const BEIJING_TIME_ZONE = 'Asia/Shanghai';

const beijingTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: BEIJING_TIME_ZONE,
});

export function formatBeijingTime(value: string | number | Date) {
  return beijingTimeFormatter.format(new Date(value));
}
